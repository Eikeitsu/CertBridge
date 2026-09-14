# 由 status.sh 加载
# 模块列表简介与 WebUI 描述
compose_module_description() {
  # 目前所有调用点都不传参；保持 hint 为空即可避免 shellcheck 报 SC2120。
  hint=""

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
    if inject_error_present; then
      err=$(read_inject_error_field message)
      hint=$(read_inject_error_field hint)
      format_module_description "⚠️异常" "证书集未就绪" \
        "${err:-请打开 WebUI 查看说明}${hint:+ · $hint}"
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

  if inject_error_present && ! runtime_status_fresh; then
    err=$(read_inject_error_field message)
    hint=$(read_inject_error_field hint)
    format_module_description "⚠️异常" "注入失败" \
      "${err}${hint:+ · $hint}"
    return 0
  fi

  if runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    case "$cached_tag" in
      *失败*|注入异常|⚠️*|异常)
        if inject_error_present; then
          err=$(read_inject_error_field message)
          hint=$(read_inject_error_field hint)
          format_module_description "⚠️异常" "注入失败" \
            "${err}${hint:+ · $hint}"
        else
          format_module_description "⚠️异常" "注入失败" \
            "请打开 WebUI 查看说明，必要时重启后再检查"
        fi
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

# WebUI statusDesc：复用模块状态判定，仅改写「运行正常」文案
# 目标：[✅运行正常 | 已挂载:N] 当前生效：N | 名称1、名称2…
# 注意：不要对 summary 再按 | 拆分后拼接（易把整串误塞进 names）
compose_webui_running_description() {
  [ -s "$APPLIED_MAP" ] || return 1
  webui_names=""
  webui_total=0
  while IFS='|' read -r label name checksum display; do
    [ -n "$label" ] || continue
    webui_total=$((webui_total + 1))
    [ -n "$display" ] || display=$(applied_cert_fallback_display "$label" "$name")
    webui_names="${webui_names}${webui_names:+、}${display}"
  done <"$APPLIED_MAP"
  [ "$webui_total" -gt 0 ] || return 1
  echo "[✅运行正常 | 已挂载:${webui_total}] 当前生效：${webui_total} | ${webui_names}"
}

compose_webui_description() {
  desc=$(compose_module_description)
  case "$desc" in
    "[✅运行正常|"*)
      if webui_desc=$(compose_webui_running_description); then
        echo "$webui_desc"
        return 0
      fi
      ;;
  esac
  echo "$desc"
}

# WebUI / 状态短标签（可带 emoji）
