#!/system/bin/sh
# 由 cert_manager.sh 加载
# 开关 / 同步 / 导入 / 删除
cmd_toggle() {
  name="$1"
  value="$2"
  case "$name" in reqable|proxypin) ;; *) echo "error=invalid_toggle"; return 1 ;; esac
  [ "$value" = "1" ] || [ "$value" = "0" ] || { echo "error=invalid_value"; return 1; }

  # 关闭：先快照再写 conf（sources 仍在时拷贝很快；保证立刻再开不依赖 App）
  if [ "$value" = "0" ]; then
    stash_addon_source "$name" >/dev/null 2>&1 || true
  fi

  # 开启：先恢复本地源，再尝试 App 刷新（避免 sync 失败路径弄丢已有证）
  if [ "$value" = "1" ]; then
    restore_addon_source_from_stash "$name" >/dev/null 2>&1 || true
    ensure_source_from_applied "$name" >/dev/null 2>&1 || true
    # 已有 source / builtin 时仍可尝试刷新；失败保留旧文件
    sync_source_from_app "$name" >/dev/null 2>&1 || true
    # sync 后若仍空，再恢复一次快照
    find_source_cert "$name" >/dev/null 2>&1 || \
      restore_addon_source_from_stash "$name" >/dev/null 2>&1 || true
    find_source_cert "$name" >/dev/null 2>&1 || \
      ensure_source_from_applied "$name" >/dev/null 2>&1 || true

    if ! addon_can_enable "$name"; then
      diag=$(diagnose_app_cert_import "$name" 2>/dev/null)
      diag_rc=$?
      case "$diag_rc" in
        0)
          if sync_source_from_app "$name" >/dev/null 2>&1 && addon_can_enable "$name"; then
            :
          else
            echo "error=import_failed"
            echo "hint=证书已找到但写入 sources 失败"
            return 1
          fi
          ;;
        1)
          echo "error=openssl_unavailable"
          return 1
          ;;
        2)
          echo "error=certificate_unavailable"
          echo "hint=请先在对应 App 中生成根证书，或使用自定义导入"
          return 1
          ;;
        *)
          echo "error=import_failed"
          echo "hint=找到证书文件但校验/转换失败"
          [ -n "$diag" ] && echo "$diag" | awk -F= '$1=="import_err"{print; exit}'
          return 1
          ;;
      esac
    fi
    # 仅靠 stash/applied 判定可开时，落盘到 sources，避免下次再丢
    find_addon_cert "$name" 0 >/dev/null 2>&1 || \
      restore_addon_source_from_stash "$name" >/dev/null 2>&1 || \
      ensure_source_from_applied "$name" >/dev/null 2>&1 || true
  fi

  # 写配置与 pending 互斥，避免与 status/sync 并发丢更新
  acquire_write_lock || { echo "error=busy"; return 1; }
  if ! write_conf "$name" "$value"; then
    release_write_lock
    echo "error=write_failed"
    return 1
  fi
  # 读回校验（轻量重试）：部分机写后瞬时读到旧值
  got=$(read_conf "$name" "" | tr -d ' \t\r\n')
  if [ "$got" != "$value" ]; then
    sleep 0.05 2>/dev/null || sleep 1
    got=$(read_conf "$name" "" | tr -d ' \t\r\n')
  fi
  if [ "$got" != "$value" ]; then
    release_write_lock
    echo "error=write_failed"
    return 1
  fi
  pending_line=$(note_conf_dirty)
  release_write_lock
  # 先回包成功，再做快照/日志：避免后置步骤或 bridge errno 把成功当成失败
  echo "ok=1"
  echo "${name}_enabled=$value"
  echo "pending_reboot=1"
  echo "$pending_line"
  stash_addon_source "$name" >/dev/null 2>&1 || true
  log_info "config: $name=$value (reboot required)" 2>/dev/null || true
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
  if needs_system_magic_overlay; then
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
  if needs_system_magic_overlay; then
    sync_magic_overlay "$MODDIR" >/dev/null 2>&1 || true
  fi
  release_write_lock
  log_info "custom: removed $filename (reboot required)"
  echo "ok=1"
  echo "pending_reboot=1"
  echo "$pending_line"
}
