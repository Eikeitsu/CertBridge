# 由 status.sh 加载
# 证书摘要与简介格式化
applied_cert_fallback_display() {
  label="$1"
  name="$2"
  case "$label" in
    reqable) echo Reqable ;;
    proxypin) echo ProxyPin ;;
    custom:*) echo "${name:-${label#custom:}}" ;;
    *) echo "$label" ;;
  esac
}

# 从 applied-certs.list 生成摘要（第 4 列为证书 CN/名称）
compose_applied_cert_summary() {
  mode="compact"
  [ -s "$APPLIED_MAP" ] || return 1
  names=""
  custom_n=0
  total=0
  while IFS='|' read -r label name checksum display; do
    [ -n "$label" ] || continue
    total=$((total + 1))
    case "$mode:$label" in
      compact:custom:*)
        custom_n=$((custom_n + 1))
        ;;
      *)
        [ -n "$display" ] || display=$(applied_cert_fallback_display "$label" "$name")
        names="${names}${names:+、}${display}"
        ;;
    esac
  done <"$APPLIED_MAP"
  if [ "$mode" = "compact" ] && [ "$custom_n" -gt 0 ]; then
    names="${names}${names:+、}自定义×${custom_n}"
  fi
  [ "$total" -gt 0 ] || return 1
  echo "${total}|${names}"
}

# 配置已改但尚未重启：按开关 + 自定义目录预估
compose_pending_cert_summary() {
  names=""
  total=0
  custom_n=0
  if [ "$(read_conf reqable 1)" = "1" ] && find_addon_cert reqable 0 >/dev/null 2>&1; then
    cert=$(find_addon_cert reqable 0)
    dn=$(read_cert_meta_display "$cert" "Reqable")
    names="${names}${names:+、}${dn}"
    total=$((total + 1))
  fi
  if [ "$(read_conf proxypin 1)" = "1" ] && find_addon_cert proxypin 0 >/dev/null 2>&1; then
    cert=$(find_addon_cert proxypin 0)
    dn=$(read_cert_meta_display "$cert" "ProxyPin")
    names="${names}${names:+、}${dn}"
    total=$((total + 1))
  fi
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    is_cert_filename "$(basename "$cert")" || continue
    custom_n=$((custom_n + 1))
  done
  if [ "$custom_n" -gt 0 ]; then
    names="${names}${names:+、}自定义×${custom_n}"
    total=$((total + custom_n))
  fi
  [ "$total" -gt 0 ] || return 1
  echo "${total}|${names}"
}

hot_mode_label() {
  case "$(awk -F= '$1 == "mode" { print $2; exit }' "$STATEDIR/hot-session.conf" 2>/dev/null)" in
    user) echo "用户区" ;;
    sd) echo "存储卡" ;;
    all) echo "用户区+存储卡" ;;
    *) echo "临时证书" ;;
  esac
}

# 列表简介：
#   [大状态|子状态] 括号外说明（必填，可稍长）
#   emoji 后无空格；方括号内 | 两侧不加空格；括号外若用 | 则两侧加空格
# 例：[✅运行正常|已挂载:2] 当前生效：Reqable、ProxyPin
# 模块定位仅写入「首次尚未真正跑起来」时的括号外文案
DESC_INTRO="让系统信任抓包 CA，支持 Reqable / ProxyPin / 自定义；兼容 Magisk、KernelSU、APatch，Android 7–16"

# $1=大状态  $2=括号内子状态（可空）  $3=括号外说明（必填）
format_module_description() {
  major="$1"
  inner="$2"
  outer="$3"

  if [ -n "$inner" ]; then
    head="[${major}|${inner}]"
  else
    head="[${major}]"
  fi

  # 括号外不允许空白：缺省时回退到模块定位
  [ -n "$outer" ] || outer="$DESC_INTRO"
  echo "${head} ${outer}"
}

# 管理器列表简介
