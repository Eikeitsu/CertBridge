#!/system/bin/sh
# 由 cert_manager.sh 加载
# 开关 / 同步 / 导入 / 删除
#
# 极简开关模型：
# - 证书文件常驻 /data/adb/certbridge/addon-sources/，关开关绝不删除
# - 关 = 只写 user.conf=0（不抢锁、不播种、不快照）
# - 开 = 本地有证或能从 App/下载目录/builtin 拿到 → 写 user.conf=1

_toggle_write_user_conf() {
  name="$1"
  value="$2"
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  USER_CONF="$CB_EXT_DIR/user.conf"
  mkdir -p "$CB_EXT_DIR" 2>/dev/null || return 1
  tmp="$CB_EXT_DIR/.user.conf.$$.$name"
  if [ -f "$USER_CONF" ]; then
    grep -v "^${name}=" "$USER_CONF" >"$tmp" 2>/dev/null || : >"$tmp"
    printf '%s=%s\n' "$name" "$value" >>"$tmp" 2>/dev/null || {
      rm -f "$tmp"
      return 1
    }
  else
    printf '%s=%s\n' "$name" "$value" >"$tmp" 2>/dev/null || return 1
  fi
  chmod 0600 "$tmp" 2>/dev/null
  wrote=0
  if cp -f "$tmp" "$USER_CONF" 2>/dev/null; then
    wrote=1
  elif cat "$tmp" >"$USER_CONF" 2>/dev/null; then
    wrote=1
  elif mv -f "$tmp" "$USER_CONF" 2>/dev/null; then
    wrote=1
    tmp=""
  fi
  rm -f "$tmp" 2>/dev/null
  [ "$wrote" = "1" ] || return 1
  got=$(grep "^${name}=" "$USER_CONF" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d ' \t\r\n')
  [ "$got" = "$value" ]
}

# 开之前保证 addon-sources 有证（与安装 certbridge_install_try_app 同一套探测/同步）
addon_ensure_ready() {
  kind="$1"
  case "$kind" in reqable|proxypin) ;; *) return 1 ;; esac
  CB_EXT_DIR="${CB_EXT_DIR:-/data/adb/certbridge}"
  SOURCES_DIR="${SOURCES_DIR:-$CB_EXT_DIR/addon-sources}"
  mkdir -p "$SOURCES_DIR/$kind" 2>/dev/null || true

  find_source_cert "$kind" >/dev/null 2>&1 && return 0
  prepare_addon_local "$kind" >/dev/null 2>&1 || true
  find_source_cert "$kind" >/dev/null 2>&1 && return 0
  find_addon_cert "$kind" 0 >/dev/null 2>&1 && return 0

  # 与安装相同：diagnose → sync_source_from_app
  if sync_source_from_app "$kind" >/dev/null 2>&1; then
    find_source_cert "$kind" >/dev/null 2>&1 && return 0
  fi
  return 1
}

cmd_toggle() {
  name="$1"
  value="$2"
  case "$name" in reqable|proxypin) ;; *) echo "error=invalid_toggle"; return 1 ;; esac
  [ "$value" = "1" ] || [ "$value" = "0" ] || { echo "error=invalid_value"; return 1; }

  if [ "$value" = "0" ]; then
    if ! _toggle_write_user_conf "$name" "$value"; then
      echo "error=write_failed"
      echo "hint=无法写入 /data/adb/certbridge/user.conf"
      return 1
    fi
    echo "ok=1"
    echo "${name}_enabled=$value"
    note_conf_dirty
    return 0
  fi

  if ! addon_ensure_ready "$name"; then
    echo "error=certificate_unavailable"
    echo "hint=本地无证书且无法从 App 导入（与安装扫描相同路径）；请先在 App 生成根证书或自定义导入"
    return 1
  fi

  if ! _toggle_write_user_conf "$name" "$value"; then
    echo "error=write_failed"
    echo "hint=无法写入 /data/adb/certbridge/user.conf"
    return 1
  fi
  echo "ok=1"
  echo "${name}_enabled=$value"
  note_conf_dirty
  return 0
}

cmd_sync_apps() {
  out=$(sync_enabled_app_sources)
  echo "$out"
  updated=$(echo "$out" | awk -F= '$1 == "updated" { print $2; exit }')
  opt_out=$(sync_optional_custom_apps)
  echo "$opt_out"
  opt_updated=$(echo "$opt_out" | awk -F= '$1 == "optional_updated" { print $2; exit }')
  total_updated=$((${updated:-0} + ${opt_updated:-0}))
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
  if needs_system_magic_overlay; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  rm -f "$raw" "$normalized"
  log_info "custom: installed $name ($display)"
  echo "ok=1"
  echo "filename=$name"
  echo "display_name=$display"
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
  if needs_system_magic_overlay; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  log_info "custom: removed $filename"
  echo "ok=1"
  echo "$pending_line"
}
