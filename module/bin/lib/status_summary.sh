#!/system/bin/sh
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
# stdout: total|names；失败返回 1
compose_applied_cert_summary() {
  mode="compact"
  [ -s "$APPLIED_MAP" ] || return 1
  names=""
  custom_n=0
  total=0
  while IFS='|' read -r label name checksum display || [ -n "$label" ]; do
    label=$(printf '%s' "$label" | tr -d '\r')
    name=$(printf '%s' "$name" | tr -d '\r')
    display=$(printf '%s' "$display" | tr -d '\r')
    [ -n "$label" ] || continue
    total=$((total + 1))
    case "$mode:$label" in
      compact:custom:*)
        custom_n=$((custom_n + 1))
        ;;
      *)
        # 列表简介用短名（Reqable / ProxyPin），避免 CN 过长且与「已挂载:n」重复喧宾夺主
        case "$label" in
          reqable|proxypin) display=$(applied_cert_fallback_display "$label" "$name") ;;
          *) [ -n "$display" ] || display=$(applied_cert_fallback_display "$label" "$name") ;;
        esac
        names="${names}${names:+、}${display}"
        ;;
    esac
  done <"$APPLIED_MAP"
  if [ "$mode" = "compact" ] && [ "$custom_n" -gt 0 ]; then
    names="${names}${names:+、}$(i18n_fmt status.custom_x n="$custom_n")"
  fi
  [ "$total" -gt 0 ] || return 1
  echo "${total}|${names}"
}

# 生效证书张数（供状态标签兜底，避免出现「运行正常 · 张」）
count_applied_certs() {
  [ -s "$APPLIED_MAP" ] || {
    echo 0
    return 0
  }
  total=0
  while IFS='|' read -r label _rest || [ -n "$label" ]; do
    label=$(printf '%s' "$label" | tr -d '\r')
    [ -n "$label" ] || continue
    total=$((total + 1))
  done <"$APPLIED_MAP"
  echo "$total"
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
    names="${names}${names:+、}$(i18n_fmt status.custom_x n="$custom_n")"
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
#   （数量只出现在「已挂载:n」，括号外不要再写 n|）
# 模块定位仅写入「首次尚未真正跑起来」时的括号外文案
desc_intro() {
  i18n_msg status.intro 2>/dev/null || echo "CertBridge"
}
# 兼容旧引用
DESC_INTRO="$(desc_intro 2>/dev/null || true)"

# 解析 compose_*_cert_summary 输出 "total|names"
# 用 "${n}|" 字面去掉前缀，避免部分 Android sh 对 ${x#*|} 中 | 处理不一致
# 成功时设置：_sum_n、_sum_names
parse_cert_summary() {
  _raw=$(printf '%s' "$1" | tr -d '\r')
  _sum_n=${_raw%%\|*}
  if [ -z "$_raw" ] || [ "$_sum_n" = "$_raw" ]; then
    _sum_names=
  else
    _sum_names=${_raw#"${_sum_n}|"}
    # 仍整段相等说明前缀剥离失败，再试按首个 | 切开
    if [ "$_sum_names" = "$_raw" ]; then
      _sum_names=${_raw#*\|}
    fi
  fi
  _sum_n=$(printf '%s' "$_sum_n" | tr -d ' \n')
  # 防御：names 仍误带 "N|" 时剥掉
  case "$_sum_names" in
    "${_sum_n}|"*) _sum_names=${_sum_names#"${_sum_n}|"} ;;
  esac
}

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

  [ -n "$outer" ] || outer="$(desc_intro)"
  echo "${head} ${outer}"
}

# 管理器列表简介
