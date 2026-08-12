const CAS = {
  MODDIR: "/data/adb/modules/CertBridge",
  CONF: "/data/adb/modules/CertBridge/config/certs.conf",
  DATADIR: "/data/adb/modules/CertBridge/data",
  LOG_FILE: "/data/adb/modules/CertBridge/data/install.log",
  CUSTOM_DIR: "/data/adb/modules/CertBridge/certs/custom",
  CLI: "/data/adb/modules/CertBridge/bin/cert_manager.sh",
  FONT_KEY: "cas_font_scale",
  // 状态在开机脚本落盘，WebUI 打开时读一次即可，无需轮询
  STATUS_INTERVAL: 0,
};
