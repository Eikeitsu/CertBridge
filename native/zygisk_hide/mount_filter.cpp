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
    "com.reqable.android",
    "com.reqable.android.pro",
    "com.reqable",
    "com.proxy.pin",
    "com.network.proxy",
    "com.wangyu.proxypin",
};

bool contains_ci(std::string_view hay, std::string_view needle) {
  if (needle.empty() || hay.size() < needle.size()) return false;
  for (size_t i = 0; i + needle.size() <= hay.size(); ++i) {
    bool ok = true;
    for (size_t j = 0; j < needle.size(); ++j) {
      char a = hay[i + j];
      char b = needle[j];
      if (a >= 'A' && a <= 'Z') a = static_cast<char>(a - 'A' + 'a');
      if (b >= 'A' && b <= 'Z') b = static_cast<char>(b - 'A' + 'a');
      if (a != b) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

bool contains(std::string_view hay, std::string_view needle) {
  return hay.find(needle) != std::string_view::npos;
}

bool ends_with(std::string_view hay, std::string_view suffix) {
  if (hay.size() < suffix.size()) return false;
  return hay.compare(hay.size() - suffix.size(), suffix.size(), suffix) == 0;
}

bool pkg_matches(std::string_view process_name, std::string_view pkg) {
  if (pkg.empty() || process_name.size() < pkg.size()) return false;
  if (process_name.compare(0, pkg.size(), pkg) != 0) return false;
  if (process_name.size() == pkg.size()) return true;
  return process_name[pkg.size()] == ':' || process_name[pkg.size()] == '/';
}

void ensure_builtin_whitelist_locked() {
  if (g_whitelist_ready) return;
  g_whitelist.clear();
  for (const char *p : kBuiltinWhitelist) g_whitelist.emplace_back(p);
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
    if (end == std::string_view::npos) break;
    start = end + 1;
  }
}

}  // namespace

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
        if (n < 0) break;
        if (n == 0) break;
        raw.append(tmp, static_cast<size_t>(n));
        if (raw.size() > 64 * 1024) break;
      }
      ::close(fd);
      parse_whitelist_text(raw, &g_whitelist);
    }
  }
  if (g_whitelist.empty()) {
    for (const char *p : kBuiltinWhitelist) g_whitelist.emplace_back(p);
  }
  g_whitelist_ready = true;
}

bool is_capture_whitelist(std::string_view process_name) {
  std::lock_guard<std::mutex> lock(g_wl_mu);
  ensure_builtin_whitelist_locked();
  for (const auto &pkg : g_whitelist) {
    if (pkg_matches(process_name, pkg)) return true;
  }
  return false;
}

bool line_is_certbridge_trace(std::string_view line) {
  if (contains(line, "modules/CertBridge")) return true;
  if (contains(line, "/CertBridge/")) return true;
  if (contains(line, "/CertBridge")) return true;
  if (contains(line, "/dev/.cb")) return true;
  if (contains(line, "/.cb0") || contains(line, "/.cb1")) return true;
  if (contains(line, "/.fs0") || contains(line, "/.fs1")) return true;
  if (contains(line, "sys-ca-merge")) return true;
  if (contains_ci(line, "certbridge")) return true;
  return false;
}

bool path_is_mount_table(std::string_view path) {
  if (path.empty()) return false;
  if (contains(path, "/mountinfo")) return true;
  if (contains(path, "/mounts")) {
    if (ends_with(path, "/mounts")) return true;
    if (contains(path, "/proc/") && contains(path, "mounts")) return true;
  }
  return false;
}

bool path_is_maps_table(std::string_view path) {
  if (path.empty()) return false;
  if (ends_with(path, "/maps") && contains(path, "/proc/")) return true;
  if (ends_with(path, "/smaps") && contains(path, "/proc/")) return true;
  if (ends_with(path, "/smaps_rollup") && contains(path, "/proc/")) return true;
  return false;
}

bool path_needs_trace_filter(std::string_view path) {
  return path_is_mount_table(path) || path_is_maps_table(path);
}

std::string filter_trace_text(std::string_view raw) {
  std::string out;
  out.reserve(raw.size());
  size_t start = 0;
  while (start <= raw.size()) {
    size_t end = raw.find('\n', start);
    std::string_view line =
        end == std::string_view::npos ? raw.substr(start) : raw.substr(start, end - start);
    if (!line_is_certbridge_trace(line)) {
      out.append(line.data(), line.size());
      if (end != std::string_view::npos) out.push_back('\n');
    }
    if (end == std::string_view::npos) break;
    start = end + 1;
  }
  return out;
}

}  // namespace cb_hide
