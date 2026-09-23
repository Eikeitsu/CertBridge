#!/system/bin/sh
# 由 status.sh 加载
# 模块列表简介与 WebUI 描述（文案走 i18n）
compose_module_description() {
  hint=""

  if [ -f "$MODDIR/disable" ]; then
    format_module_description "$(i18n_msg status.tag_disabled)" "$(i18n_msg status.body_disabled)" \
      "$(i18n_msg status.body_disabled_hint)"
    return 0
  fi

  if [ -f "$STATEDIR/hot-update" ]; then
    if ! clear_stale_hot_update_marker; then
      format_module_description "$(i18n_msg status.tag_hot_update)" "$(i18n_msg status.body_hot_update)" \
        "$(i18n_msg status.body_hot_update_hint)"
      return 0
    fi
  fi

  if hot_session_recorded; then
    hot_added=$(awk -F= '$1 == "added_count" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    hot_failed=$(awk -F= '$1 == "namespace_failed" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
    hot_label=$(hot_mode_label)
    hot_added=${hot_added:-0}
    outer=$(i18n_fmt status.body_hot_outer label="$hot_label")
    [ "${hot_failed:-0}" -gt 0 ] && outer="${outer}$(i18n_msg status.body_hot_partial)"
    [ -f "$PENDING_FILE" ] && outer="${outer}$(i18n_msg status.body_hot_pending)"
    format_module_description "$(i18n_fmt status.tag_hot n="$hot_added")" "tmp:${hot_added}" "$outer"
    return 0
  fi

  if [ -f "$PENDING_FILE" ]; then
    if summary=$(compose_pending_cert_summary); then
      parse_cert_summary "$summary"
      format_module_description "$(i18n_msg status.tag_pending)" "pending:${_sum_n}" "$_sum_names"
    else
      format_module_description "$(i18n_msg status.tag_pending)" "" "$(desc_intro)"
    fi
    return 0
  fi

  if ! generation_valid; then
    if inject_error_present; then
      err=$(read_inject_error_field message)
      hint=$(read_inject_error_field hint)
      format_module_description "$(i18n_msg status.tag_error)" "" \
        "${err:-$(desc_intro)}${hint:+ · $hint}"
    else
      format_module_description "$(i18n_msg status.tag_detect)" "$(i18n_msg status.body_detect)" "$(desc_intro)"
    fi
    return 0
  fi

  if [ "$(count_addon_certs)" -eq 0 ]; then
    format_module_description "$(i18n_msg status.tag_idle)" "" "$(desc_intro)"
    return 0
  fi

  if inject_error_present && ! runtime_status_fresh; then
    err=$(read_inject_error_field message)
    hint=$(read_inject_error_field hint)
    format_module_description "$(i18n_msg status.tag_error)" "" \
      "${err}${hint:+ · $hint}"
    return 0
  fi

  if runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    case "$cached_tag" in
      *失败*|*Error*|⚠️*|异常)
        if inject_error_present; then
          err=$(read_inject_error_field message)
          hint=$(read_inject_error_field hint)
          format_module_description "$(i18n_msg status.tag_error)" "" \
            "${err}${hint:+ · $hint}"
        else
          format_module_description "$(i18n_msg status.tag_error)" "" "$(desc_intro)"
        fi
        return 0
        ;;
      *注入*|*Inject*|*启动*|*Boot*|*检测*|*Check*|✨*|🔎*)
        cached_phase=$(read_runtime_status phase)
        if [ "$cached_phase" != "service" ]; then
          format_module_description "$(i18n_msg status.tag_inject)" "$(i18n_msg status.body_inject)" "$(desc_intro)"
          return 0
        fi
        ;;
    esac
  fi

  if summary=$(compose_applied_cert_summary); then
    parse_cert_summary "$summary"
    n=$_sum_n
    names=$_sum_names
    case "$n" in
      ""|*[!0-9]*) n=$(count_applied_certs) ;;
    esac
    format_module_description "$(i18n_msg status.tag_ok)" \
      "$(i18n_fmt status.body_mounted n="$n")" \
      "$(i18n_fmt status.body_active names="$names")"
    return 0
  fi

  format_module_description "$(i18n_msg status.tag_detect)" "$(i18n_msg status.body_detect)" "$(desc_intro)"
}

compose_webui_running_description() {
  [ -s "$APPLIED_MAP" ] || return 1
  webui_names=""
  webui_total=0
  while IFS='|' read -r label name checksum display; do
    [ -n "$label" ] || continue
    webui_total=$((webui_total + 1))
    case "$label" in
      reqable|proxypin) display=$(applied_cert_fallback_display "$label" "$name") ;;
      *) [ -n "$display" ] || display=$(applied_cert_fallback_display "$label" "$name") ;;
    esac
    webui_names="${webui_names}${webui_names:+、}${display}"
  done <"$APPLIED_MAP"
  [ "$webui_total" -gt 0 ] || return 1
  echo "[$(i18n_msg status.tag_ok)|$(i18n_fmt status.body_mounted n="$webui_total")] $(i18n_fmt status.body_active names="$webui_names")"
}

# 正常运行：直接拼 WebUI 描述，避免先 compose_module_description 再扫一遍 APPLIED_MAP
compose_webui_description_fast_ok() {
  [ -f "$MODDIR/disable" ] && return 1
  [ -f "$PENDING_FILE" ] && return 1
  hot_session_recorded 2>/dev/null && return 1
  if [ -f "$STATEDIR/hot-update" ]; then
    clear_stale_hot_update_marker || return 1
  fi
  generation_valid || return 1
  inject_error_present && return 1
  if runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    case "$cached_tag" in
      *失败*|*Error*|⚠️*|异常|*注入*|*Inject*|*启动*|*Boot*|*检测*|*Check*|✨*|🔎*|*稳定*|*Stable*)
        return 1
        ;;
    esac
  fi
  compose_webui_running_description
}

compose_webui_description() {
  if webui_desc=$(compose_webui_description_fast_ok); then
    echo "$webui_desc"
    return 0
  fi
  compose_module_description
}
