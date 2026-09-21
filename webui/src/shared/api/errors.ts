/** 将内部错误码转成用户可读文案，避免暴露环境细节 */
export function friendlyError(code?: string): string {
  const errorCode = String(code || "")
    .trim()
    .split(/\s+/)[0];
  const messageByCode: Record<string, string> = {
    no_bridge: "请使用 KernelSU 等支持 WebUI 的管理器打开",
    no_ksu_bridge: "请使用 KernelSU 等支持 WebUI 的管理器打开",
    timeout: "操作超时，请稍后重试",
    status_failed: "状态读取失败，请下拉刷新",
    busy: "服务繁忙，请稍后再试",
    certificate_unavailable: "未找到可用证书，请先在对应应用中生成",
    invalid_toggle: "无效的开关",
    invalid_value: "无效的参数",
    write_failed: "保存失败",
    decode_failed: "文件解码失败",
    invalid_size: "文件过大或为空",
    openssl_unavailable: "证书工具暂不可用，请稍后重试",
    invalid_x509: "不是有效的证书文件",
    expired_certificate: "证书已过期",
    not_ca_certificate: "需要 CA 根证书",
    hot_feature_not_installed: "未安装临时证书功能",
    hot_allow_disabled: "临时挂载已关闭，请先在上方开启",
    invalid_hot_allow: "无效的临时挂载开关",
    hide_feature_not_installed: "未安装挂载隐藏组件",
    invalid_hide_allow: "无效的隐藏开关",
    zn_hide_feature_not_installed: "未安装 Zygisk 挂载过滤组件",
    invalid_zn_hide_allow: "无效的 Zygisk 过滤开关",
    invalid_force_bind_capture: "无效的强注开关",
    invalid_late_inject: "无效的晚注入开关",
    invalid_boot_bind_zygote: "无效的开机 Zygote 注入开关",
    invalid_boot_multi_apex: "无效的多 APEX 注入开关",
    invalid_service_probe: "无效的开机后复核开关",
    unknown_command: "未知命令，请运行 cb help",
    unknown_help_topic: "未知帮助主题",
    invalid_key: "无效的配置键",
    missing_key: "缺少配置键",
    missing_value: "缺少配置值",
    hot_unmount_incomplete: "临时证书未能完全卸除，建议重启",
    hot_reload_disabled: "该操作已停用",
    invalid_sd_path: "存储卡路径不受支持",
    sd_path_missing: "证书目录不存在",
    no_valid_certificates: "没有找到有效且未过期的 CA 证书",
    previous_session_busy: "旧临时会话未能完整卸载",
    hot_build_failed: "临时证书集合生成失败",
    hot_mount_failed: "临时挂载未完成，请稍后重试",
    nsenter_unavailable: "当前环境无法完成临时挂载",
    invalid_tmpfs_style: "无效的临时路径风格",
    invalid_quiet_prop: "无效的动态简介开关",
    invalid_mount_mode: "无效的挂载模式",
    invalid_experimental_14_system: "无效的 system 挂载选项",
    overlay_deprecated_use_magic_or_skip: "该选项已废弃，请改用轻量 Magic 或跳过 system",
    invalid_preset: "不支持的导入预设",
    preset_cert_not_found: "未找到该软件的证书文件，请先导出到下载目录",
    import_failed: "导入失败，请检查证书是否有效",
  };
  if (messageByCode[errorCode]) return messageByCode[errorCode];
  return errorCode || "操作未完成，请稍后重试";
}

export function errorFromResult(stdout: string, stderr: string): string {
  const combined = `${stdout || ""}\n${stderr || ""}`;
  const fields = Object.fromEntries(
    combined
      .split("\n")
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return separatorIndex > 0
          ? ([
              line.slice(0, separatorIndex).trim(),
              line.slice(separatorIndex + 1).trim(),
            ] as const)
          : null;
      })
      .filter(Boolean) as [string, string][],
  );
  if (fields.error) return friendlyError(fields.error);
  // stderr 可能是 shell 噪音，只取首行短码
  const stderrCode = String(stderr || "")
    .trim()
    .split(/\s+/)[0];
  return friendlyError(stderrCode || "failed");
}
