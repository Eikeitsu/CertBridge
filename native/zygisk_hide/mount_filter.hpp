#pragma once

#include <cstddef>
#include <string>
#include <string_view>

namespace cb_hide {

/** 是否为抓包白名单包名（不过滤其 mount / maps 视图，避免读不到系统 CA） */
bool is_capture_whitelist(std::string_view process_name);

/** 行内是否含本模块挂载 / 临时层 / Zygisk so 路径特征 */
bool line_is_certbridge_trace(std::string_view line);

/** 路径是否指向进程挂载表（mountinfo / mounts） */
bool path_is_mount_table(std::string_view path);

/** 路径是否指向内存映射表（maps / smaps），常用于扫 Zygisk so */
bool path_is_maps_table(std::string_view path);

/** 是否应对该路径的读结果做本模块痕迹过滤 */
bool path_needs_trace_filter(std::string_view path);

/**
 * 过滤全文：去掉含本模块痕迹的行（适用于 mountinfo / mounts / maps / smaps）。
 */
std::string filter_trace_text(std::string_view raw);

/** @deprecated 同 filter_trace_text，保留旧名 */
inline std::string filter_mount_table_text(std::string_view raw) {
  return filter_trace_text(raw);
}

}  // namespace cb_hide
