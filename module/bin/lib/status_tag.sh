# 由 status.sh 加载
# 短标签与 module.prop 刷新
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
        if [ "$cached_phase" = "service" ] || inject_error_present; then
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
  desc=$(compose_module_description)
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
  # 复用 update_module_description 需要 compute 结果；直接写 pending 友好短签
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || {
    echo "$tag"
    return 0
  }
  desc=$(compose_module_prop_description_light "$tag" 2>/dev/null || echo "$tag")
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
    clear_inject_error 2>/dev/null || true
    write_runtime_status "$phase" 2 "💤未启用"
    update_module_description
    return 0
  fi
  apex_ok=$(check_store_injected)
  if [ "$apex_ok" = "0" ]; then
    tag="⚠️异常"
    # service 阶段才做细化诊断（post-fs zygote 常未就绪）
    if [ "$phase" = "service" ]; then
      ensure_inject_error_diagnosed 2>/dev/null || true
    elif ! inject_error_present; then
      write_inject_error verify_failed 2>/dev/null || true
    fi
  elif summary=$(compose_applied_cert_summary); then
    n=${summary%%|*}
    tag="✅运行正常 · ${n} 张"
    [ "$phase" = "service" ] && clear_inject_error 2>/dev/null || true
  else
    tag="✅运行正常"
    [ "$phase" = "service" ] && clear_inject_error 2>/dev/null || true
  fi
  write_runtime_status "$phase" "$apex_ok" "$tag"
  update_module_description
}
