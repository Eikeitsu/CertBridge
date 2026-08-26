# 由 common 加载
# Magic Mount 覆盖层、SELinux、路径身份
sync_magic_overlay() {
  root="${1:-$MODDIR}"
  dest="$root/system/etc/security/cacerts"
  mkdir -p "$dest" || return 1
  # 清空旧叠层，避免残留 hash 或误放整库文件
  for old in "$dest"/*; do
    [ -e "$old" ] || continue
    rm -f "$old" 2>/dev/null
  done
  tmp_map="$STATEDIR/.magic-overlay.$$"
  mkdir -p "$STATEDIR" 2>/dev/null
  : >"$tmp_map"
  if [ -s "$APPLIED_MAP" ] && [ -d "$GEN_CERTS" ]; then
    while IFS='|' read -r label name checksum display; do
      [ -n "$name" ] || continue
      [ -f "$GEN_CERTS/$name" ] || continue
      cp -f "$GEN_CERTS/$name" "$dest/$name" 2>/dev/null || {
        rm -f "$tmp_map"
        return 1
      }
      echo "$label|$name|$checksum|$display" >>"$tmp_map"
    done <"$APPLIED_MAP"
  else
    install_addon_certs_into "$dest" "$tmp_map" || {
      rm -f "$tmp_map"
      return 1
    }
  fi
  chown -R 0:0 "$dest" 2>/dev/null
  chmod 0755 "$dest" 2>/dev/null
  chmod 0644 "$dest"/* 2>/dev/null
  set_selinux_context "$SYSTEM_CACERTS" "$dest" 2>/dev/null || true
  n=$(count_certs "$dest")
  rm -f "$tmp_map"
  if [ "${n:-0}" -eq 0 ]; then
    # 空目录叠层在部分 KSU 上会整目录遮蔽系统 CA，必须删掉
    clear_magic_overlay "$root"
    log_debug "magic-overlay: no addons, removed empty system overlay"
    echo 0
    return 0
  fi
  log_info "magic-overlay: synced $n addon cert(s) -> system/etc/security/cacerts"
  echo "$n"
}

clear_magic_overlay() {
  root="${1:-$MODDIR}"
  dest="$root/system/etc/security/cacerts"
  if [ -d "$dest" ]; then
    rm -rf "$dest" 2>/dev/null
    log_debug "magic-overlay: cleared $dest"
  fi
  # 若 system 树已空，顺带去掉空目录，避免无意义 Magic Mount 节点
  rmdir "$root/system/etc/security" 2>/dev/null
  rmdir "$root/system/etc" 2>/dev/null
  rmdir "$root/system" 2>/dev/null
  return 0
}

# 开机前按模式准备叠层：magic 同步 addon；compatible 清掉 system/ 叠层
prepare_mount_mode_overlay() {
  root="${1:-$MODDIR}"
  if is_magic_mount_mode; then
    sync_magic_overlay "$root" >/dev/null
  else
    clear_magic_overlay "$root"
  fi
}

verify_magic_overlay_live() {
  [ -s "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    [ -f "$SYSTEM_CACERTS/$name" ] || return 1
    actual=$(cksum "$SYSTEM_CACERTS/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}

set_selinux_context() {
  target="$1"
  dest="$2"
  [ "$(getenforce)" = "Enforcing" ] || return 0
  ctx=$(ls -Zd "$target" 2>/dev/null | awk '{print $1}')
  if [ -n "$ctx" ] && [ "$ctx" != "?" ]; then
    chcon -R "$ctx" "$dest" 2>/dev/null || return 1
  else
    ctx="u:object_r:system_security_cacerts_file:s0"
    chcon -R "$ctx" "$dest" 2>/dev/null || return 1
  fi
  actual_ctx=$(ls -Zd "$dest" 2>/dev/null | awk '{print $1}')
  # 部分机型带 MCS 类别（s0:cXX），只比较 type 段，避免误杀整次注入
  if [ "$actual_ctx" = "$ctx" ]; then
    return 0
  fi
  actual_type=$(echo "$actual_ctx" | cut -d: -f1-3)
  expect_type=$(echo "$ctx" | cut -d: -f1-3)
  [ -n "$actual_type" ] && [ "$actual_type" = "$expect_type" ]
}

path_identity() {
  stat -c '%d:%i' "$1" 2>/dev/null | tr -d '\r\n'
}

namespace_path_identity() {
  ns_pid="$1"
  ns_path="$2"
  nsenter --mount=/proc/"$ns_pid"/ns/mnt -- stat -c '%d:%i' "$ns_path" 2>/dev/null | \
    tr -d '\r\n'
}
