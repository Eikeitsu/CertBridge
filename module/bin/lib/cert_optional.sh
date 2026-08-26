# 由 common / cert_domain 加载
# 可选抓包 App / 路径预设导入与指纹列表

# 自定义区：若检测到可选抓包 App / 导出路径的现场 CA，指纹未见则导入
sync_optional_custom_apps() {
  opt_updated=0
  opt_kept=0
  opt_miss=0
  for kind in $(optional_custom_app_kinds); do
    label=$(app_cert_label "$kind")
    live=$(find_live_app_cert "$kind" 2>/dev/null) || {
      echo "optional_${kind}=miss"
      opt_miss=$((opt_miss + 1))
      continue
    }
    live_fp=$(cert_fingerprint_sha256 "$live" 2>/dev/null || true)
    matched=0
    if [ -n "$live_fp" ] && [ -d "$CUSTOM_DIR" ]; then
      for c in "$CUSTOM_DIR"/*.*; do
        [ -f "$c" ] || continue
        case "$c" in *.meta) continue ;; esac
        cfp=$(cert_fingerprint_sha256 "$c" 2>/dev/null || true)
        [ -n "$cfp" ] && [ "$cfp" = "$live_fp" ] && matched=1 && break
      done
    fi
    if [ "$matched" = "1" ]; then
      echo "optional_${kind}=unchanged"
      opt_kept=$((opt_kept + 1))
      continue
    fi
    if ! find_openssl >/dev/null 2>&1; then
      echo "optional_${kind}=openssl_unavailable"
      continue
    fi
    if name=$(import_ca_into_dir "$live" "$CUSTOM_DIR" "$label" 2>/dev/null); then
      echo "optional_${kind}=updated"
      echo "optional_${kind}_file=$name"
      opt_updated=$((opt_updated + 1))
      log_info "sync: imported $kind as custom/$name"
    else
      echo "optional_${kind}=import_failed"
    fi
  done
  echo "optional_updated=$opt_updated"
  echo "optional_kept=$opt_kept"
  echo "optional_miss=$opt_miss"
}

# 按预设 kind 从现场路径导入一张自定义 CA（WebUI 一键）
import_optional_app_preset() {
  kind="$1"
  case "$kind" in
    httpcanary|adguard|charles|mitmproxy|pcapdroid) ;;
    *)
      echo "error=invalid_preset"
      return 1
      ;;
  esac
  label=$(app_cert_label "$kind")
  live=$(find_live_app_cert "$kind" 2>/dev/null) || {
    echo "error=preset_cert_not_found"
    echo "hint=请先在对应软件中导出 CA，或放到 Download 常见文件名"
    echo "kind=$kind"
    return 1
  }
  if ! find_openssl >/dev/null 2>&1; then
    echo "error=openssl_unavailable"
    return 1
  fi
  mkdir -p "$CUSTOM_DIR"
  chmod 0700 "$CUSTOM_DIR" 2>/dev/null
  live_fp=$(cert_fingerprint_sha256 "$live" 2>/dev/null || true)
  if [ -n "$live_fp" ] && [ -d "$CUSTOM_DIR" ]; then
    for c in "$CUSTOM_DIR"/*.*; do
      [ -f "$c" ] || continue
      case "$c" in *.meta) continue ;; esac
      cfp=$(cert_fingerprint_sha256 "$c" 2>/dev/null || true)
      if [ -n "$cfp" ] && [ "$cfp" = "$live_fp" ]; then
        echo "ok=1"
        echo "unchanged=1"
        echo "kind=$kind"
        echo "file=$(basename "$c")"
        echo "path=$live"
        return 0
      fi
    done
  fi
  acquire_write_lock || {
    echo "error=busy"
    return 1
  }
  name=$(import_ca_into_dir "$live" "$CUSTOM_DIR" "$label") || {
    release_write_lock
    echo "error=import_failed"
    echo "kind=$kind"
    echo "path=$live"
    return 1
  }
  pending_line=$(note_conf_dirty)
  if is_magic_mount_mode; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  log_info "preset: imported $kind as custom/$name from $live"
  echo "ok=1"
  echo "kind=$kind"
  echo "file=$name"
  echo "path=$live"
  echo "pending_reboot=1"
  [ -n "$pending_line" ] && echo "$pending_line"
  return 0
}

# 列出当前生效集的 SHA-256 指纹（供核对 / 复制）
list_applied_fingerprints() {
  count=0
  if [ -s "$APPLIED_MAP" ] && [ -d "$GEN_CERTS" ]; then
    while IFS='|' read -r label name checksum display || [ -n "$label" ]; do
      [ -n "$name" ] || continue
      path="$GEN_CERTS/$name"
      [ -f "$path" ] || continue
      fp=$(cert_fingerprint_sha256 "$path" 2>/dev/null) || continue
      disp=$(printf '%s' "${display:-$label}" | tr '|' '/' | tr '\n' ' ')
      echo "fp|$label|$name|$fp|$disp"
      count=$((count + 1))
    done <"$APPLIED_MAP"
  fi
  echo "ok=1"
  echo "count=$count"
}
