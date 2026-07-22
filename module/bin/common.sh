#!/system/bin/sh
# CertBridge - common helpers

MODDIR=${MODDIR:-${0%/*}/..}
BINDIR="$MODDIR/bin"
CONFDIR="$MODDIR/config"
DATADIR="$MODDIR/data"
STATEDIR="$DATADIR/state"
CERT_POOL="$MODDIR/certs"
BUILTIN_DIR="$CERT_POOL/builtin"
CUSTOM_DIR="$CERT_POOL/custom"
GEN_ROOT="$CERT_POOL/generation"
GEN_CURRENT="$GEN_ROOT/current"
GEN_CERTS="$GEN_CURRENT/cacerts"
GEN_ACTIVE_BOOT="$GEN_ROOT/active-boot-id"
CONF="$CONFDIR/certs.conf"
LOG_FILE="$DATADIR/install.log"
APPLIED_MAP="$STATEDIR/applied-certs.list"
APPLIED_CONF="$STATEDIR/applied.conf"
SOURCE_META="$STATEDIR/source.meta"
PENDING_FILE="$STATEDIR/reboot-required"
LOCK_DIR="$STATEDIR/write.lock"
LOCK_OWNER="$LOCK_DIR/owner"
INSTALL_BOOT_FILE="$STATEDIR/install-boot-id"
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
SYSTEM_CACERTS="/system/etc/security/cacerts"
MIN_SAFE_CERTS=10
MAX_CUSTOM_BYTES=65536
DESC_BODY="将 Reqable / ProxyPin / 自定义 CA 与系统信任库安全合并；支持用户区和存储卡证书免重启挂载、无痕卸载。生成或校验失败时保持系统原始证书库。"
DESC_BODY_CORE="将 Reqable / ProxyPin / 自定义 CA 与系统信任库安全合并；生成或校验失败时保持系统原始证书库。"

get_desc_body() {
  [ -x "$BINDIR/hot_mount.sh" ] && echo "$DESC_BODY" || echo "$DESC_BODY_CORE"
}

log_msg() {
  mkdir -p "$DATADIR" 2>/dev/null
  if [ -f "$LOG_FILE" ]; then
    size=$(wc -c <"$LOG_FILE" 2>/dev/null)
    [ "${size:-0}" -gt 524288 ] && mv -f "$LOG_FILE" "$LOG_FILE.1" 2>/dev/null
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$LOG_FILE"
}

get_api() {
  api=$(getprop ro.build.version.sdk)
  [ -n "$api" ] || api=24
  echo "$api"
}

get_target_store() {
  if [ "$(get_api)" -ge 34 ] && [ -d "$APEX_CACERTS" ]; then
    echo "$APEX_CACERTS"
  else
    echo "$SYSTEM_CACERTS"
  fi
}

# API 34+：Conscrypt 走 APEX，同时注入 system 供 Reqable/Flutter 等检测与旧客户端。
# 仅运行时 bind，不写模块 system/cacerts，避免 Magic Mount 遮蔽整库。
list_target_stores() {
  seen="|"
  if [ "$(get_api)" -ge 34 ]; then
    if [ -d "$APEX_CACERTS" ]; then
      echo "$APEX_CACERTS"
      seen="$seen$APEX_CACERTS|"
    fi
    for apex_dir in /apex/com.android.conscrypt@*/cacerts; do
      [ -d "$apex_dir" ] || continue
      case "$seen" in *"|$apex_dir|"*) continue ;; esac
      echo "$apex_dir"
      seen="$seen$apex_dir|"
    done
  fi
  if [ -d "$SYSTEM_CACERTS" ]; then
    case "$seen" in *"|$SYSTEM_CACERTS|"*) ;; *)
      echo "$SYSTEM_CACERTS"
      ;;
    esac
  fi
}

read_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

write_conf() {
  key="$1"
  value="$2"
  case "$key" in reqable|proxypin|schema_version) ;; *) return 1 ;; esac
  mkdir -p "$CONFDIR" 2>/dev/null
  tmp="$CONF.tmp.$$"
  if [ -f "$CONF" ]; then
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$CONF" >"$tmp" || return 1
  else
    echo "$key=$value" >"$tmp" || return 1
  fi
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$CONF"
}

