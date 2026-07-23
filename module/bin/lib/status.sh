#!/system/bin/sh
# 模块描述 / 状态标签 / Root 识别
# 状态以开机脚本写入的 runtime-status 为准，WebUI/管理器只读缓存，不反复 nsenter 全量探测。

DESC_BODY="将 Reqable / ProxyPin / 自定义 CA 与系统信任库安全合并；支持用户区和存储卡证书免重启挂载、无痕卸载。生成或校验失败时保持系统原始证书库。"
DESC_BODY_CORE="将 Reqable / ProxyPin / 自定义 CA 与系统信任库安全合并；生成或校验失败时保持系统原始证书库。"

get_desc_body() {
  [ -x "$BINDIR/hot_mount.sh" ] && echo "$DESC_BODY" || echo "$DESC_BODY_CORE"
}

current_boot_id() {
  tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null
}

read_runtime_status() {
  key="$1"
  [ -f "$RUNTIME_STATUS_FILE" ] || return 1
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' \
    "$RUNTIME_STATUS_FILE" 2>/dev/null | tr -d '\r'
}

runtime_status_fresh() {
  cached_boot=$(read_runtime_status boot_id)
  [ -n "$cached_boot" ] && [ "$cached_boot" = "$(current_boot_id)" ]
}

# phase: post-fs-data | service | manual
# apex_ok: 0|1|2  （同 check_store_injected）
write_runtime_status() {
  phase="$1"
  apex_ok="$2"
  tag="$3"
  mkdir -p "$STATEDIR" 2>/dev/null
  tmp="$RUNTIME_STATUS_FILE.tmp.$$"
  cat >"$tmp" <<EOF
boot_id=$(current_boot_id)
phase=$phase
apex_ok=$apex_ok
tag=$tag
updated_at=$(date +%s)
EOF
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$RUNTIME_STATUS_FILE"
}

detect_root_impl() {
  if [ -f "$ROOT_CACHE_FILE" ]; then
    cached=$(tr -d '\r\n' <"$ROOT_CACHE_FILE" 2>/dev/null)
    case "$cached" in
      Magisk|KernelSU|SukiSU|APatch|Unknown)
        echo "$cached"
        return 0
        ;;
    esac
  fi

  result=Unknown
  if [ "$APATCH" = "true" ] || [ -d /data/adb/ap ] || [ -f /data/adb/ap/bin/apd ]; then
    result=APatch
  elif [ "$KSU" = "true" ] || [ -d /data/adb/ksu ] || [ -f /data/adb/ksu/bin/ksud ]; then
    # 避免每次 status 都对 ksud 跑 strings
    if [ -f /data/adb/ksu/bin/ksud ] && \
        grep -aql sukisu /data/adb/ksu/bin/ksud 2>/dev/null; then
      result=SukiSU
    else
      result=KernelSU
    fi
  elif [ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] || [ -f /sbin/magisk ]; then
    result=Magisk
  fi

  mkdir -p "$STATEDIR" 2>/dev/null
  echo "$result" >"$ROOT_CACHE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$ROOT_CACHE_FILE.tmp.$$" "$ROOT_CACHE_FILE" 2>/dev/null
  echo "$result"
}

# 轻量：只看会话文件是否属于本 boot；不 nsenter（热挂载操作时会单独校验）
hot_session_recorded() {
  hot_state="$STATEDIR/hot-session.conf"
  [ -f "$hot_state" ] || return 1
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_boot=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_session" ] && [ "$hot_boot" = "$(current_boot_id)" ]
}

hot_session_active() {
  hot_session_recorded || return 1
  hot_state="$STATEDIR/hot-session.conf"
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_target=$(awk -F= '$1 == "target" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_target" ] || return 1
  actual=$(nsenter --mount=/proc/1/ns/mnt -- \
    sh -c "cat '$hot_target/certbridge_session' 2>/dev/null" 2>/dev/null | tr -d '\r\n')
  [ "$actual" = "$hot_session" ]
}

# 供开机脚本在完成注入后写入标签；默认读缓存，避免重复全量探测
compute_status_tag() {
  force_verify="${1:-0}"
  [ -f "$MODDIR/disable" ] && { echo "模块已禁用"; return 0; }

  if hot_session_recorded; then
    hot_failed=$(awk -F= '$1 == "namespace_failed" { print $2; exit }' \
      "$STATEDIR/hot-session.conf" 2>/dev/null)
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

  if [ "$force_verify" != "1" ] && runtime_status_fresh; then
    cached_tag=$(read_runtime_status tag)
    cached_phase=$(read_runtime_status phase)
    # 「注入中/启动中」只是中间态；若 service 已落盘或存在错误文件，不能一直吃缓存
    case "$cached_tag" in
      注入中|启动中|检测中)
        if [ "$cached_phase" = "service" ] || [ -f "$STATEDIR/inject-error" ]; then
          :
        else
          echo "$cached_tag"
          return 0
        fi
        ;;
      "")
        ;;
      *)
        echo "$cached_tag"
        return 0
        ;;
    esac
  fi

  if [ "$force_verify" = "1" ]; then
    [ "$(check_store_injected)" = "0" ] && {
      echo "证书注入失败"
      return 0
    }
    echo "运行正常"
    return 0
  fi

  # 本 boot 尚未写入最终状态：仍在开机流程中
  if [ -f "$STATEDIR/inject-error" ]; then
    echo "证书注入失败"
    return 0
  fi
  echo "检测中"
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
  force_verify="${1:-0}"
  tag=$(compute_status_tag "$force_verify")
  update_module_description "$tag"
  echo "$tag"
}

# 开机脚本在注入完成后调用：实测一次并落盘
finalize_runtime_status() {
  phase="$1"
  if [ -f "$MODDIR/disable" ]; then
    write_runtime_status "$phase" 2 "模块已禁用"
    update_module_description "模块已禁用"
    return 0
  fi
  if [ -f "$PENDING_FILE" ]; then
    write_runtime_status "$phase" 2 "配置待重启生效"
    update_module_description "配置待重启生效"
    return 0
  fi
  if ! generation_valid; then
    write_runtime_status "$phase" 0 "证书集合未生成"
    update_module_description "证书集合未生成"
    return 0
  fi
  if [ "$(count_addon_certs)" -eq 0 ]; then
    write_runtime_status "$phase" 2 "未启用证书"
    update_module_description "未启用证书"
    return 0
  fi
  apex_ok=$(check_store_injected)
  if [ "$apex_ok" = "0" ]; then
    tag="证书注入失败"
  else
    tag="运行正常"
  fi
  write_runtime_status "$phase" "$apex_ok" "$tag"
  update_module_description "$tag"
}
