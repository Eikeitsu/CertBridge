#!/system/bin/sh
# 模块描述 / 状态标签 / Root 识别
# 状态以开机脚本写入的 runtime-status 为准；简介按当前证书与热挂载会话动态生成。

current_boot_id() {
  tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null
}

read_runtime_status() {
  key="$1"
  [ -f "$RUNTIME_STATUS_FILE" ] || return 1
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' \
    "$RUNTIME_STATUS_FILE" 2>/dev/null | tr -d '\r'
}

runtime_status_fresh() {
  cached_boot=$(read_runtime_status boot_id)
  [ -n "$cached_boot" ] && [ "$cached_boot" = "$(current_boot_id)" ]
}

# phase: post-fs-data | service | manual
# apex_ok: 0|1|2  （同 check_store_injected）
write_runtime_status() {
  phase="$1"
  apex_ok="$2"
  tag="$3"
  mkdir -p "$STATEDIR" 2>/dev/null
  tmp="$RUNTIME_STATUS_FILE.tmp.$$"
  cat >"$tmp" <<EOF
boot_id=$(current_boot_id)
phase=$phase
apex_ok=$apex_ok
tag=$tag
updated_at=$(date +%s)
EOF
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$RUNTIME_STATUS_FILE"
}

detect_root_impl() {
  if [ -f "$ROOT_CACHE_FILE" ]; then
    cached=$(tr -d '\r\n' <"$ROOT_CACHE_FILE" 2>/dev/null)
    case "$cached" in
      Magisk|KernelSU|SukiSU|APatch|Unknown)
        echo "$cached"
        return 0
        ;;
    esac
  fi

  result=Unknown
  if [ "$APATCH" = "true" ] || [ -d /data/adb/ap ] || [ -f /data/adb/ap/bin/apd ]; then
    result=APatch
  elif [ "$KSU" = "true" ] || [ -d /data/adb/ksu ] || [ -f /data/adb/ksu/bin/ksud ]; then
    if [ -f /data/adb/ksu/bin/ksud ] && \
        grep -aql sukisu /data/adb/ksu/bin/ksud 2>/dev/null; then
      result=SukiSU
    else
      result=KernelSU
    fi
  elif [ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] || [ -f /sbin/magisk ]; then
    result=Magisk
  fi

  mkdir -p "$STATEDIR" 2>/dev/null
  echo "$result" >"$ROOT_CACHE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$ROOT_CACHE_FILE.tmp.$$" "$ROOT_CACHE_FILE" 2>/dev/null
  echo "$result"
}

hot_session_recorded() {
  hot_state="$STATEDIR/hot-session.conf"
  [ -f "$hot_state" ] || return 1
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_boot=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_session" ] && [ "$hot_boot" = "$(current_boot_id)" ]
}

hot_session_active() {
  hot_session_recorded || return 1
  hot_state="$STATEDIR/hot-session.conf"
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_target=$(awk -F= '$1 == "target" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_target" ] || return 1
  actual=$(nsenter --mount=/proc/1/ns/mnt -- \
    sh -c "cat '$hot_target/certbridge_session' 2>/dev/null" 2>/dev/null | tr -d '\r\n')
  [ "$actual" = "$hot_session" ]
}

# 从 applied-certs.list 生成「显示名」摘要（第 4 列为证书 CN/名称）
compose_applied_cert_summary() {
  [ -s "$APPLIED_MAP" ] || return 1
  names=""
  custom_n=0
  total=0
  while IFS='|' read -r label name checksum display; do
    [ -n "$label" ] || continue
    total=$((total + 1))
    case "$label" in
      custom:*) custom_n=$((custom_n + 1)) ;;
      *)
        if [ -n "$display" ]; then
          names="${names}${names:+、}${display}"
        else
          case "$label" in
            reqable) names="${names}${names:+、}Reqable" ;;
            proxypin) names="${names}${names:+、}ProxyPin" ;;
            *) names="${names}${names:+、}${label}" ;;
          esac
        fi
        ;;
    esac
  done <"$APPLIED_MAP"
  [ "$custom_n" -gt 0 ] && names="${names}${names:+、}自定义×${custom_n}"
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

