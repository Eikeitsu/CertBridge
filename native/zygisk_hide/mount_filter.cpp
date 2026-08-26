#include "mount_filter.hpp"

#include <cstring>

namespace cb_hide {
namespace {

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

}  // namespace

bool is_capture_whitelist(std::string_view process_name) {
  static constexpr const char *kPkgs[] = {
      "com.reqable.android",
      "com.reqable.android.pro",
      "com.reqable",
      "com.proxy.pin",
      "com.network.proxy",
      "com.wangyu.proxypin",
  };
  for (const char *pkg : kPkgs) {
    const size_t n = std::strlen(pkg);
    if (process_name.size() < n) continue;
    if (process_name.compare(0, n, pkg) != 0) continue;
    if (process_name.size() == n) return true;
    if (process_name[n] == ':' || process_name[n] == '/') return true;
  }
  return false;
}

bool line_is_certbridge_trace(std::string_view line) {
  // 模块目录、Zygisk so、临时层、合并层 —— 仅本模块
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
  // /proc/self/maps、/proc/<pid>/smaps、smaps_rollup
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
