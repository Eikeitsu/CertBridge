/*
 * CertBridge Zygisk：过滤 App 内 mountinfo/mounts，并削弱对本模块 zygisk so 的
 * maps/smaps/readlink 可见性。挂钩体仍在 so 内，不能 DLCLOSE。
 * zn_hide_allow 门控；抓包白名单不过滤。
 */

#include "mount_filter.hpp"
#include "zygisk.hpp"

#include <cerrno>
#include <cstdarg>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <mutex>
#include <string>
#include <string_view>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <unistd.h>
#include <unordered_map>
#include <unordered_set>

namespace {

using zygisk::Api;
using zygisk::AppSpecializeArgs;
using zygisk::ModuleBase;

std::mutex g_mu;
bool g_enabled = false;
std::unordered_set<int> g_filter_fds;
std::unordered_map<int, std::string> g_fd_pending;

int (*orig_open)(const char *, int, ...) = nullptr;
int (*orig_openat)(int, const char *, int, ...) = nullptr;
int (*orig_close)(int) = nullptr;
ssize_t (*orig_read)(int, void *, size_t) = nullptr;
ssize_t (*orig_pread64)(int, void *, size_t, off64_t) = nullptr;
ssize_t (*orig_readlink)(const char *, char *, size_t) = nullptr;
ssize_t (*orig_readlinkat)(int, const char *, char *, size_t) = nullptr;

bool read_conf_zn_hide_allow(int moddir_fd) {
  if (moddir_fd < 0) return false;
  int fd = openat(moddir_fd, "config/certs.conf", O_RDONLY | O_CLOEXEC);
  if (fd < 0) return false;
  char buf[4096];
  ssize_t n = ::read(fd, buf, sizeof(buf) - 1);
  ::close(fd);
  if (n <= 0) return false;
  buf[n] = '\0';
  const char *p = std::strstr(buf, "zn_hide_allow=");
  if (!p) return false;
  p += sizeof("zn_hide_allow=") - 1;
  return *p == '1';
}

bool find_libc(dev_t *dev, ino_t *inode) {
  // 挂钩安装前直接读 maps，避免依赖已被替换的 open
  FILE *fp = fopen("/proc/self/maps", "re");
  if (!fp) return false;
  char line[512];
  bool ok = false;
  while (fgets(line, sizeof(line), fp)) {
    if (!std::strstr(line, "libc.so")) continue;
    if (!std::strstr(line, "r-xp") && !std::strstr(line, "r--p")) continue;
    unsigned int maj = 0, min = 0;
    ino_t ino = 0;
    if (sscanf(line, "%*s %*s %*s %x:%x %lu", &maj, &min, &ino) < 3) continue;
    *dev = makedev(maj, min);
    *inode = ino;
    ok = true;
    break;
  }
  fclose(fp);
  return ok;
}

void mark_fd_if_sensitive(int fd, const char *path) {
  if (fd < 0 || !path || !g_enabled) return;
  if (!cb_hide::path_needs_trace_filter(path)) return;
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
  if (!buf || count == 0) return 0;

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

  // 按行流式过滤：不全文吞进 raw，只保留跨 chunk 的半行 + 过滤后输出
  std::string filtered;
  std::string carry;
  char tmp[4096];
  constexpr size_t kMaxFiltered = 4 * 1024 * 1024;
  auto append_kept_line = [&](std::string_view line, bool with_nl) {
    if (cb_hide::line_is_certbridge_trace(line)) return;
    if (filtered.size() + line.size() + (with_nl ? 1 : 0) > kMaxFiltered) return;
    filtered.append(line.data(), line.size());
    if (with_nl) filtered.push_back('\n');
  };

  for (;;) {
    ssize_t n = orig_read ? orig_read(fd, tmp, sizeof(tmp)) : ::read(fd, tmp, sizeof(tmp));
    if (n < 0) {
      if (errno == EINTR) continue;
      return n;
    }
    if (n == 0) {
      if (!carry.empty()) append_kept_line(carry, false);
      break;
    }
    size_t start = 0;
    for (size_t i = 0; i < static_cast<size_t>(n); ++i) {
      if (tmp[i] != '\n') continue;
      if (carry.empty()) {
        append_kept_line(std::string_view(tmp + start, i - start), true);
      } else {
        carry.append(tmp + start, i - start);
        append_kept_line(carry, true);
        carry.clear();
      }
      start = i + 1;
    }
    if (start < static_cast<size_t>(n)) {
      carry.append(tmp + start, static_cast<size_t>(n) - start);
      if (carry.size() > 256 * 1024) {
        // 异常超长行：按整段判定一次后丢弃，避免 OOM
        append_kept_line(carry, false);
        carry.clear();
      }
    }
    if (filtered.size() >= kMaxFiltered) break;
  }

  {
    std::lock_guard<std::mutex> lock(g_mu);
    if (filtered.empty()) {
      g_filter_fds.erase(fd);
      return 0;
    }
    size_t n = filtered.size() < count ? filtered.size() : count;
    std::memcpy(buf, filtered.data(), n);
    if (n < filtered.size()) {
      g_fd_pending[fd] = filtered.substr(n);
    } else {
      g_filter_fds.erase(fd);
    }
    return static_cast<ssize_t>(n);
  }
}

/** readlink 目标若指向本模块路径，对外表现为不存在 */
ssize_t scrub_readlink_result(ssize_t n, char *buf, size_t bufsiz) {
  if (n <= 0 || !buf) return n;
  size_t len = static_cast<size_t>(n);
  if (len >= bufsiz) len = bufsiz;  // readlink 可不写 NUL
  std::string_view target(buf, len);
  if (!cb_hide::line_is_certbridge_trace(target)) return n;
  errno = ENOENT;
  return -1;
}

int hooked_open(const char *pathname, int flags, ...) {
  mode_t mode = 0;
  if (flags & O_CREAT) {
    va_list ap;
    va_start(ap, flags);
    mode = static_cast<mode_t>(va_arg(ap, int));
    va_end(ap);
  }
  int fd = orig_open ? (flags & O_CREAT ? orig_open(pathname, flags, mode)
                                        : orig_open(pathname, flags))
                     : (flags & O_CREAT ? ::open(pathname, flags, mode) : ::open(pathname, flags));
  mark_fd_if_sensitive(fd, pathname);
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
  int fd = orig_openat
               ? (flags & O_CREAT ? orig_openat(dirfd, pathname, flags, mode)
                                  : orig_openat(dirfd, pathname, flags))
               : (flags & O_CREAT ? ::openat(dirfd, pathname, flags, mode)
                                 : ::openat(dirfd, pathname, flags));
  mark_fd_if_sensitive(fd, pathname);
  return fd;
}

int hooked_close(int fd) {
  unmark_fd(fd);
  return orig_close ? orig_close(fd) : ::close(fd);
}

ssize_t hooked_read(int fd, void *buf, size_t count) {
  if (g_enabled && is_filter_fd(fd)) return filtered_read(fd, buf, count);
  return orig_read ? orig_read(fd, buf, count) : ::read(fd, buf, count);
}

ssize_t hooked_pread64(int fd, void *buf, size_t count, off64_t offset) {
  if (g_enabled && is_filter_fd(fd) && offset == 0) return filtered_read(fd, buf, count);
  return orig_pread64 ? orig_pread64(fd, buf, count, offset) : ::pread64(fd, buf, count, offset);
}

ssize_t hooked_readlink(const char *pathname, char *buf, size_t bufsiz) {
  ssize_t n = orig_readlink ? orig_readlink(pathname, buf, bufsiz)
                            : ::readlink(pathname, buf, bufsiz);
  if (!g_enabled) return n;
  return scrub_readlink_result(n, buf, bufsiz);
}

ssize_t hooked_readlinkat(int dirfd, const char *pathname, char *buf, size_t bufsiz) {
  ssize_t n = orig_readlinkat ? orig_readlinkat(dirfd, pathname, buf, bufsiz)
                              : ::readlinkat(dirfd, pathname, buf, bufsiz);
  if (!g_enabled) return n;
  return scrub_readlink_result(n, buf, bufsiz);
}

void install_hooks(Api *api) {
  dev_t dev = 0;
  ino_t inode = 0;
  if (!find_libc(&dev, &inode)) return;

  api->pltHookRegister(dev, inode, "open", reinterpret_cast<void *>(hooked_open),
                       reinterpret_cast<void **>(&orig_open));
  api->pltHookRegister(dev, inode, "openat", reinterpret_cast<void *>(hooked_openat),
                       reinterpret_cast<void **>(&orig_openat));
  api->pltHookRegister(dev, inode, "close", reinterpret_cast<void *>(hooked_close),
                       reinterpret_cast<void **>(&orig_close));
  api->pltHookRegister(dev, inode, "read", reinterpret_cast<void *>(hooked_read),
                       reinterpret_cast<void **>(&orig_read));
  api->pltHookRegister(dev, inode, "pread64", reinterpret_cast<void *>(hooked_pread64),
                       reinterpret_cast<void **>(&orig_pread64));
  api->pltHookRegister(dev, inode, "readlink", reinterpret_cast<void *>(hooked_readlink),
                       reinterpret_cast<void **>(&orig_readlink));
  api->pltHookRegister(dev, inode, "readlinkat", reinterpret_cast<void *>(hooked_readlinkat),
                       reinterpret_cast<void **>(&orig_readlinkat));
  api->pltHookCommit();
}

class CertBridgeHideModule : public ModuleBase {
 public:
  void onLoad(Api *api, JNIEnv *env) override {
    this->api = api;
    this->env = env;
  }

