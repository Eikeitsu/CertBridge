# 由 common runtime 加载
# 校验失败诊断与 status 输出
diagnose_verify_failure_reason() {
  if is_magic_mount_mode; then
    if ! verify_magic_overlay_live 2>/dev/null; then
      echo magic_overlay_missing
      return 0
    fi
  fi
  for target in $(list_status_verify_targets); do
    if ! namespace_store_operational 1 "$target" 2>/dev/null; then
      echo verify_init_failed
      return 0
    fi
    for zygote in zygote zygote64; do
      pid=$(pidof "$zygote" 2>/dev/null | awk '{print $1; exit}')
      [ -n "$pid" ] || continue
      if ! namespace_store_operational "$pid" "$target" 2>/dev/null; then
        echo verify_zygote_failed
        return 0
      fi
    done
  done
  echo verify_failed
}

# 若已失败但文案过泛 / 缺失，用校验结果补全
ensure_inject_error_diagnosed() {
  if ! inject_error_present; then
    reason=$(diagnose_verify_failure_reason)
    write_inject_error "$reason"
    return 0
  fi
  reason=$(read_inject_error_field reason)
  case "$reason" in
    boot_inject_failed|namespace_failed|legacy|"")
      # 尝试用更具体的 fail 记录或校验结果细化
      if [ -f "$INJECT_FAIL_FILE" ]; then
        commit_inject_fail "$reason"
        return 0
      fi
      if [ "$reason" = "boot_inject_failed" ] || [ "$reason" = "namespace_failed" ] || \
        [ "$reason" = "legacy" ] || [ -z "$reason" ]; then
        finer=$(diagnose_verify_failure_reason)
        case "$finer" in
          verify_failed) ;;
          *)
            write_inject_error "$finer"
            ;;
        esac
      fi
      ;;
  esac
}

emit_inject_error_status() {
  if ! inject_error_present; then
    echo "inject_error=0"
    return 0
  fi
  echo "inject_error=1"
  echo "inject_reason=$(read_inject_error_field reason)"
  echo "inject_message=$(read_inject_error_field message)"
  echo "inject_hint=$(read_inject_error_field hint)"
}