acquire_write_lock() {
  mkdir -p "$STATEDIR" 2>/dev/null
  lock_boot=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  lock_start=$(awk '{print $22}' "/proc/$$/stat" 2>/dev/null)
  lock_identity="$$|$lock_boot|$lock_start"
  tries=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    tries=$((tries + 1))
    lock_record=$(cat "$LOCK_OWNER" 2>/dev/null)
    lock_pid=$(echo "$lock_record" | cut -d'|' -f1)
    lock_record_boot=$(echo "$lock_record" | cut -d'|' -f2)
    lock_record_start=$(echo "$lock_record" | cut -d'|' -f3)
    lock_live_start=""
    case "$lock_pid" in *[!0-9]*|"") ;; *)
      lock_live_start=$(awk '{print $22}' "/proc/$lock_pid/stat" 2>/dev/null)
      ;;
    esac
    lock_stale=0
    if [ -n "$lock_record" ]; then
      if [ "$lock_record_boot" != "$lock_boot" ] || [ -z "$lock_live_start" ] || \
          [ "$lock_live_start" != "$lock_record_start" ]; then
        lock_stale=1
      fi
    fi
    if [ "$lock_stale" -eq 1 ]; then
      rm -f "$LOCK_OWNER" 2>/dev/null
      rmdir "$LOCK_DIR" 2>/dev/null
      continue
    fi
    if [ -z "$lock_record" ] && [ "$tries" -ge 2 ]; then
      rmdir "$LOCK_DIR" 2>/dev/null && continue
    fi
    [ "$tries" -ge 5 ] && return 1
    sleep 1
  done
  echo "$lock_identity" >"$LOCK_OWNER" || {
    rmdir "$LOCK_DIR" 2>/dev/null
    return 1
  }
  chmod 0600 "$LOCK_OWNER" 2>/dev/null
}

release_write_lock() {
  lock_boot=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  lock_start=$(awk '{print $22}' "/proc/$$/stat" 2>/dev/null)
  lock_identity="$$|$lock_boot|$lock_start"
  [ "$(cat "$LOCK_OWNER" 2>/dev/null)" = "$lock_identity" ] || return 1
  rm -f "$LOCK_OWNER" 2>/dev/null
  rmdir "$LOCK_DIR" 2>/dev/null
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
  [ "$actual_ctx" = "$ctx" ]
}

is_enabled() {
  [ "$(read_conf "$1" "1")" = "1" ]
}

is_cert_filename() {
  name="$1"
  stem=${name%%.*}
  suffix=${name#*.}
  [ "$stem" != "$name" ] || return 1
  [ "${#stem}" -eq 8 ] || return 1
  case "$stem" in *[!0-9a-fA-F]*) return 1 ;; esac
  [ -n "$suffix" ] || return 1
  case "$suffix" in *[!0-9]*) return 1 ;; esac
  return 0
}

count_certs() {
  dir="$1"
  n=0
  for cert in "$dir"/*.*; do
    [ -f "$cert" ] || continue
    is_cert_filename "$(basename "$cert")" && n=$((n + 1))
  done
  echo "$n"
}

copy_cert_store() {
  src="$1"
  dest="$2"
  [ -d "$src" ] || return 1
  source_n=$(count_certs "$src")
  [ "$source_n" -ge "$MIN_SAFE_CERTS" ] || return 1
  mkdir -p "$dest" 2>/dev/null || return 1
  for cert in "$src"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    cp -f "$cert" "$dest/$name" 2>/dev/null || return 1
  done
  [ "$(count_certs "$dest")" -eq "$source_n" ]
}

source_identity() {
  src="$1"
  echo "fingerprint=$(getprop ro.build.fingerprint)"
  echo "security_patch=$(getprop ro.build.version.security_patch)"
  echo "api=$(get_api)"
  echo "source=$src"
  echo "source_count=$(count_certs "$src")"
  checksum=$(
    for cert in "$src"/*.*; do
      [ -f "$cert" ] || continue
      name=$(basename "$cert")
      is_cert_filename "$name" || continue
      cksum "$cert" 2>/dev/null
    done | sort | cksum | awk '{print $1 ":" $2}'
  )
  echo "source_checksum=${checksum:-unknown}"
}

next_collision_name() {
  src="$1"
  dest="$2"
  preferred="$3"
  stem=${preferred%%.*}
  seq=0
  while [ "$seq" -lt 100 ]; do
    candidate="$stem.$seq"
    if [ ! -f "$dest/$candidate" ]; then
      echo "$candidate"
      return 0
    fi
    if cmp -s "$src" "$dest/$candidate" 2>/dev/null; then
      echo "$candidate"
      return 0
    fi
    seq=$((seq + 1))
  done
  return 1
}

install_one_addon() {
  src="$1"
  dest="$2"
  label="$3"
  name=$(next_collision_name "$src" "$dest" "$(basename "$src")") || return 1
  [ -f "$dest/$name" ] || cp -f "$src" "$dest/$name" 2>/dev/null || return 1
  checksum=$(cksum "$dest/$name" 2>/dev/null | awk '{print $1 ":" $2}')
  [ -n "$checksum" ] || return 1
  echo "$label|$name|$checksum" >>"$MAP_TMP"
}

install_addon_certs_into() {
  dest="$1"
  MAP_TMP="$2"
  : >"$MAP_TMP" || return 1
  if is_enabled reqable && [ -f "$BUILTIN_DIR/reqable/833e2479.0" ]; then
    install_one_addon "$BUILTIN_DIR/reqable/833e2479.0" "$dest" reqable || return 1
  fi
  if is_enabled proxypin && [ -f "$BUILTIN_DIR/proxypin/243f0bfb.0" ]; then
    install_one_addon "$BUILTIN_DIR/proxypin/243f0bfb.0" "$dest" proxypin || return 1
  fi
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    install_one_addon "$cert" "$dest" "custom:$name" || return 1
  done
}

count_addon_certs() {
  n=0
  is_enabled reqable && [ -f "$BUILTIN_DIR/reqable/833e2479.0" ] && n=$((n + 1))
  is_enabled proxypin && [ -f "$BUILTIN_DIR/proxypin/243f0bfb.0" ] && n=$((n + 1))
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    is_cert_filename "$(basename "$cert")" && n=$((n + 1))
  done
  echo "$n"
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

generation_is_mounted() {
  generation_id=$(path_identity "$GEN_CERTS")
  [ -n "$generation_id" ] || return 1
  generation_seen="|"
  for generation_proc in /proc/[0-9]*; do
    [ -d "$generation_proc/ns" ] || continue
    generation_pid=${generation_proc##*/}
    generation_ns=$(readlink "$generation_proc/ns/mnt" 2>/dev/null)
    [ -n "$generation_ns" ] || continue
    case "$generation_seen" in *"|$generation_ns|"*) continue ;; esac
    generation_seen="$generation_seen$generation_ns|"
    for generation_target in $(list_target_stores); do
      [ "$(namespace_path_identity "$generation_pid" "$generation_target")" = "$generation_id" ] && return 0
      generation_mount_state=$(nsenter --mount=/proc/"$generation_pid"/ns/mnt -- \
        awk -v target="$generation_target" \
          -v source="$GEN_CERTS" \
          -v adb_source="/adb/modules/CertBridge/certs/generation/current/cacerts" \
          -v module_source="/CertBridge/certs/generation/current/cacerts" '
          $5 == target && (
            index($0, source) > 0 ||
            index($0, adb_source) > 0 ||
            index($0, module_source) > 0
          ) { found=1 }
          END { print found ? "mounted" : "clear" }
        ' /proc/self/mountinfo 2>/dev/null)
      [ "$generation_mount_state" = "mounted" ] && return 0
      [ "$generation_mount_state" = "clear" ] || return 0
    done
  done
  return 1
}

