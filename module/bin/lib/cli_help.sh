#!/system/bin/sh
# CLI help / 别名 / 统一 get·set；由 cert_manager.sh 加载

# 将缩写与别名归一成规范子命令；未知原样返回
cli_normalize_cmd() {
  case "$1" in
    help|-h|--help|'?') echo help ;;
    status|st|s) echo status ;;
    verify|v) echo verify ;;
    list_custom|ls|lc) echo list_custom ;;
    list_applied_fps|lf|fps) echo list_applied_fps ;;
    toggle|t) echo toggle ;;
    sync_apps|sa) echo sync_apps ;;
    set_mount_mode|mm) echo set_mount_mode ;;
    set_experimental_14_system|e14) echo set_experimental_14_system ;;
    set_tmpfs_style|tf|tmpfs) echo set_tmpfs_style ;;
    set_quiet_prop|qp) echo set_quiet_prop ;;
    set_hot_allow|ha) echo set_hot_allow ;;
    set_hide_allow|hide) echo set_hide_allow ;;
    hide_reregister|hr) echo hide_reregister ;;
    set_zn_hide_allow|zn) echo set_zn_hide_allow ;;
    set_force_bind_capture|fb|force) echo set_force_bind_capture ;;
    set_late_inject|li|late) echo set_late_inject ;;
    set_boot_bind_zygote|bbz|zygote) echo set_boot_bind_zygote ;;
    set_boot_multi_apex|bma|apex) echo set_boot_multi_apex ;;
    set_service_probe|sp|probe) echo set_service_probe ;;
    get_zn_whitelist|gzn) echo get_zn_whitelist ;;
    set_zn_whitelist|szn) echo set_zn_whitelist ;;
    install_custom|ic) echo install_custom ;;
    import_app_preset|ip) echo import_app_preset ;;
    remove_custom|rm|rc) echo remove_custom ;;
    cert_info|info|ci) echo cert_info ;;
    hot_mount|hm) echo hot_mount ;;
    hot_unmount|hu) echo hot_unmount ;;
    get|g) echo get ;;
    set) echo set ;;
    reinject|sync) echo reinject ;;
    *) echo "$1" ;;
  esac
}

cli_conf_keys() {
  echo "reqable proxypin mount_mode experimental_14_system tmpfs_style quiet_prop hot_allow hide_allow zn_hide_allow force_bind_capture late_inject boot_bind_zygote boot_multi_apex service_probe"
}

cmd_get_conf() {
  key="$1"
  [ -n "$key" ] || {
    echo "error=missing_key"
    echo "hint=用法: cb get <key>；可设键: $(cli_conf_keys)"
    return 1
  }
  case "$key" in
    reqable|proxypin|mount_mode|experimental_14_system|tmpfs_style|quiet_prop|hot_allow|hide_allow|zn_hide_allow|force_bind_capture|late_inject|boot_bind_zygote|boot_multi_apex|service_probe)
      ;;
    schema_version)
      echo "schema_version=$(read_conf schema_version 4)"
      echo "ok=1"
      return 0
      ;;
    *)
      echo "error=invalid_key"
      echo "hint=可设键: $(cli_conf_keys)；完整状态用: cb status"
      return 1
      ;;
  esac
  # 与各 setter / status 默认对齐
  case "$key" in
    quiet_prop|hot_allow|reqable|proxypin) def=1 ;;
    experimental_14_system) def=skip ;;
    mount_mode) def=compatible ;;
    tmpfs_style) def=dev ;;
    *) def=0 ;;
  esac
  echo "$key=$(read_conf "$key" "$def")"
  echo "ok=1"
}

