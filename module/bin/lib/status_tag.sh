#!/system/bin/sh
# 由 status.sh 加载
# 短标签与 module.prop 刷新
compute_status_tag() {
  force_verify="${1:-0}"
  [ -f "$MODDIR/disable" ] && { echo "⛔已禁用"; return 0; }

  if [ -f "$STATEDIR/hot-update" ]; then
    clear_stale_hot_update_marker || { echo "♻️热更新中"; return 0; }
  fi

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
      注入中|启动中|检测中|稳定中|✨*|🔎*)
        # service 已落盘的「稳定中」对 WebUI 仍展示中间态；异常诊断就绪则继续走下方逻辑
        if inject_error_present && [ "$cached_tag" != "✨稳定中" ] && [ "$cached_tag" != "稳定中" ]; then
          :
        elif [ "$cached_tag" = "✨稳定中" ] || [ "$cached_tag" = "稳定中" ]; then
          echo "✨稳定中"
          return 0
        elif [ "$cached_phase" = "service" ]; then
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

  if inject_error_present; then
    echo "⚠️异常"
    return 0
  fi
  echo "🔎检测中"
}

update_module_description() {
  # 可选：启动中 | 注入中
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || return 0
  if is_quiet_prop 2>/dev/null; then
    desc="$DESC_INTRO"
  else
    desc=$(compose_module_description)
  fi
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

# WebUI 写配置热路径：只写短标签，不做注入核验 / generation 全量扫描
refresh_module_description_light() {
  if [ -f "$MODDIR/disable" ]; then
    tag="⛔已禁用"
  elif hot_session_recorded 2>/dev/null; then
    tag="🔥热挂载"
  elif [ -f "$PENDING_FILE" ]; then
    tag="⏳待重启"
  else
    tag="✨已更新"
  fi
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || {
    echo "$tag"
    return 0
  }
  if is_quiet_prop 2>/dev/null; then
    desc="$DESC_INTRO"
  else
    desc=$(compose_module_prop_description_light "$tag" 2>/dev/null || echo "$tag")
  fi
  tmp="$prop.tmp.$$"
  awk -F= -v desc="$desc" '
    BEGIN { done=0 }
    $1 == "description" { print "description=" desc; done=1; next }
    { print }
    END { if (!done) print "description=" desc }
  ' "$prop" >"$tmp" && mv -f "$tmp" "$prop"
  chmod 0644 "$prop" 2>/dev/null
  echo "$tag"
}

compose_module_prop_description_light() {
  tag="$1"
  echo "[${tag}] 配置已保存；完整状态以下次刷新 / 重启为准"
}

# 将实测结果写成 tag / 错误态并落盘（finalize / live 复核共用）
apply_verified_runtime_status() {
  phase="$1"
  apex_ok="$2"
  if [ "$apex_ok" = "0" ]; then
    tag="⚠️异常"
    if [ "$phase" = "service" ] || [ "$phase" = "heal" ] || [ "$phase" = "live" ]; then
      ensure_inject_error_diagnosed 2>/dev/null || true
    elif ! inject_error_present; then
      write_inject_error verify_failed 2>/dev/null || true
    fi
  elif summary=$(compose_applied_cert_summary); then
    n=${summary%%|*}
    tag="✅运行正常 · ${n} 张"
    clear_inject_error 2>/dev/null || true
  else
    tag="✅运行正常"
    clear_inject_error 2>/dev/null || true
  fi
  write_runtime_status "$phase" "$apex_ok" "$tag"
  update_module_description
}

# service 阶段：zygote / 命名空间偶发未就绪，退避重试后再判失败
verify_store_with_backoff() {
  delays="0 2 5 10"
  attempt=0
  for delay in $delays; do
    attempt=$((attempt + 1))
    [ "$delay" -gt 0 ] && sleep "$delay"
    apex_ok=$(check_store_injected)
    if [ "$apex_ok" != "0" ]; then
      [ "$attempt" -gt 1 ] && \
        log_msg "status: verify ok after retry #$attempt (waited ${delay}s)"
      echo "$apex_ok"
      return 0
    fi
    log_msg "status: verify soft-fail attempt #$attempt (apex_ok=0)"
  done
  echo 0
}

# 延迟自愈：开机稍后再次实测；仅在仍为失败缓存时写回成功
heal_runtime_status_later() {
  delay_sec="${1:-45}"
  (
    sleep "$delay_sec"
    [ -f "$MODDIR/disable" ] && exit 0
    [ -f "$PENDING_FILE" ] && exit 0
    generation_valid || exit 0
    [ "$(count_addon_certs)" -eq 0 ] && exit 0
    runtime_status_fresh || exit 0
    cached_ok=$(read_runtime_status apex_ok)
    [ "$cached_ok" = "0" ] || exit 0
    apex_ok=$(check_store_injected)
    if [ "$apex_ok" = "0" ]; then
      log_msg "status: delayed heal still failed after ${delay_sec}s"
      exit 0
    fi
    log_msg "status: delayed heal recovered (was apex_ok=0 → $apex_ok)"
    apply_verified_runtime_status heal "$apex_ok"
  ) >/dev/null 2>&1 &
}

# 强制实测并落盘（CLI status --live / WebUI 刷新复核）
live_finalize_runtime_status() {
  phase="${1:-live}"
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
    clear_inject_error 2>/dev/null || true
    write_runtime_status "$phase" 2 "💤未启用"
    update_module_description
    return 0
  fi
  apex_ok=$(check_store_injected)
  apply_verified_runtime_status "$phase" "$apex_ok"
}

# 开机脚本在注入完成后调用：实测（service 带退避）并落盘
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
    clear_inject_error 2>/dev/null || true
    write_runtime_status "$phase" 2 "💤未启用"
    update_module_description
    return 0
  fi
  if [ "$phase" = "service" ]; then
    # 先标稳定中，避免 Magisk 列表长时间停在旧失败态
    write_runtime_status "$phase" 2 "✨稳定中"
    update_module_description
    apex_ok=$(verify_store_with_backoff)
  else
    apex_ok=$(check_store_injected)
  fi
  apply_verified_runtime_status "$phase" "$apex_ok"
}
