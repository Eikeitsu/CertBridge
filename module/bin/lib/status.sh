#!/system/bin/sh
# 模块描述 / 状态标签 / Root 识别

DESC_BODY="将 Reqable / ProxyPin / 自定义 CA 与系统信任库安全合并；支持用户区和存储卡证书免重启挂载、无痕卸载。生成或校验失败时保持系统原始证书库。"
DESC_BODY_CORE="将 Reqable / ProxyPin / 自定义 CA 与系统信任库安全合并；生成或校验失败时保持系统原始证书库。"

get_desc_body() {
  [ -x "$BINDIR/hot_mount.sh" ] && echo "$DESC_BODY" || echo "$DESC_BODY_CORE"
}

detect_root_impl() {
  if [ "$APATCH" = "true" ] || [ -d /data/adb/ap ] || [ -f /data/adb/ap/bin/apd ]; then
    echo APatch
  elif [ "$KSU" = "true" ] || [ -d /data/adb/ksu ] || [ -f /data/adb/ksu/bin/ksud ]; then
    if [ -f /data/adb/ksu/bin/ksud ] && strings /data/adb/ksu/bin/ksud 2>/dev/null | grep -qi sukisu; then
      echo SukiSU
    else
      echo KernelSU
    fi
  elif [ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] || [ -f /sbin/magisk ]; then
    echo Magisk
  else
    echo Unknown
  fi
}

hot_session_active() {
  hot_state="$STATEDIR/hot-session.conf"
  [ -f "$hot_state" ] || return 1
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_boot=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_target=$(awk -F= '$1 == "target" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  current_boot=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  [ -n "$hot_session" ] && [ "$hot_boot" = "$current_boot" ] && [ -n "$hot_target" ] || return 1
  actual=$(nsenter --mount=/proc/1/ns/mnt -- \
    sh -c "cat '$hot_target/certbridge_session' 2>/dev/null" 2>/dev/null | tr -d '\r\n')
  [ "$actual" = "$hot_session" ]
}

compute_status_tag() {
  [ -f "$MODDIR/disable" ] && { echo "模块已禁用"; return 0; }
  if hot_session_active; then
    hot_failed=$(awk -F= '$1 == "namespace_failed" { print $2; exit }' "$STATEDIR/hot-session.conf" 2>/dev/null)
    if [ "${hot_failed:-0}" -gt 0 ]; then
      echo "临时证书部分挂载（${hot_failed} 个命名空间失败）"
    elif [ -f "$PENDING_FILE" ]; then
      echo "临时证书已挂载，永久配置待重启"
    else
      echo "临时证书已免重启挂载"
    fi
    return 0
  fi
  [ -f "$PENDING_FILE" ] && { echo "配置待重启生效"; return 0; }
  generation_valid || { echo "证书集合未生成"; return 0; }
  [ "$(count_addon_certs)" -eq 0 ] && { echo "未启用证书"; return 0; }
  [ "$(check_store_injected)" = "0" ] && { echo "证书注入失败"; return 0; }
  echo "运行正常"
}

update_module_description() {
  tag="$1"
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || return 0
  tmp="$prop.tmp.$$"
  desc_body=$(get_desc_body)
  awk -F= -v desc="[ ${tag} ] ${desc_body}" '
    BEGIN { done=0 }
    $1 == "description" { print "description=" desc; done=1; next }
    { print }
    END { if (!done) print "description=" desc }
  ' "$prop" >"$tmp" && mv -f "$tmp" "$prop"
  chmod 0644 "$prop" 2>/dev/null
}

refresh_module_description() {
  update_module_description "$(compute_status_tag)"
}