# 统一 set：转发到带副作用的专用 setter（勿直接 write_conf）
cmd_set_conf() {
  key="$1"
  val="$2"
  [ -n "$key" ] || {
    echo "error=missing_key"
    echo "hint=用法: cb set <key> <value>；见 cb help set"
    return 1
  }
  [ -n "$val" ] || {
    echo "error=missing_value"
    echo "hint=用法: cb set $key <value>"
    return 1
  }
  case "$key" in
    mount_mode|mm) cmd_set_mount_mode "$val" ;;
    experimental_14_system|e14) cmd_set_experimental_14_system "$val" ;;
    tmpfs_style|tf|tmpfs) cmd_set_tmpfs_style "$val" ;;
    quiet_prop|qp) cmd_set_quiet_prop "$val" ;;
    hot_allow|ha) cmd_set_hot_allow "$val" ;;
    hide_allow|hide) cmd_set_hide_allow "$val" ;;
    zn_hide_allow|zn) cmd_set_zn_hide_allow "$val" ;;
    force_bind_capture|fb|force) cmd_set_force_bind_capture "$val" ;;
    late_inject|li|late) cmd_set_late_inject "$val" ;;
    boot_bind_zygote|bbz|zygote) cmd_set_boot_bind_zygote "$val" ;;
    boot_multi_apex|bma|apex) cmd_set_boot_multi_apex "$val" ;;
    service_probe|sp|probe) cmd_set_service_probe "$val" ;;
    reqable|proxypin) cmd_toggle "$key" "$val" ;;
    *)
      echo "error=invalid_key"
      echo "hint=可设键: $(cli_conf_keys)；白名单用: cb set_zn_whitelist；见 cb help set"
      return 1
      ;;
  esac
}

cmd_help() {
  topic="${1:-}"
  case "$topic" in
    ""|all|commands)
      cat <<'EOF'
CertBridge CLI (cb / cert_manager.sh)

用法: cb <命令> [参数…]
      cb help [主题]

读状态
  status|st|s [--live]     状态（--live=实测回写，同 verify）
  verify|v                 同 status --live
  get|g <key>              读单个 conf 键

证书
  list_custom|ls|lc        自定义证书列表
  list_applied_fps|lf|fps  已应用指纹
  cert_info|info|ci <目标> reqable|proxypin|文件名
  toggle|t <名> <0|1>      开关 reqable / proxypin
  sync_apps|sa             从 App 再同步内置源
  install_custom|ic <b64>  安装自定义（WebUI 用）
  import_app_preset|ip <名> 导入预设
  remove_custom|rm|rc <文件>

配置（长名与 set <key> 等价）
  set <key> <value>        统一写入（走专用校验/副作用）
  set_mount_mode|mm …
  set_experimental_14_system|e14 …
  set_tmpfs_style|tf …
  set_quiet_prop|qp …
  set_hot_allow|ha …
  set_hide_allow|hide …
  set_zn_hide_allow|zn …
  set_force_bind_capture|fb|force …
  set_late_inject|li|late …
  set_boot_bind_zygote|bbz …
  set_boot_multi_apex|bma …
  set_service_probe|sp …
  hide_reregister|hr       立刻重登记 try_umount
  get_zn_whitelist|gzn
  set_zn_whitelist|szn <b64>

热挂载
  hot_mount|hm <user|sd|all> [路径]
  hot_unmount|hu

已停用
  reinject|sync            → error=hot_reload_disabled（需重启）

主题帮助: cb help set | get | status | hot | hide | aliases
EOF
      ;;
    set)
      cat <<'EOF'
cb set <key> <value>

可设键（亦可用对应 set_* 长名）:
  mount_mode                 compatible | magic
  experimental_14_system     auto | skip
  tmpfs_style                dev | mnt | short | legacy
  quiet_prop                 0 | 1
  hot_allow                  0 | 1
  hide_allow                 0 | 1
  zn_hide_allow              0 | 1
  force_bind_capture         0 | 1
  late_inject                0 | 1
  boot_bind_zygote           0 | 1（默认 0=开机不进 zygote）
  boot_multi_apex            0 | 1（默认 0=14+ 仅主 APEX；1=完整双模式目标）
  service_probe              0 | 1（默认 0；仅 late_inject=1 时做退避/heal）
  reqable / proxypin         0 | 1（同 toggle）

