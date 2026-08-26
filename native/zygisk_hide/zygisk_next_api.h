/*
 * Zygisk Next Module API（草案）本地副本 —— 仅供可选辅路径源码编译。
 * 当前发布包默认不构建 / 不打包 zn_module（无校准注入目标时禁止空壳）。
 *
 * 对外 ABI 以 Zygisk Next 现行草案为准；本文件仅保留入口与 PLT 挂钩所需最小形状，
 * 便于日后对已确认会读取 mountinfo 的 init 服务做同类过滤。
 */

#pragma once

#include <cstdint>
#include <sys/types.h>

#ifdef __cplusplus
extern "C" {
#endif

#define ZYGISK_NEXT_API_VERSION_1 1

struct ZnApiTableV1 {
  void *impl;
  /** 按 pathname 正则对已加载 ELF 做 PLT 挂钩（草案语义） */
  void (*pltHook)(const char *pathname_regex, const char *symbol, void *new_func, void **old_func);
  /** 提交已登记的 PLT 挂钩 */
  bool (*pltHookCommit)(void);
};

/** 模块入口：加载器在目标服务进程中调用 */
typedef void (*zn_module_entry_v1_t)(ZnApiTableV1 *api, const char *process_name);

#ifdef __cplusplus
}
#endif
