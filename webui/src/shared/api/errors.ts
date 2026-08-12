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
    invalid_mount_mode: "无效的挂载模式",
  };
  if (messageByCode[errorCode]) return messageByCode[errorCode];
  return errorCode || "操作未完成，请稍后重试";
}

export function errorFromResult(stdout: string, stderr: string): string {
  const fields = Object.fromEntries(
    String(stdout || "")
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
  return friendlyError(fields.error || stderr || "failed");
}
