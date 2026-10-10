#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

namespace cb_hide {

/**
 * 读取 zn_hide_allow，优先级与 shell read_conf 一致：
 *   1) /data/adb/certbridge/user.conf
 *   2) 模块 data/state/user.conf（legacy）
 *   3) 模块 config/certs.conf
 * 任一文件显式写出该键即以该值为准（含 =0）；皆无则视为关闭。
 * moddir_fd < 0 时仅查外置 user.conf。
 */
bool read_zn_hide_allow(int moddir_fd);

/** 是否额外隐藏匿名可执行 maps（默认关；user.conf `zn_hide_anon_exec=1`） */
bool read_zn_hide_anon_exec(int moddir_fd);

/** 过滤名单模式：黑名单=仅过滤名单内；白名单=过滤名单外 */
enum class FilterMode : uint8_t { Blacklist = 0, Whitelist = 1 };

/** 读 zn_filter_mode（blacklist|whitelist）；缺省 / 非法 → Blacklist */
FilterMode read_zn_filter_mode(int moddir_fd);

/**
 * 从模块目录加载名单与模式：
 * - config/zn_blacklist.txt：黑名单模式用
 * - config/zn_whitelist.txt：白名单模式用
 * - zn_filter_mode：blacklist（默认）| whitelist
 * 内置抓包豁免始终生效（不过滤）
 */
void load_lists_from_moddir(int moddir_fd);

/** @deprecated 同 load_lists_from_moddir */
inline void load_whitelist_from_moddir(int moddir_fd) { load_lists_from_moddir(moddir_fd); }

/** 是否为内置抓包 App（永久不过滤，避免读不到系统 CA） */
bool is_capture_exempt(std::string_view process_name);

/** @deprecated 同 is_capture_exempt */
inline bool is_capture_whitelist(std::string_view process_name) {
  return is_capture_exempt(process_name);
}

/** 是否在黑名单中（要过滤） */
bool is_on_blacklist(std::string_view process_name);

/** 是否在白名单中（豁免不过滤；白名单模式用） */
bool is_on_whitelist(std::string_view process_name);

/** @deprecated 同 is_on_blacklist */
inline bool is_filter_target(std::string_view process_name) {
  return is_on_blacklist(process_name);
}

/**
 * 是否应对该进程挂钩过滤。
 * 抓包豁免永远 false；blacklist：仅名单内；whitelist：名单外。
 */
bool should_filter_process(std::string_view process_name);

#ifdef CERTBRIDGE_HOST_TEST
/** 主机单测注入名单状态（不读盘） */
void host_test_set_filter_state(FilterMode mode, const std::vector<std::string> &blacklist,
                                const std::vector<std::string> &whitelist);
#endif

/** 行内是否含本模块挂载 / 临时层 / Zygisk so 路径特征 */
bool line_is_certbridge_trace(std::string_view line);

/**
 * maps/smaps VMA：可执行匿名映射（[anonymous] / 无名 00:00 0）。
 * 默认不用于过滤（见 set_hide_anon_exec）；误开会误伤正常 App。
 */
bool line_is_anon_executable_map(std::string_view line);

/** 是否额外隐藏匿名可执行 maps 行（默认关；对应 zn_hide_anon_exec=1） */
void set_hide_anon_exec(bool on);
bool hide_anon_exec_enabled();

/** maps/smaps 是否应隐藏该行（默认仅路径痕迹；可选匿名可执行页） */
bool line_should_hide_maps(std::string_view line);

/** 路径是否指向进程挂载表（mountinfo / mounts） */
bool path_is_mount_table(std::string_view path);

/** 路径是否指向内存映射表（maps / smaps） */
bool path_is_maps_table(std::string_view path);

/** 是否应对该路径的读结果做本模块痕迹过滤 */
bool path_needs_trace_filter(std::string_view path);

/** 是否为 /proc/.../smaps（多行 VMA 记录，过滤时需整段丢弃） */
bool path_is_smaps_table(std::string_view path);

/**
 * openat 相对路径：结合 dirfd 解析后的绝对路径，或 basename + dirfd 是否为 /proc/self|/proc/N。
 * dir_abs 为空时仅按 pathname 判断。
 */
bool path_needs_trace_filter_resolved(std::string_view pathname, std::string_view dir_abs);

/** 解析 openat(dirfd, pathname) 为绝对路径（尽力）；失败返回空 */
std::string resolve_openat_path(int dirfd, const char *pathname);

/**
 * 过滤全文：去掉含本模块痕迹的行（适用于 mountinfo / mounts / maps / smaps）。
 * smaps_records=true 时按 VMA 记录丢弃（首行 + 后续字段行）。
 */
std::string filter_trace_text_ex(std::string_view raw, bool smaps_records);
std::string filter_trace_text(std::string_view raw);

inline std::string filter_mount_table_text(std::string_view raw) {
  return filter_trace_text(raw);
}

} // namespace cb_hide