  void preAppSpecialize(AppSpecializeArgs *args) override {
    should_hook = false;
    if (!api) return;

    const char *name = nullptr;
    if (args->nice_name) {
      name = env->GetStringUTFChars(args->nice_name, nullptr);
    }
    std::string proc = name ? name : "";
    if (name) env->ReleaseStringUTFChars(args->nice_name, name);

    if (proc.empty() || proc == "system_server") return;

    int modfd = api->getModuleDir();
    if (modfd < 0) return;
    cb_hide::load_whitelist_from_moddir(modfd);
    if (cb_hide::is_capture_whitelist(proc)) return;
    if (!read_conf_zn_hide_allow(modfd)) return;

    should_hook = true;
  }

  void postAppSpecialize(const AppSpecializeArgs *args) override {
    (void)args;
    if (!should_hook || !api) return;
    g_enabled = true;
    install_hooks(api);
    // 挂钩实现位于本 so：不可 DLCLOSE_MODULE_LIBRARY，否则 PLT 悬空。
    // 自藏靠过滤 maps/smaps 与 readlink，而非卸载 so。
  }

 private:
  Api *api = nullptr;
  JNIEnv *env = nullptr;
  bool should_hook = false;
};

}  // namespace

REGISTER_ZYGISK_MODULE(CertBridgeHideModule)
