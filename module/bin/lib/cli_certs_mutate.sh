# 由 cert_manager.sh 加载
# 开关 / 同步 / 导入 / 删除
cmd_toggle() {
  name="$1"
  value="$2"
  case "$name" in reqable|proxypin) ;; *) echo "error=invalid_toggle"; return 1 ;; esac
  [ "$value" = "1" ] || [ "$value" = "0" ] || { echo "error=invalid_value"; return 1; }
  # 关闭前快照当前证书，保证立刻再开不依赖 App 瞬时可读
  if [ "$value" = "0" ]; then
    stash_addon_source "$name" >/dev/null 2>&1 || true
  fi
  # 开启：App 同步 → 生效集恢复 → 快照恢复；任一成功即可写配置
  if [ "$value" = "1" ]; then
    sync_source_from_app "$name" >/dev/null 2>&1 || true
    ensure_source_from_applied "$name" >/dev/null 2>&1 || true
    restore_addon_source_from_stash "$name" >/dev/null 2>&1 || true
    if ! addon_can_enable "$name"; then
      echo "error=certificate_unavailable"
      echo "hint=请先在对应 App 中生成根证书，或使用自定义导入"
      return 1
    fi
    # 开启成功后再刷新一份快照，方便下次关开
    stash_addon_source "$name" >/dev/null 2>&1 || true
  fi
  write_conf "$name" "$value" || { echo "error=write_failed"; return 1; }
  pending_line=$(note_conf_dirty)
  log_info "config: $name=$value (reboot required)"
  log_debug "config: toggle path conf=$CONF pending=1"
  echo "ok=1"
  echo "${name}_enabled=$value"
  echo "pending_reboot=1"
  echo "$pending_line"
}

cmd_sync_apps() {
  out=$(sync_enabled_app_sources)
  echo "$out"
  updated=$(echo "$out" | awk -F= '$1 == "updated" { print $2; exit }')
  opt_out=$(sync_optional_custom_apps)
  echo "$opt_out"
  opt_updated=$(echo "$opt_out" | awk -F= '$1 == "optional_updated" { print $2; exit }')
  total_updated=$((${updated:-0} + ${opt_updated:-0}))
  # 汇总给 WebUI：含 Reqable/ProxyPin 与可选自定义导入
  echo "updated=$total_updated"
  if [ "${total_updated:-0}" -gt 0 ] 2>/dev/null; then
    pending_line=$(update_reboot_required_flag)
    echo "$pending_line"
    refresh_module_description_light >/dev/null 2>&1
  else
    refresh_module_description_light >/dev/null 2>&1
  fi
}

cmd_install_custom() {
  b64="$1"
  raw="$DATADIR/upload.$$.raw"
  normalized="$DATADIR/upload.$$.pem"
  mkdir -p "$DATADIR" "$CUSTOM_DIR"
  chmod 0700 "$DATADIR" "$CUSTOM_DIR" 2>/dev/null
  echo "$b64" | base64 -d >"$raw" 2>/dev/null || {
    rm -f "$raw" "$normalized"
    echo "error=decode_failed"
    return 1
  }
  chmod 0600 "$raw"
  size=$(wc -c <"$raw" 2>/dev/null)
  if [ "${size:-0}" -le 0 ] || [ "$size" -gt "$MAX_CUSTOM_BYTES" ]; then
    rm -f "$raw" "$normalized"
    echo "error=invalid_size"
    return 1
  fi

  openssl_cmd=$(find_openssl) || {
    rm -f "$raw" "$normalized"
    echo "error=openssl_unavailable"
    return 1
  }
  inform=""
  if $openssl_cmd x509 -in "$raw" -noout >/dev/null 2>&1; then
    inform=""
  elif $openssl_cmd x509 -inform DER -in "$raw" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  else
    rm -f "$raw" "$normalized"
    echo "error=invalid_x509"
    return 1
  fi

  $openssl_cmd x509 $inform -in "$raw" -checkend 0 -noout >/dev/null 2>&1 || {
    rm -f "$raw" "$normalized"
    echo "error=expired_certificate"
    return 1
  }
  $openssl_cmd x509 $inform -in "$raw" -noout -text 2>/dev/null | \
    grep -q 'CA:TRUE' || {
      rm -f "$raw" "$normalized"
      echo "error=not_ca_certificate"
      return 1
    }
  hash=$(openssl_subject_hash "$openssl_cmd" "$inform" "$raw") || {
    rm -f "$raw" "$normalized"
    echo "error=hash_failed"
    return 1
  }
  $openssl_cmd x509 $inform -in "$raw" -out "$normalized" >/dev/null 2>&1 || {
    rm -f "$raw" "$normalized"
    echo "error=normalize_failed"
    return 1
  }

  acquire_write_lock || { rm -f "$raw" "$normalized"; echo "error=busy"; return 1; }
  name=$(next_collision_name "$normalized" "$CUSTOM_DIR" "$hash.0") || {
    release_write_lock
    rm -f "$raw" "$normalized"
    echo "error=too_many_collisions"
    return 1
  }
  if [ ! -f "$CUSTOM_DIR/$name" ]; then
    install -m 0600 -o 0 -g 0 "$normalized" "$CUSTOM_DIR/$name" || {
      release_write_lock
      rm -f "$raw" "$normalized"
      echo "error=install_failed"
      return 1
    }
  fi
  display=$(cert_display_name_from_file "$CUSTOM_DIR/$name" "$name")
  printf 'display_name=%s\n' "$display" >"$CUSTOM_DIR/$name.meta"
  chmod 0600 "$CUSTOM_DIR/$name.meta" 2>/dev/null
  pending_line=$(note_conf_dirty)
  if is_magic_mount_mode; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  rm -f "$raw" "$normalized"
  log_info "custom: installed $name ($display, reboot required)"
  echo "ok=1"
  echo "filename=$name"
  echo "display_name=$display"
  echo "pending_reboot=1"
  echo "$pending_line"
}

cmd_remove_custom() {
  filename="$1"
  is_cert_filename "$filename" || { echo "error=invalid_filename"; return 1; }
  acquire_write_lock || { echo "error=busy"; return 1; }
  [ -f "$CUSTOM_DIR/$filename" ] || {
    release_write_lock
    echo "error=not_found"
    return 1
  }
  rm -f "$CUSTOM_DIR/$filename" "$CUSTOM_DIR/$filename.meta" || {
    release_write_lock
    echo "error=remove_failed"
    return 1
  }
  pending_line=$(note_conf_dirty)
  if is_magic_mount_mode; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  log_info "custom: removed $filename (reboot required)"
  echo "ok=1"
  echo "pending_reboot=1"
  echo "$pending_line"
}