# 管理器列表简介。可选 hint：启动中 | 注入中
compose_module_description() {
  hint="$1"

  if [ -f "$MODDIR/disable" ]; then
    format_module_description "⛔已禁用" "模块未运行" \
      "可在模块管理器中重新启用以恢复挂载"
    return 0
  fi

  case "$hint" in
    启动中)
      format_module_description "🔎启动中" "准备信任库" "$DESC_INTRO"
      return 0
      ;;
    注入中)
      format_module_description "✨注入中" "写入命名空间" "$DESC_INTRO"
      return 0
      ;;
  esac

  if hot_session_recorded; then
    hot_added=$(awk -F= '$1 == "added_count" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    hot_failed=$(awk -F= '$1 == "namespace_failed" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    hot_label=$(hot_mode_label)
    hot_added=${hot_added:-0}
    outer="来自${hot_label}的临时会话，重启后自动失效"
    [ "${hot_failed:-0}" -gt 0 ] && outer="${outer}；部分应用命名空间未覆盖"
    [ -f "$PENDING_FILE" ] && outer="${outer}；另有永久配置待重启生效"
    format_module_description "🔥热挂载" "临时:${hot_added}" "$outer"
    return 0
  fi

  if [ -f "$PENDING_FILE" ]; then
    if summary=$(compose_pending_cert_summary); then
      n=${summary%%|*}
      names=${summary#*|}
      format_module_description "⏳待重启" "待生效:${n}" \
        "重启后挂入：${names}"
    else
      format_module_description "⏳待重启" "配置已改" \
        "请重启设备使新配置生效"
    fi
    return 0
  fi

  if ! generation_valid; then
    if [ -f "$STATEDIR/inject-error" ]; then
      format_module_description "⚠️异常" "证书集未就绪" \
        "请打开 WebUI 查看日志，必要时重启后再检查"
    else
      format_module_description "🔎检测中" "等待开机注入完成" "$DESC_INTRO"
    fi
    return 0
  fi

  if [ "$(count_addon_certs)" -eq 0 ]; then
    format_module_description "💤未启用" "无证书" \
      "请在 WebUI 启用内置证书或导入自定义 CA"
    return 0
  fi

  if [ -f "$STATEDIR/inject-error" ] && ! runtime_status_fresh; then
    format_module_description "⚠️异常" "注入失败" \
      "请打开 WebUI 查看日志，必要时重启后再检查"
    return 0
  fi

  if runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    case "$cached_tag" in
      *失败*|注入异常|⚠️*|异常)
        format_module_description "⚠️异常" "注入失败" \
          "请打开 WebUI 查看日志，必要时重启后再检查"
        return 0
        ;;
      注入中|启动中|检测中|✨*|🔎*)
        cached_phase=$(read_runtime_status phase)
        if [ "$cached_phase" != "service" ]; then
          format_module_description "✨注入中" "写入命名空间" "$DESC_INTRO"
          return 0
        fi
        ;;
    esac
  fi

  if summary=$(compose_applied_cert_summary); then
    n=${summary%%|*}
    names=${summary#*|}
    format_module_description "✅运行正常" "已挂载:${n}" \
      "当前生效：${names}"
    return 0
  fi

  format_module_description "🔎检测中" "等待开机注入完成" "$DESC_INTRO"
}

# WebUI / 状态短标签（可带 emoji）
compute_status_tag() {
  force_verify="${1:-0}"
  [ -f "$MODDIR/disable" ] && { echo "⛔已禁用"; return 0; }

  if hot_session_recorded; then
    hot_failed=$(awk -F= '$1 == "namespace_failed" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    hot_added=$(awk -F= '$1 == "added_count" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    if [ "${hot_failed:-0}" -gt 0 ]; then
      echo "🔥热挂载 +${hot_added:-0}（部分未覆盖）"
    elif [ -f "$PENDING_FILE" ]; then
      echo "🔥热挂载 +${hot_added:-0}（待重启）"
    else
      echo "🔥热挂载 +${hot_added:-0}"
    fi
    return 0
  fi

  [ -f "$PENDING_FILE" ] && { echo "⏳待重启"; return 0; }
  generation_valid || {
    [ -f "$STATEDIR/inject-error" ] && { echo "⚠️异常"; return 0; }
    echo "🔎检测中"
    return 0
  }
  [ "$(count_addon_certs)" -eq 0 ] && { echo "💤未启用"; return 0; }

  if [ "$force_verify" != "1" ] && runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    cached_phase=$(read_runtime_status phase)
    case "$cached_tag" in
      注入中|启动中|检测中|✨*|🔎*)
        if [ "$cached_phase" = "service" ] || [ -f "$STATEDIR/inject-error" ]; then
          :
        else
          echo "✨注入中"
          return 0
        fi
        ;;
      "")
        ;;
      *)
        echo "$cached_tag"
        return 0
        ;;
    esac
  fi

  if [ "$force_verify" = "1" ]; then
    [ "$(check_store_injected)" = "0" ] && {
      echo "⚠️异常"
      return 0
    }
    if summary=$(compose_applied_cert_summary); then
      n=${summary%%|*}
      echo "✅运行正常 · ${n} 张"
    else
      echo "✅运行正常"
    fi
    return 0
  fi

  if [ -f "$STATEDIR/inject-error" ]; then
    echo "⚠️异常"
    return 0
  fi
  echo "🔎检测中"
}

update_module_description() {
  # 可选：启动中 | 注入中
  hint="$1"
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || return 0
  desc=$(compose_module_description "$hint")
  tmp="$prop.tmp.$$"
  awk -F= -v desc="$desc" '
    BEGIN { done=0 }
    $1 == "description" { print "description=" desc; done=1; next }
    { print }
    END { if (!done) print "description=" desc }
  ' "$prop" >"$tmp" && mv -f "$tmp" "$prop"
  chmod 0644 "$prop" 2>/dev/null
}

refresh_module_description() {
  force_verify="${1:-0}"
  tag=$(compute_status_tag "$force_verify")
  update_module_description
  echo "$tag"
}

# 开机脚本在注入完成后调用：实测一次并落盘
finalize_runtime_status() {
  phase="$1"
  if [ -f "$MODDIR/disable" ]; then
    write_runtime_status "$phase" 2 "⛔已禁用"
    update_module_description
    return 0
  fi
  if [ -f "$PENDING_FILE" ]; then
    write_runtime_status "$phase" 2 "⏳待重启"
    update_module_description
    return 0
  fi
  if ! generation_valid; then
    write_runtime_status "$phase" 0 "⚠️异常"
    update_module_description
    return 0
  fi
  if [ "$(count_addon_certs)" -eq 0 ]; then
    write_runtime_status "$phase" 2 "💤未启用"
    update_module_description
    return 0
  fi
  apex_ok=$(check_store_injected)
  if [ "$apex_ok" = "0" ]; then
    tag="⚠️异常"
  elif summary=$(compose_applied_cert_summary); then
    n=${summary%%|*}
    tag="✅运行正常 · ${n} 张"
  else
    tag="✅运行正常"
  fi
  write_runtime_status "$phase" "$apex_ok" "$tag"
  update_module_description
}
