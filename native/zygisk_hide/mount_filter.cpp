#include "mount_filter.hpp"

#include <climits>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>

#ifndef PATH_MAX
#define PATH_MAX 4096
#endif

#ifndef CERTBRIDGE_HOST_TEST
#include <fcntl.h>
#include <unistd.h>
#else
// 主机单测：不链 Android libc；文件/openat 路径返回空结果
#include <cerrno>
#ifndef AT_FDCWD
#define AT_FDCWD (-100)
#endif
static int open(const char *, int, ...) {
  errno = ENOENT;
  return -1;
}
static int openat(int, const char *, int, ...) {
  errno = ENOENT;
  return -1;
}
static ssize_t read(int, void *, size_t) { return 0; }
static int close(int) { return 0; }
static ssize_t readlink(const char *, char *, size_t) { return -1; }
#ifndef O_RDONLY
#define O_RDONLY 0
#endif
#ifndef O_CLOEXEC
#define O_CLOEXEC 0
#endif
#endif

namespace cb_hide {
namespace {

std::mutex g_list_mu;
std::vector<std::string> g_blacklist;
std::vector<std::string> g_whitelist;
FilterMode g_filter_mode = FilterMode::Blacklist;
bool g_lists_ready = false;

constexpr const char *kCaptureExempt[] = {
    "com.reqable.android", "com.reqable.android.pro", "com.reqable",
    "com.proxy.pin",       "com.network.proxy",       "com.wangyu.proxypin",
};

bool contains_ci(std::string_view hay, std::string_view needle) {
  if (needle.empty() || hay.size() < needle.size())
    return false;
  for (size_t i = 0; i + needle.size() <= hay.size(); ++i) {
    bool ok = true;
    for (size_t j = 0; j < needle.size(); ++j) {
      char a = hay[i + j];
      char b = needle[j];
      if (a >= 'A' && a <= 'Z')
        a = static_cast<char>(a - 'A' + 'a');
      if (b >= 'A' && b <= 'Z')
        b = static_cast<char>(b - 'A' + 'a');
      if (a != b) {
        ok = false;
        break;
      }
    }
    if (ok)
      return true;
  }
  return false;
}

bool contains(std::string_view hay, std::string_view needle) {
  return hay.find(needle) != std::string_view::npos;
}

bool ends_with(std::string_view hay, std::string_view suffix) {
  if (hay.size() < suffix.size())
    return false;
  return hay.compare(hay.size() - suffix.size(), suffix.size(), suffix) == 0;
}

bool starts_with(std::string_view hay, std::string_view prefix) {
  if (hay.size() < prefix.size())
    return false;
  return hay.compare(0, prefix.size(), prefix) == 0;
}

bool pkg_matches(std::string_view process_name, std::string_view pkg) {
  if (pkg.empty() || process_name.size() < pkg.size())
    return false;
  if (process_name.compare(0, pkg.size(), pkg) != 0)
    return false;
  if (process_name.size() == pkg.size())
    return true;
  return process_name[pkg.size()] == ':' || process_name[pkg.size()] == '/';
}

void parse_pkg_lines(std::string_view text, std::vector<std::string> *out) {
  size_t start = 0;
  while (start <= text.size()) {
    size_t end = text.find('\n', start);
    std::string_view line =
        end == std::string_view::npos ? text.substr(start) : text.substr(start, end - start);
    while (!line.empty() && (line.back() == '\r' || line.back() == ' ' || line.back() == '\t')) {
      line.remove_suffix(1);
    }
    while (!line.empty() && (line.front() == ' ' || line.front() == '\t')) {
      line.remove_prefix(1);
    }
    if (!line.empty() && line.front() != '#') {
      out->emplace_back(line);
    }
    if (end == std::string_view::npos)
      break;
    start = end + 1;
  }
}

enum class ConfTri { Absent, Off, On };

ConfTri conf_key_tri(const char *buf, const char *key) {
  if (!buf || !key)
    return ConfTri::Absent;
  const size_t key_len = std::strlen(key);
  const char *p = buf;
  while (*p) {
    if ((p == buf || p[-1] == '\n') && std::strncmp(p, key, key_len) == 0 && p[key_len] == '=') {
      const char *v = p + key_len + 1;
      while (*v == ' ' || *v == '\t')
        ++v;
      if (*v == '1')
        return ConfTri::On;
      return ConfTri::Off;
    }
    const char *nl = std::strchr(p, '\n');
    if (!nl)
      break;
    p = nl + 1;
  }
  return ConfTri::Absent;
}

bool read_file_small(int fd, std::string *out) {
  if (fd < 0 || !out)
    return false;
  out->clear();
  char tmp[1024];
  for (;;) {
    ssize_t n = ::read(fd, tmp, sizeof(tmp));
    if (n < 0)
      return false;
    if (n == 0)
      break;
    out->append(tmp, static_cast<size_t>(n));
    if (out->size() > 64 * 1024)
      break;
  }
  return true;
}

ConfTri conf_tri_from_fd(int fd, const char *key) {
  if (fd < 0 || !key)
    return ConfTri::Absent;
  std::string raw;
  if (!read_file_small(fd, &raw))
    return ConfTri::Absent;
  return conf_key_tri(raw.c_str(), key);
}

ConfTri conf_tri_from_path(const char *path, const char *key) {
  if (!path || !key)
    return ConfTri::Absent;
  int fd = open(path, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return ConfTri::Absent;
  ConfTri t = conf_tri_from_fd(fd, key);
  ::close(fd);
  return t;
}

ConfTri conf_tri_from_moddir(int moddir_fd, const char *rel, const char *key) {
  if (moddir_fd < 0 || !rel || !key)
    return ConfTri::Absent;
  int fd = openat(moddir_fd, rel, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return ConfTri::Absent;
  ConfTri t = conf_tri_from_fd(fd, key);
  ::close(fd);
  return t;
}

ConfTri read_conf_tri_layers(int moddir_fd, const char *key) {
  const ConfTri layers[] = {
      conf_tri_from_path("/data/adb/certbridge/user.conf", key),
      conf_tri_from_moddir(moddir_fd, "data/state/user.conf", key),
      conf_tri_from_moddir(moddir_fd, "config/certs.conf", key),
  };
  for (ConfTri t : layers) {
    if (t == ConfTri::On || t == ConfTri::Off)
      return t;
  }
  return ConfTri::Absent;
}

/** 从 conf 文本取 key=value（去空白/CR）；未找到返回 false */
bool conf_key_value(const char *buf, const char *key, std::string *out) {
  if (!buf || !key || !out)
    return false;
  const size_t key_len = std::strlen(key);
  const char *p = buf;
  while (*p) {
    if ((p == buf || p[-1] == '\n') && std::strncmp(p, key, key_len) == 0 && p[key_len] == '=') {
      const char *v = p + key_len + 1;
      while (*v == ' ' || *v == '\t')
        ++v;
      const char *end = v;
      while (*end && *end != '\n' && *end != '\r')
        ++end;
      while (end > v && (end[-1] == ' ' || end[-1] == '\t'))
        --end;
      out->assign(v, static_cast<size_t>(end - v));
      return true;
    }
    const char *nl = std::strchr(p, '\n');
    if (!nl)
      break;
    p = nl + 1;
  }
  return false;
}

bool conf_value_from_fd(int fd, const char *key, std::string *out) {
  if (fd < 0 || !key || !out)
    return false;
  std::string raw;
  if (!read_file_small(fd, &raw))
    return false;
  return conf_key_value(raw.c_str(), key, out);
}

bool conf_value_from_path(const char *path, const char *key, std::string *out) {
  if (!path || !key || !out)
    return false;
  int fd = open(path, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return false;
  bool ok = conf_value_from_fd(fd, key, out);
  ::close(fd);
  return ok;
}

bool conf_value_from_moddir(int moddir_fd, const char *rel, const char *key, std::string *out) {
  if (moddir_fd < 0 || !rel || !key || !out)
    return false;
  int fd = openat(moddir_fd, rel, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return false;
  bool ok = conf_value_from_fd(fd, key, out);
  ::close(fd);
  return ok;
}

/** 分层读字符串 conf；首个显式写出的键生效 */
bool read_conf_str_layers(int moddir_fd, const char *key, std::string *out) {
  if (!key || !out)
    return false;
  if (conf_value_from_path("/data/adb/certbridge/user.conf", key, out))
    return true;
  if (conf_value_from_moddir(moddir_fd, "data/state/user.conf", key, out))
    return true;
  if (conf_value_from_moddir(moddir_fd, "config/certs.conf", key, out))
    return true;
  return false;
}

FilterMode parse_filter_mode(std::string_view raw) {
  if (raw == "whitelist" || raw == "white" || raw == "wl")
    return FilterMode::Whitelist;
  return FilterMode::Blacklist;
}

bool pkg_in_list(std::string_view process_name, const std::vector<std::string> &list) {
  for (const auto &pkg : list) {
    if (pkg_matches(process_name, pkg))
      return true;
  }
  return false;
}

bool read_mod_text(int moddir_fd, const char *rel, std::string *out) {
  if (moddir_fd < 0 || !rel || !out)
    return false;
  int fd = openat(moddir_fd, rel, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return false;
  bool ok = read_file_small(fd, out);
  ::close(fd);
  return ok;
}

bool is_proc_dir(std::string_view dir) {
  if (dir == "/proc/self" || dir == "/proc/thread-self")
    return true;
  // /proc/<digits>
  if (!starts_with(dir, "/proc/"))
    return false;
  std::string_view rest = dir.substr(6);
  if (rest.empty())
    return false;
  for (char c : rest) {
    if (c < '0' || c > '9')
      return false;
  }
  return true;
}

bool basename_is_mount_table(std::string_view name) {
  return name == "mountinfo" || name == "mounts";
}

bool basename_is_maps_table(std::string_view name) {
  return name == "maps" || name == "smaps" || name == "smaps_rollup";
}

} // namespace

bool read_zn_hide_allow(int moddir_fd) {
  return read_conf_tri_layers(moddir_fd, "zn_hide_allow") == ConfTri::On;
}

bool read_zn_hide_anon_exec(int moddir_fd) {
  return read_conf_tri_layers(moddir_fd, "zn_hide_anon_exec") == ConfTri::On;
}

FilterMode read_zn_filter_mode(int moddir_fd) {
  std::string raw;
  if (!read_conf_str_layers(moddir_fd, "zn_filter_mode", &raw))
    return FilterMode::Blacklist;
  return parse_filter_mode(raw);
}

void load_lists_from_moddir(int moddir_fd) {
  std::lock_guard<std::mutex> lock(g_list_mu);
  g_blacklist.clear();
  g_whitelist.clear();
  g_filter_mode = FilterMode::Blacklist;
  g_lists_ready = false;
  if (moddir_fd >= 0) {
    g_filter_mode = read_zn_filter_mode(moddir_fd);
    std::string raw;
    if (read_mod_text(moddir_fd, "config/zn_blacklist.txt", &raw)) {
      parse_pkg_lines(raw, &g_blacklist);
    }
    raw.clear();
    if (read_mod_text(moddir_fd, "config/zn_whitelist.txt", &raw)) {
      parse_pkg_lines(raw, &g_whitelist);
    }
  }
  g_lists_ready = true;
}

bool is_capture_exempt(std::string_view process_name) {
  for (const char *pkg : kCaptureExempt) {
    if (pkg_matches(process_name, pkg))
      return true;
  }
  return false;
}

bool is_on_blacklist(std::string_view process_name) {
  std::lock_guard<std::mutex> lock(g_list_mu);
  if (!g_lists_ready)
    return false;
  return pkg_in_list(process_name, g_blacklist);
}

bool is_on_whitelist(std::string_view process_name) {
  std::lock_guard<std::mutex> lock(g_list_mu);
  if (!g_lists_ready)
    return false;
  return pkg_in_list(process_name, g_whitelist);
}

bool should_filter_process(std::string_view process_name) {
  if (process_name.empty() || process_name == "system_server")
    return false;
  if (is_capture_exempt(process_name))
    return false;
  FilterMode mode;
  bool on_bl = false;
  bool on_wl = false;
  {
    std::lock_guard<std::mutex> lock(g_list_mu);
    if (!g_lists_ready)
      return false;
    mode = g_filter_mode;
    on_bl = pkg_in_list(process_name, g_blacklist);
    on_wl = pkg_in_list(process_name, g_whitelist);
  }
  if (mode == FilterMode::Whitelist)
    return !on_wl;
  return on_bl;
}

#ifdef CERTBRIDGE_HOST_TEST
void host_test_set_filter_state(FilterMode mode, const std::vector<std::string> &blacklist,
                                const std::vector<std::string> &whitelist) {
  std::lock_guard<std::mutex> lock(g_list_mu);
  g_filter_mode = mode;
  g_blacklist = blacklist;
  g_whitelist = whitelist;
  g_lists_ready = true;
}
#endif

bool line_is_certbridge_trace(std::string_view line) {
  if (contains(line, "modules/CertBridge"))
    return true;
  if (contains(line, "/CertBridge/"))
    return true;
  if (contains(line, "/CertBridge"))
    return true;
  if (contains(line, "/dev/.cb"))
    return true;
  if (contains(line, "/.cb0") || contains(line, "/.cb1"))
    return true;
  if (contains(line, "/.fs0") || contains(line, "/.fs1"))
    return true;
  if (contains(line, "/mnt/.ca") || contains(line, "/.ca0") || contains(line, "/.ca1"))
    return true;
  if (contains(line, "sys-ca-merge"))
    return true;
  if (contains_ci(line, "certbridge"))
    return true;
  // Magic Mount / overlay 选项里的 upperdir
  if (contains(line, "upperdir=") && contains_ci(line, "certbridge"))
    return true;
  return false;
}

bool is_smaps_vma_header(std::string_view line);

bool line_is_anon_executable_map(std::string_view line) {
  if (!is_smaps_vma_header(line))
    return false;

  size_t sp = line.find(' ');
  if (sp == std::string_view::npos)
    return false;
  size_t perm_start = sp + 1;
  while (perm_start < line.size() && line[perm_start] == ' ')
    ++perm_start;
  size_t perm_end = perm_start;
  while (perm_end < line.size() && line[perm_end] != ' ')
    ++perm_end;
  if (perm_end <= perm_start)
    return false;
  bool exec = false;
  for (size_t i = perm_start; i < perm_end; ++i) {
    if (line[i] == 'x') {
      exec = true;
      break;
    }
  }
  if (!exec)
    return false;

  if (contains(line, "[anon:"))
    return false;
  if (contains(line, "[heap]") || contains(line, "[stack]"))
    return false;
  if (contains(line, "[vdso]") || contains(line, "[vvar]") || contains(line, "[vectors]"))
    return false;

  if (contains(line, "[anonymous]"))
    return true;

  if (line.find('[') != std::string_view::npos)
    return false;
  if (line.find(" /") != std::string_view::npos)
    return false;
  if (contains(line, "00:00 0") || contains(line, "00:00\t0"))
    return true;
  return false;
}

static bool g_hide_anon_exec = false;

void set_hide_anon_exec(bool on) { g_hide_anon_exec = on; }

bool hide_anon_exec_enabled() { return g_hide_anon_exec; }

bool line_should_hide_maps(std::string_view line) {
  if (line_is_certbridge_trace(line))
    return true;
  if (g_hide_anon_exec && line_is_anon_executable_map(line))
    return true;
  return false;
}

bool path_is_mount_table(std::string_view path) {
  if (path.empty())
    return false;
  if (ends_with(path, "/mountinfo") || path == "/proc/self/mountinfo" || path == "/proc/mountinfo" ||
      path == "mountinfo")
    return true;
  if (ends_with(path, "/mounts") || path == "/proc/mounts" || path == "/proc/self/mounts" ||
      path == "mounts")
    return true;
  return false;
}

bool path_is_maps_table(std::string_view path) {
  if (path.empty())
    return false;
  if (path == "maps" || path == "smaps" || path == "smaps_rollup")
    return true;
  if (ends_with(path, "/maps") && (contains(path, "/proc/") || starts_with(path, "/proc/")))
    return true;
  if (ends_with(path, "/smaps") && contains(path, "/proc/"))
    return true;
  if (ends_with(path, "/smaps_rollup") && contains(path, "/proc/"))
    return true;
  return false;
}

bool path_needs_trace_filter(std::string_view path) {
  return path_is_mount_table(path) || path_is_maps_table(path);
}

bool path_is_smaps_table(std::string_view path) {
  if (path.empty())
    return false;
  if (path == "smaps")
    return true;
  if (ends_with(path, "/smaps_rollup") && contains(path, "/proc/"))
    return false;
  if (ends_with(path, "/smaps") && contains(path, "/proc/"))
    return true;
  return false;
}

bool path_needs_trace_filter_resolved(std::string_view pathname, std::string_view dir_abs) {
  if (pathname.empty())
    return false;
  if (pathname.front() == '/')
    return path_needs_trace_filter(pathname);
  // 相对名：仅当 dir 为 /proc/self 或 /proc/<pid>
  if (!dir_abs.empty() && is_proc_dir(dir_abs)) {
    if (basename_is_mount_table(pathname) || basename_is_maps_table(pathname))
      return true;
  }
  // 已拼好的绝对路径
  if (!dir_abs.empty()) {
    std::string full;
    full.reserve(dir_abs.size() + 1 + pathname.size());
    full.append(dir_abs.data(), dir_abs.size());
    if (!dir_abs.empty() && dir_abs.back() != '/')
      full.push_back('/');
    full.append(pathname.data(), pathname.size());
    return path_needs_trace_filter(full);
  }
  return false;
}

std::string resolve_openat_path(int dirfd, const char *pathname) {
  if (!pathname || !*pathname)
    return {};
  if (pathname[0] == '/')
    return pathname;

  char linkbuf[64];
  char dirbuf[PATH_MAX];
  ssize_t n = -1;
  if (dirfd == AT_FDCWD) {
    n = ::readlink("/proc/self/cwd", dirbuf, sizeof(dirbuf) - 1);
  } else if (dirfd >= 0) {
    std::snprintf(linkbuf, sizeof(linkbuf), "/proc/self/fd/%d", dirfd);
    n = ::readlink(linkbuf, dirbuf, sizeof(dirbuf) - 1);
  }
  if (n <= 0)
    return {};
  dirbuf[n] = '\0';
  std::string out(dirbuf, static_cast<size_t>(n));
  if (out.back() != '/')
    out.push_back('/');
  out.append(pathname);
  return out;
}

bool is_smaps_vma_header(std::string_view line) {
  size_t i = 0;
  auto is_hex = [](char c) {
    return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');
  };
  while (i < line.size() && is_hex(line[i]))
    ++i;
  if (i == 0 || i >= line.size() || line[i] != '-')
    return false;
  ++i;
  size_t j = i;
  while (j < line.size() && is_hex(line[j]))
    ++j;
  if (j == i)
    return false;
  return j < line.size() && line[j] == ' ';
}

std::string filter_trace_text_ex(std::string_view raw, bool smaps_records) {
  std::string out;
  out.reserve(raw.size());
  size_t start = 0;
  bool drop_fields = false;
  while (start <= raw.size()) {
    size_t end = raw.find('\n', start);
    std::string_view line =
        end == std::string_view::npos ? raw.substr(start) : raw.substr(start, end - start);
    bool keep = true;
    if (smaps_records) {
      if (is_smaps_vma_header(line)) {
        drop_fields = line_should_hide_maps(line);
        keep = !drop_fields;
      } else if (drop_fields) {
        keep = false;
      } else {
        keep = !line_should_hide_maps(line);
      }
    } else {
      keep = !line_is_certbridge_trace(line);
    }
    if (keep) {
      out.append(line.data(), line.size());
      if (end != std::string_view::npos)
        out.push_back('\n');
    }
    if (end == std::string_view::npos)
      break;
    start = end + 1;
  }
  return out;
}

std::string filter_trace_text(std::string_view raw) {
  return filter_trace_text_ex(raw, false);
}

} // namespace cb_hide
