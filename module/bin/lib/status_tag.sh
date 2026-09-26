#!/system/bin/sh
# 由 status.sh 加载
# 短标签与 module.prop 刷新

# stdout: ✅运行正常 · N 张（或无张数的运行正常）
format_running_ok_tag() {
  n=""
  if summary=$(compose_applied_cert_summary); then
    parse_cert_summary "$summary"
    n=$_sum_n
  fi
  case "$n" in
    ""|*[!0-9]*) n=$(count_applied_certs) ;;
  esac
  case "$n" in
    ""|*[!0-9]*|0) i18n_msg status.tag_ok ;;
    *) i18n_fmt status.tag_ok_n n="$n" ;;
  esac
}

# 缓存标签是否可直接展示
status_tag_cache_usable() {
  _tag="$1"
  case "$_tag" in
    "") return 1 ;;
    *运行正常*|*OK*|✅*)
      case "$_tag" in
        *[0-9]*|✅*) return 0 ;;
        *) return 1 ;;
      esac
      ;;
    *) return 0 ;;
  esac
}

compute_status_tag() {
  force_verify="${1:-0}"
  [ -f "$MODDIR/disable" ] && { i18n_msg status.tag_disabled; return 0; }

  if [ -f "$STATEDIR/hot-update" ]; then
    clear_stale_hot_update_marker || { i18n_msg status.tag_hot_update; return 0; }
  fi

  if hot_session_recorded; then
    hot_failed=$(awk -F= '$1 == "namespace_failed" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    hot_added=$(awk -F= '$1 == "added_count" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    if [ "${hot_failed:-0}" -gt 0 ]; then
      i18n_fmt status.tag_hot_partial n="${hot_added:-0}"
    elif [ -f "$PENDING_FILE" ]; then
      i18n_fmt status.tag_hot_pending n="${hot_added:-0}"
    else
      i18n_fmt status.tag_hot n="${hot_added:-0}"
    fi
    return 0
  fi

  [ -f "$PENDING_FILE" ] && { i18n_msg status.tag_pending; return 0; }
  generation_valid || {
    [ -f "$STATEDIR/inject-error" ] && { i18n_msg status.tag_error; return 0; }
    i18n_msg status.tag_detect
    return 0
  }
  [ "$(count_addon_certs)" -eq 0 ] && { i18n_msg status.tag_idle; return 0; }

  if [ "$force_verify" != "1" ] && runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    cached_phase=$(read_runtime_status phase)
    case "$cached_tag" in
      *注入*|*Inject*|*启动*|*Boot*|*检测*|*Check*|*稳定*|*Stable*|✨*|🔎*)
        if inject_error_present && ! printf '%s' "$cached_tag" | grep -qE '稳定|Stable'; then
          :
        elif printf '%s' "$cached_tag" | grep -qE '稳定|Stable'; then
          i18n_msg status.tag_stable
          return 0
        elif [ "$cached_phase" = "service" ]; then
          :
        else
          i18n_msg status.tag_inject
          return 0
        fi
        ;;
      "")
        ;;
      *)
        if status_tag_cache_usable "$cached_tag"; then
          echo "$cached_tag"
          return 0
        fi
        format_running_ok_tag
        return 0
        ;;
    esac
  fi

  if [ "$force_verify" = "1" ]; then
    [ "$(check_store_injected)" = "0" ] && {
      i18n_msg status.tag_error
      return 0
    }
    format_running_ok_tag
    return 0
  fi

  if inject_error_present; then
    i18n_msg status.tag_error
    return 0
  fi

  # 无新鲜 runtime 缓存时：用已应用证书乐观展示，避免 WebUI 首屏卡在「检测中」再触发 --live
  format_running_ok_tag
}

update_module_description() {
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || return 0
  if is_quiet_prop 2>/dev/null; then
    desc="$(desc_intro)"
  else
    desc=$(compose_module_description)
  fi
  # 同步 name 到当前语言品牌
  name=$(i18n_msg status.prop_name 2>/dev/null || echo CertBridge)
  tmp="$prop.tmp.$$"
  awk -F= -v desc="$desc" -v name="$name" '
    BEGIN { d=0; n=0 }
    $1 == "description" { print "description=" desc; d=1; next }
    $1 == "name" { print "name=" name; n=1; next }
    { print }
    END {
      if (!n) print "name=" name
      if (!d) print "description=" desc
    }
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
    tag=$(i18n_msg status.tag_disabled)
  elif hot_session_recorded 2>/dev/null; then
    tag=$(i18n_fmt status.tag_hot n="")
  elif [ -f "$PENDING_FILE" ]; then
    tag=$(i18n_msg status.tag_pending)
  else
    tag=$(i18n_msg status.tag_inject)
  fi
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || {
    echo "$tag"
    return 0
  }
  if is_quiet_prop 2>/dev/null; then
    desc="$(desc_intro)"
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
  echo "[${tag}] $(desc_intro)"
}

# 将实测结果写成 tag / 错误态并落盘（finalize / live 复核共用）
apply_verified_runtime_status() {
  phase="$1"
  apex_ok="$2"
  if [ "$apex_ok" = "0" ]; then
    tag=$(i18n_msg status.tag_error)
    if [ "$phase" = "service" ] || [ "$phase" = "heal" ] || [ "$phase" = "live" ]; then
      ensure_inject_error_diagnosed 2>/dev/null || true
    elif ! inject_error_present; then
      write_inject_error verify_failed 2>/dev/null || true
    fi
  elif summary=$(compose_applied_cert_summary) || [ "$(count_applied_certs)" -gt 0 ]; then
    tag=$(format_running_ok_tag)
    clear_inject_error 2>/dev/null || true
  else
    tag=$(i18n_msg status.tag_ok)
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
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_disabled)"
    update_module_description
    return 0
  fi
  if [ -f "$PENDING_FILE" ]; then
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_pending)"
    update_module_description
    return 0
  fi
  if ! generation_valid; then
    write_runtime_status "$phase" 0 "$(i18n_msg status.tag_error)"
    update_module_description
    return 0
  fi
  if [ "$(count_addon_certs)" -eq 0 ]; then
    clear_inject_error 2>/dev/null || true
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_idle)"
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
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_disabled)"
    update_module_description
    return 0
  fi
  if [ -f "$PENDING_FILE" ]; then
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_pending)"
    update_module_description
    return 0
  fi
  if ! generation_valid; then
    write_runtime_status "$phase" 0 "$(i18n_msg status.tag_error)"
    update_module_description
    return 0
  fi
  if [ "$(count_addon_certs)" -eq 0 ]; then
    clear_inject_error 2>/dev/null || true
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_idle)"
    update_module_description
    return 0
  fi
  if [ "$phase" = "service" ]; then
    write_runtime_status "$phase" 2 "$(i18n_msg status.tag_stable)"
    update_module_description
    if service_should_probe; then
      apex_ok=$(verify_store_with_backoff)
    else
      apex_ok=$(check_store_injected)
    fi
  else
    apex_ok=$(check_store_injected)
  fi
  apply_verified_runtime_status "$phase" "$apex_ok"
}