例:
  cb set boot_bind_zygote 1
  cb set boot_multi_apex 1
  cb set late_inject 1
  cb set_mount_mode magic
EOF
      ;;
    get)
      cat <<'EOF'
cb get <key>

读 certs.conf 单项；缺省键见 cb help set。
完整实况请用: cb status 或 cb status --live
EOF
      ;;
    status|verify)
      cat <<'EOF'
cb status [--live]
cb verify          # 等同 status --live

默认读缓存；--live 实测注入并回写（WebUI「刷新复核」）。
EOF
      ;;
    hot)
      cat <<'EOF'
cb hot_mount|hm <user|sd|all> [sd_path]
cb hot_unmount|hu
cb set_hot_allow|ha <0|1>

需已安装热挂载组件且 hot_allow=1。
EOF
      ;;
    hide)
      cat <<'EOF'
cb set_hide_allow|hide <0|1>
cb hide_reregister|hr
cb set_zn_hide_allow|zn <0|1>
cb get_zn_whitelist|gzn
cb set_zn_whitelist|szn <base64>
cb set_force_bind_capture|fb <0|1>
cb set_late_inject|li <0|1>
cb set_boot_bind_zygote|bbz <0|1>
cb set_boot_multi_apex|bma <0|1>
cb set_service_probe|sp <0|1>

hide / zn 需对应组件已安装；冷门实验项见 WebUI「隐藏 → 冷门实验」。
EOF
      ;;
    aliases|alias|short)
      cat <<'EOF'
常用缩写:
  st/s→status  v→verify  ls→list_custom  lf→list_applied_fps
  t→toggle  sa→sync_apps  g→get  mm→set_mount_mode  e14→…
  tf→tmpfs  qp→quiet_prop  ha→hot_allow  hide→hide_allow
  zn→zn_hide_allow  fb/force→force_bind  li/late→late_inject
  bbz→boot_bind_zygote  bma→boot_multi_apex  sp→service_probe
  hm/hu→hot_mount/unmount  hr→hide_reregister
  ic/ip/rm→install/import/remove  info→cert_info
EOF
      ;;
    *)
      echo "error=unknown_help_topic"
      echo "hint=可用主题: set get status hot hide aliases；或: cb help"
      return 1
      ;;
  esac
  return 0
}

# 未知子命令：error= + 简单前缀提示
cli_unknown() {
  raw="$1"
  echo "error=unknown_command"
  if [ -z "$raw" ]; then
    echo "hint=缺少子命令。运行: cb help"
    return 1
  fi
  # 在已知名里找前缀/包含匹配（最多 5 个）
  sug=""
  for c in \
    help status verify get set list_custom list_applied_fps toggle sync_apps \
    set_mount_mode set_experimental_14_system set_tmpfs_style set_quiet_prop \
    set_hot_allow set_hide_allow hide_reregister set_zn_hide_allow \
    set_force_bind_capture set_late_inject set_boot_bind_zygote set_boot_multi_apex \
    set_service_probe get_zn_whitelist set_zn_whitelist \
    install_custom import_app_preset remove_custom cert_info hot_mount hot_unmount
  do
    case "$c" in
      "$raw"*) sug="$sug $c" ;;
      *"$raw"*) sug="$sug $c" ;;
    esac
  done
  # 去重空格并截断
  sug=$(echo "$sug" | awk '{
    n=0
    for (i=1;i<=NF;i++) {
      if (!seen[$i]++) { n++; out=(out?out" ":"")$i }
      if (n>=5) break
    }
    print out
  }')
  if [ -n "$sug" ]; then
    echo "hint=未知「$raw」。接近: $sug；或: cb help"
  else
    echo "hint=未知「$raw」。运行: cb help"
  fi
  return 1
}