build_boot_generation() {
  target=$(get_target_store)
  boot_id=$(tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null)
  previous_boot_id=$(cat "$GEN_CURRENT/boot-id" 2>/dev/null | tr -d '\r\n')
  [ -n "$previous_boot_id" ] || previous_boot_id=$(cat "$GEN_ACTIVE_BOOT" 2>/dev/null | tr -d '\r\n')
  [ -n "$previous_boot_id" ] || \
    previous_boot_id=$(grep '^boot_id=' "$SOURCE_META" 2>/dev/null | cut -d= -f2-)
  if [ -n "$boot_id" ] && [ "$boot_id" = "$previous_boot_id" ] && \
      generation_valid && verify_direct_store "$target"; then
    log_msg "generation: already active for this boot, skip rebuild"
    return 0
  fi
  if [ -d "$GEN_CURRENT" ]; then
    if generation_is_mounted; then
      log_msg "generation: current source is still mounted, refuse replacement"
      return 1
    fi
    if [ -z "$previous_boot_id" ]; then
      install_boot_id=$(cat "$INSTALL_BOOT_FILE" 2>/dev/null | tr -d '\r\n')
      if [ -z "$install_boot_id" ] || [ "$install_boot_id" = "$boot_id" ]; then
        log_msg "generation: source lifecycle unknown, preserve until reboot"
        return 1
      fi
    elif [ "$previous_boot_id" = "$boot_id" ]; then
      log_msg "generation: invalid same-boot source preserved"
      return 1
    fi
  fi
  source_n=$(count_certs "$target")
  [ "$source_n" -ge "$MIN_SAFE_CERTS" ] || {
    log_msg "generation: live source too small ($source_n), refuse build"
    return 1
  }

  stage="$GEN_ROOT/.new.$$"
  certs="$stage/cacerts"
  map_tmp="$stage/applied-certs.list"
  meta_tmp="$stage/source.meta"
  rm -rf "$stage" 2>/dev/null
  mkdir -p "$certs" "$STATEDIR" || return 1

  copy_cert_store "$target" "$certs" || {
    log_msg "generation: failed to copy live source"
    rm -rf "$stage"
    return 1
  }
  install_addon_certs_into "$certs" "$map_tmp" || {
    log_msg "generation: failed to add module certificates"
    rm -rf "$stage"
    return 1
  }

  total=$(count_certs "$certs")
  [ "$total" -ge "$source_n" ] || {
    log_msg "generation: total $total < source $source_n"
    rm -rf "$stage"
    return 1
  }
  while IFS='|' read -r label name checksum; do
    [ -n "$name" ] || continue
    [ -f "$certs/$name" ] || {
      log_msg "generation: missing applied cert $label/$name"
      rm -rf "$stage"
      return 1
    }
  done <"$map_tmp"

  source_identity "$target" >"$meta_tmp"
  echo "boot_id=$boot_id" >>"$meta_tmp"
  echo "$boot_id" >"$stage/boot-id"
  chown -R 0:0 "$stage" 2>/dev/null
  chmod 0755 "$stage" "$certs" 2>/dev/null
  chmod 0644 "$certs"/*.* 2>/dev/null
  chmod 0600 "$map_tmp" "$meta_tmp" "$stage/boot-id" 2>/dev/null
  set_selinux_context "$target" "$certs" || {
    log_msg "generation: SELinux context verification failed"
    rm -rf "$stage"
    return 1
  }
  echo "complete=1" >"$stage/complete"
  chmod 0600 "$stage/complete"

  rm -rf "$GEN_CURRENT" 2>/dev/null
  mv "$stage" "$GEN_CURRENT" || {
    log_msg "generation: atomic publish failed"
    rm -rf "$stage"
    return 1
  }
  cp -f "$GEN_CURRENT/applied-certs.list" "$APPLIED_MAP"
  cp -f "$GEN_CURRENT/source.meta" "$SOURCE_META"
  GEN_BOOT_TMP="$GEN_ACTIVE_BOOT.tmp.$$"
  cp -f "$GEN_CURRENT/boot-id" "$GEN_BOOT_TMP" && mv -f "$GEN_BOOT_TMP" "$GEN_ACTIVE_BOOT"
  cp -f "$CONF" "$APPLIED_CONF" 2>/dev/null || : >"$APPLIED_CONF"
  chmod 0600 "$APPLIED_MAP" "$SOURCE_META" "$APPLIED_CONF" 2>/dev/null
  rm -f "$PENDING_FILE"
  log_msg "generation: source=$source_n total=$total addons=$(count_addon_certs)"
  return 0
}

generation_valid() {
  [ -f "$GEN_CURRENT/complete" ] || return 1
  source_n=$(grep '^source_count=' "$SOURCE_META" 2>/dev/null | cut -d= -f2)
  [ "${source_n:-0}" -ge "$MIN_SAFE_CERTS" ] || return 1
  [ "$(count_certs "$GEN_CERTS")" -ge "$source_n" ] || return 1
  [ -f "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum; do
    [ -n "$name" ] || continue
    [ -f "$GEN_CERTS/$name" ] || return 1
    actual=$(cksum "$GEN_CERTS/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}

mark_reboot_required() {
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "配置已变更，重启后生效" >"$PENDING_FILE"
  chmod 0600 "$PENDING_FILE" 2>/dev/null
}

get_applied_name() {
  grep -m1 "^$1|" "$APPLIED_MAP" 2>/dev/null | cut -d'|' -f2
}

is_addon_applied() {
  [ -n "$(get_applied_name "$1")" ]
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

verify_namespace_store() {
  pid="$1"
  target="$2"
  expected=$(count_certs "$GEN_CERTS")
  [ "$expected" -ge "$MIN_SAFE_CERTS" ] || return 1
  n=$(nsenter --mount=/proc/"$pid"/ns/mnt -- sh -c "ls -1 '$target'/*.* 2>/dev/null | wc -l" 2>/dev/null)
  n=$(echo "$n" | tr -d ' ')
  [ "${n:-0}" -eq "$expected" ] || return 1
  while IFS='|' read -r label name checksum; do
    [ -n "$name" ] || continue
    actual=$(nsenter --mount=/proc/"$pid"/ns/mnt -- cksum "$target/$name" 2>/dev/null | \
      awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}

verify_direct_store() {
  target="$1"
  expected=$(count_certs "$GEN_CERTS")
  [ "$expected" -ge "$MIN_SAFE_CERTS" ] || return 1
  [ "$(count_certs "$target")" -eq "$expected" ] || return 1
  while IFS='|' read -r label name checksum; do
    [ -n "$name" ] || continue
    actual=$(cksum "$target/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}

check_store_injected() {
  [ -s "$APPLIED_MAP" ] || { echo 2; return 0; }
  for target in $(list_target_stores); do
    verify_namespace_store 1 "$target" || { echo 0; return 0; }
    for zygote in zygote zygote64; do
      for pid in $(pidof "$zygote" 2>/dev/null); do
        verify_namespace_store "$pid" "$target" || { echo 0; return 0; }
      done
    done
  done
  [ "$(get_api)" -ge 34 ] && echo 1 || echo 2
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
