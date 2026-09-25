#include "mount_filter.hpp"

#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <mutex>
#include <unistd.h>
#include <vector>

namespace cb_hide {
namespace {

std::mutex g_wl_mu;
std::vector<std::string> g_whitelist;
bool g_whitelist_ready = false;

constexpr const char *kBuiltinWhitelist[] = {
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

bool pkg_matches(std::string_view process_name, std::string_view pkg) {
  if (pkg.empty() || process_name.size() < pkg.size())
    return false;
  if (process_name.compare(0, pkg.size(), pkg) != 0)
    return false;
  if (process_name.size() == pkg.size())
    return true;
  return process_name[pkg.size()] == ':' || process_name[pkg.size()] == '/';
}

void ensure_builtin_whitelist_locked() {
  if (g_whitelist_ready)
    return;
  g_whitelist.clear();
  for (const char *p : kBuiltinWhitelist)
    g_whitelist.emplace_back(p);
  g_whitelist_ready = true;
}

void parse_whitelist_text(std::string_view text, std::vector<std::string> *out) {
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

ConfTri conf_tri_from_fd(int fd) {
  if (fd < 0)
    return ConfTri::Absent;
  std::string raw;
  if (!read_file_small(fd, &raw))
    return ConfTri::Absent;
  return conf_key_tri(raw.c_str(), "zn_hide_allow");
}

ConfTri conf_tri_from_path(const char *path) {
  if (!path)
    return ConfTri::Absent;
  int fd = open(path, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return ConfTri::Absent;
  ConfTri t = conf_tri_from_fd(fd);
  ::close(fd);
  return t;
}

ConfTri conf_tri_from_moddir(int moddir_fd, const char *rel) {
  if (moddir_fd < 0 || !rel)
    return ConfTri::Absent;
  int fd = openat(moddir_fd, rel, O_RDONLY | O_CLOEXEC);
  if (fd < 0)
    return ConfTri::Absent;
  ConfTri t = conf_tri_from_fd(fd);
  ::close(fd);
  return t;
}

} // namespace

bool read_zn_hide_allow(int moddir_fd) {
  // 与 module/bin/lib/conf.sh::read_conf 同序：外置 user.conf → legacy → 模块模板
  const ConfTri layers[] = {
      conf_tri_from_path("/data/adb/certbridge/user.conf"),
      conf_tri_from_moddir(moddir_fd, "data/state/user.conf"),
      conf_tri_from_moddir(moddir_fd, "config/certs.conf"),
  };
  for (ConfTri t : layers) {
    if (t == ConfTri::On)
      return true;
    if (t == ConfTri::Off)
      return false;
  }
  return false;
}

void load_whitelist_from_moddir(int moddir_fd) {
  std::lock_guard<std::mutex> lock(g_wl_mu);
  g_whitelist.clear();
  g_whitelist_ready = false;
  if (moddir_fd >= 0) {
    int fd = openat(moddir_fd, "config/zn_whitelist.txt", O_RDONLY | O_CLOEXEC);
    if (fd >= 0) {
      std::string raw;
      char tmp[1024];
      for (;;) {
        ssize_t n = ::read(fd, tmp, sizeof(tmp));
        if (n < 0)
          break;
        if (n == 0)
          break;
        raw.append(tmp, static_cast<size_t>(n));
        if (raw.size() > 64 * 1024)
          break;
      }
      ::close(fd);
      parse_whitelist_text(raw, &g_whitelist);
    }
  }
  if (g_whitelist.empty()) {
    for (const char *p : kBuiltinWhitelist)
      g_whitelist.emplace_back(p);
  }
  g_whitelist_ready = true;
}

bool is_capture_whitelist(std::string_view process_name) {
  std::lock_guard<std::mutex> lock(g_wl_mu);
  ensure_builtin_whitelist_locked();
  for (const auto &pkg : g_whitelist) {
    if (pkg_matches(process_name, pkg))
      return true;
  }
  return false;
}

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
  return false;
}

bool path_is_mount_table(std::string_view path) {
  if (path.empty())
    return false;
  if (contains(path, "/mountinfo"))
    return true;
  if (contains(path, "/mounts")) {
    if (ends_with(path, "/mounts"))
      return true;
    if (contains(path, "/proc/") && contains(path, "mounts"))
      return true;
  }
  return false;
}

bool path_is_maps_table(std::string_view path) {
  if (path.empty())
    return false;
  if (ends_with(path, "/maps") && contains(path, "/proc/"))
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
  // smaps_rollup 是汇总，按行过滤即可；多行 VMA 记录只出现在 smaps
  if (ends_with(path, "/smaps_rollup") && contains(path, "/proc/"))
    return false;
  if (ends_with(path, "/smaps") && contains(path, "/proc/"))
    return true;
  return false;
}

bool is_smaps_vma_header(std::string_view line) {
  // VMA 首行：<hex>-<hex> <perms> ...
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
        drop_fields = line_is_certbridge_trace(line);
        keep = !drop_fields;
      } else if (drop_fields) {
        // 丢掉被删 VMA 后面的 Size/Rss/Pss… 字段，避免解析器读到无头记录而崩
        keep = false;
      } else {
        keep = !line_is_certbridge_trace(line);
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
