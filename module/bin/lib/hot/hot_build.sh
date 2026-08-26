# 由 hot_mount.sh 加载；勿单独执行
# 临时会话证书集合构建
hot_build_generation() {
  HOT_MODE="$1"
  HOT_SD_PATH="$2"
  HOT_TARGET=$(get_target_store)
  HOT_LIVE_SOURCE="/proc/1/root$HOT_TARGET"
  HOT_BASE_COUNT=$(count_certs "$HOT_LIVE_SOURCE")
  if [ "$HOT_BASE_COUNT" -lt "$MIN_SAFE_CERTS" ]; then
    HOT_LIVE_SOURCE="$HOT_TARGET"
    HOT_BASE_COUNT=$(count_certs "$HOT_LIVE_SOURCE")
  fi
  [ "$HOT_BASE_COUNT" -ge "$MIN_SAFE_CERTS" ] || return 1
  HOT_OPENSSL=$(find_openssl) || return 2

  HOT_STAGE="$HOT_ROOT/.new.$$"
  HOT_STAGE_CERTS="$HOT_STAGE/cacerts"
  HOT_STAGE_MAP="$HOT_STAGE/hot-certs.list"
  HOT_STAGE_LEDGER="$HOT_STAGE/mounts.list"
  rm -rf "$HOT_STAGE" 2>/dev/null
  mkdir -p "$HOT_STAGE_CERTS" || return 1
  copy_cert_store "$HOT_LIVE_SOURCE" "$HOT_STAGE_CERTS" || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  # 热挂载必须保留已启用的永久 addon，避免用「原版+用户证」盖掉 Reqable/ProxyPin
  HOT_ADDON_MAP="$HOT_STAGE/addon-certs.list"
  if ! install_addon_certs_into "$HOT_STAGE_CERTS" "$HOT_ADDON_MAP"; then
    log_error "hot: failed to merge enabled permanent certificates"
    rm -rf "$HOT_STAGE"
    return 1
  fi
  : >"$HOT_STAGE_MAP"
  : >"$HOT_STAGE_LEDGER"
  HOT_ADDED=0
  HOT_SKIPPED=0

  case "$HOT_MODE" in
    user)
      hot_add_user_certs "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      ;;
    sd)
      hot_add_sd_certs "$HOT_SD_PATH" "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      ;;
    all)
      hot_add_user_certs "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      hot_add_sd_certs "$HOT_SD_PATH" "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      ;;
    *) rm -rf "$HOT_STAGE"; return 1 ;;
  esac
  [ "$HOT_ADDED" -gt 0 ] || {
    rm -rf "$HOT_STAGE"
    return 3
  }

  HOT_SESSION="$(date +%s)-$$-$(hot_boot_id)"
  echo "$HOT_SESSION" >"$HOT_STAGE_CERTS/$HOT_MARKER"
  HOT_TOTAL=$(count_certs "$HOT_STAGE_CERTS")
  [ "$HOT_TOTAL" -ge "$HOT_BASE_COUNT" ] || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  HOT_SOURCE_ID=$(stat -c '%d:%i' "$HOT_STAGE_CERTS" 2>/dev/null | tr -d '\r\n')
  [ -n "$HOT_SOURCE_ID" ] || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  chown -R 0:0 "$HOT_STAGE" 2>/dev/null
  chmod 0755 "$HOT_STAGE" "$HOT_STAGE_CERTS" 2>/dev/null
  chmod 0644 "$HOT_STAGE_CERTS"/* "$HOT_STAGE_MAP" 2>/dev/null
  set_selinux_context "$HOT_TARGET" "$HOT_STAGE_CERTS" || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  cat >"$HOT_STAGE/session.conf" <<EOF
session_id=$HOT_SESSION
boot_id=$(hot_boot_id)
boot_epoch=$(tr -d '\r\n' <"$BOOT_EPOCH_FILE" 2>/dev/null)
target=$HOT_TARGET
mode=$HOT_MODE
sd_path=$HOT_SD_PATH
base_count=$HOT_BASE_COUNT
store_count=$HOT_TOTAL
added_count=$HOT_ADDED
skipped_count=$HOT_SKIPPED
source_identity=$HOT_SOURCE_ID
namespace_count=0
namespace_failed=0
EOF
  chmod 0600 "$HOT_STAGE/session.conf" "$HOT_STAGE_MAP" "$HOT_STAGE_LEDGER" 2>/dev/null

  rm -rf "$HOT_CURRENT" 2>/dev/null
  mv "$HOT_STAGE" "$HOT_CURRENT" || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  HOT_STATE_TMP="$HOT_STATE.tmp.$$"
  cp -f "$HOT_CURRENT/session.conf" "$HOT_STATE_TMP" || return 1
  chmod 0600 "$HOT_STATE_TMP"
  mv -f "$HOT_STATE_TMP" "$HOT_STATE" || return 1
}
