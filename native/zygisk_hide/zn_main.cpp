/*
 * CertBridge ZN Module 辅路径：对 init 拉起的服务进程做与经典 Zygisk 相同的
 * mountinfo/mounts 行过滤。仅注入服务、不注入普通 App。
 *
 * 默认不编入发布包：须用 zygisk-ctl dump-zn 等校准「确实会读挂载表」的目标后，
 * 再打开 CMake -DBUILD_ZN_MODULE=ON，并写入非空 zn_modules.txt。禁止空声明刷列表。
 */

#include "mount_filter.hpp"
#include "zygisk_next_api.h"

#include <cstdarg>
#include <cstdio>
#include <cstring>
#include <dirent.h>
#include <fcntl.h>
#include <mutex>
#include <string>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <unistd.h>
#include <unordered_map>
#include <unordered_set>

namespace {

std::mutex g_mu;
bool g_enabled = false;
std::unordered_set<int> g_filter_fds;
std::unordered_map<int, std::string> g_fd_pending;

int (*orig_open)(const char *, int, ...) = nullptr;
int (*orig_openat)(int, const char *, int, ...) = nullptr;
int (*orig_close)(int) = nullptr;
ssize_t (*orig_read)(int, void *, size_t) = nullptr;

bool module_prop_is_certbridge(const char *prop_path) {
  int fd = open(prop_path, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return false;
  char buf[512];
  ssize_t n = ::read(fd, buf, sizeof(buf) - 1);
  ::close(fd);
  if (n <= 0)
    return false;
  buf[n] = '\0';
  return std::strstr(buf, "id=CertBridge") != nullptr;
}

/** 打开 CertBridge 模块目录 fd，供 read_zn_hide_allow / 白名单使用 */
int open_certbridge_moddir() {
  static constexpr const char *kDirect[] = {
      "/data/adb/modules/CertBridge",
      "/data/adb/modules_update/CertBridge",
  };
  for (const char *p : kDirect) {
    int fd = open(p, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    if (fd >= 0)
      return fd;
  }
  static constexpr const char *kRoots[] = {"/data/adb/modules", "/data/adb/modules_update"};
  for (const char *root : kRoots) {
    DIR *d = opendir(root);
    if (!d)
      continue;
    while (dirent *ent = readdir(d)) {
      if (ent->d_name[0] == '.')
        continue;
      char prop[256];
      char dir[256];
      std::snprintf(prop, sizeof(prop), "%s/%s/module.prop", root, ent->d_name);
      if (!module_prop_is_certbridge(prop))
        continue;
      std::snprintf(dir, sizeof(dir), "%s/%s", root, ent->d_name);
      closedir(d);
      return open(dir, O_RDONLY | O_DIRECTORY | O_CLOEXEC);
    }
    closedir(d);
  }
  return -1;
}

void mark_fd_if_mount_table(int fd, const char *path) {
  if (fd < 0 || !path || !g_enabled)
    return;
  if (!cb_hide::path_needs_trace_filter(path))
    return;
  std::lock_guard<std::mutex> lock(g_mu);
  g_filter_fds.insert(fd);
  g_fd_pending.erase(fd);
}

void unmark_fd(int fd) {
  std::lock_guard<std::mutex> lock(g_mu);
  g_filter_fds.erase(fd);
  g_fd_pending.erase(fd);
}

bool is_filter_fd(int fd) {
  std::lock_guard<std::mutex> lock(g_mu);
  return g_filter_fds.count(fd) > 0;
}

ssize_t filtered_read(int fd, void *buf, size_t count) {
  if (!buf || count == 0)
    return 0;
  {
    std::lock_guard<std::mutex> lock(g_mu);
    auto it = g_fd_pending.find(fd);
    if (it != g_fd_pending.end()) {
      const std::string &pend = it->second;
      if (pend.empty()) {
        g_filter_fds.erase(fd);
        g_fd_pending.erase(it);
        return 0;
      }
      size_t n = pend.size() < count ? pend.size() : count;
      std::memcpy(buf, pend.data(), n);
      if (n == pend.size()) {
        g_fd_pending.erase(it);
        g_filter_fds.erase(fd);
      } else {
        it->second = pend.substr(n);
      }
      return static_cast<ssize_t>(n);
    }
  }
  std::string raw;
  char tmp[4096];
  for (;;) {
    ssize_t n = orig_read ? orig_read(fd, tmp, sizeof(tmp)) : ::read(fd, tmp, sizeof(tmp));
    if (n < 0)
      return n;
    if (n == 0)
      break;
    raw.append(tmp, static_cast<size_t>(n));
    if (raw.size() > 2 * 1024 * 1024)
      break;
  }
  std::string filtered = cb_hide::filter_trace_text(raw);
  std::lock_guard<std::mutex> lock(g_mu);
  if (filtered.empty()) {
    g_filter_fds.erase(fd);
    return 0;
  }
  size_t n = filtered.size() < count ? filtered.size() : count;
  std::memcpy(buf, filtered.data(), n);
  if (n < filtered.size())
    g_fd_pending[fd] = filtered.substr(n);
  else
    g_filter_fds.erase(fd);
  return static_cast<ssize_t>(n);
}

int hooked_open(const char *pathname, int flags, ...) {
  mode_t mode = 0;
  if (flags & O_CREAT) {
    va_list ap;
    va_start(ap, flags);
    mode = static_cast<mode_t>(va_arg(ap, int));
    va_end(ap);
  }
  int fd = orig_open
               ? (flags & O_CREAT ? orig_open(pathname, flags, mode) : orig_open(pathname, flags))
               : (flags & O_CREAT ? ::open(pathname, flags, mode) : ::open(pathname, flags));
  mark_fd_if_mount_table(fd, pathname);
  return fd;
}

int hooked_openat(int dirfd, const char *pathname, int flags, ...) {
  mode_t mode = 0;
  if (flags & O_CREAT) {
    va_list ap;
    va_start(ap, flags);
    mode = static_cast<mode_t>(va_arg(ap, int));
    va_end(ap);
  }
  int fd = orig_openat ? (flags & O_CREAT ? orig_openat(dirfd, pathname, flags, mode)
                                          : orig_openat(dirfd, pathname, flags))
                       : (flags & O_CREAT ? ::openat(dirfd, pathname, flags, mode)
                                          : ::openat(dirfd, pathname, flags));
  mark_fd_if_mount_table(fd, pathname);
  return fd;
}

int hooked_close(int fd) {
  unmark_fd(fd);
  return orig_close ? orig_close(fd) : ::close(fd);
}

ssize_t hooked_read(int fd, void *buf, size_t count) {
  if (g_enabled && is_filter_fd(fd))
    return filtered_read(fd, buf, count);
  return orig_read ? orig_read(fd, buf, count) : ::read(fd, buf, count);
}

} // namespace

extern "C" [[gnu::visibility("default")]] void zn_module_entry_v1(ZnApiTableV1 *api,
                                                                  const char *process_name) {
  (void)process_name;
  if (!api || !api->pltHook || !api->pltHookCommit)
    return;
  int modfd = open_certbridge_moddir();
  const bool allow = cb_hide::read_zn_hide_allow(modfd);
  if (modfd >= 0)
    ::close(modfd);
  if (!allow)
    return;
  g_enabled = true;
  api->pltHook(".*libc\\.so$", "open", reinterpret_cast<void *>(hooked_open),
               reinterpret_cast<void **>(&orig_open));
  api->pltHook(".*libc\\.so$", "openat", reinterpret_cast<void *>(hooked_openat),
               reinterpret_cast<void **>(&orig_openat));
  api->pltHook(".*libc\\.so$", "close", reinterpret_cast<void *>(hooked_close),
               reinterpret_cast<void **>(&orig_close));
  api->pltHook(".*libc\\.so$", "read", reinterpret_cast<void *>(hooked_read),
               reinterpret_cast<void **>(&orig_read));
  if (!api->pltHookCommit())
    g_enabled = false;
}
