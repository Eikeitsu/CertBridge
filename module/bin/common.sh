#!/system/bin/sh
# CACertStore - common helpers

MODDIR=${MODDIR:-${0%/*}/..}
BINDIR="$MODDIR/bin"
CONFDIR="$MODDIR/config"
DATADIR="$MODDIR/data"
CERT_POOL="$MODDIR/certs"
BUILTIN_DIR="$CERT_POOL/builtin"
CUSTOM_DIR="$CERT_POOL/custom"
ACTIVE_DIR="$MODDIR/system/etc/security/cacerts"
CONF="$CONFDIR/certs.conf"
LOG_FILE="$DATADIR/install.log"
TEMP_APEX="/data/local/tmp/cacertstore-apex-ca"
TEMP_SYSTEM="/data/local/tmp/cacertstore-system-ca"
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
SYSTEM_CACERTS="/system/etc/security/cacerts"
# 与 reqable 一致：合并结果过少则拒绝 bind，避免误覆盖
MIN_SAFE_CERTS=10
DESC_BODY="将 Reqable / ProxyPin / 自定义 CA 增量挂载到系统 CA 信任库。支持 Magisk / KernelSU WebUI，Android 14+ 自动 APEX 注入。"

log_msg() {
    mkdir -p "$DATADIR" 2>/dev/null
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >>"$LOG_FILE"
}

get_api() {
    local api
    api=$(getprop ro.build.version.sdk)
    [ -n "$api" ] || api=24
    echo "$api"
}

read_conf() {
    key="$1"
    default="${2:-}"
    if [ ! -f "$CONF" ]; then
        echo "$default"
        return 0
    fi
    val=$(grep -m1 "^[[:space:]]*${key}=" "$CONF" 2>/dev/null | sed "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//" | tr -d '\r')
    [ -n "$val" ] && echo "$val" || echo "$default"
}

write_conf() {
    key="$1"
    value="$2"
    mkdir -p "$CONFDIR" 2>/dev/null
    if [ ! -f "$CONF" ]; then
        echo "${key}=${value}" >>"$CONF"
        return 0
    fi
    if grep -q "^[[:space:]]*${key}=" "$CONF" 2>/dev/null; then
        sed -i "s|^[[:space:]]*${key}=.*|${key}=${value}|" "$CONF"
    else
        echo "${key}=${value}" >>"$CONF"
    fi
}

set_selinux_context() {
  target="$1"
  dest="$2"
  [ "$(getenforce)" = "Enforcing" ] || return 0
  ctx=$(ls -Zd "$target" 2>/dev/null | awk '{print $1}')
  if [ -n "$ctx" ] && [ "$ctx" != "?" ]; then
    chcon -R "$ctx" "$dest" 2>/dev/null
  else
    chcon -R u:object_r:system_security_cacerts_file:s0 "$dest" 2>/dev/null
  fi
}

fix_cert_permissions() {
  dir="$1"
  [ -d "$dir" ] || return 0
  chown -R 0:0 "$dir" 2>/dev/null
  chmod 755 "$dir" 2>/dev/null
  chmod 644 "$dir"/*.0 2>/dev/null
}

is_enabled() {
  [ "$(read_conf "$1" "1")" = "1" ]
}

count_certs() {
  dir="$1"
  n=$(ls -1 "$dir"/*.0 2>/dev/null | wc -l)
  echo "$n" | tr -d ' '
}

find_system_cacerts_mirror() {
  for base in \
    "$(magisk --path 2>/dev/null)/.magisk/mirror" \
    /debug_ramdisk/.magisk/mirror \
    /sbin/.magisk/mirror \
    /data/adb/magisk/mirror
  do
    [ -n "$base" ] || continue
    if [ -d "$base/system/etc/security/cacerts" ]; then
      echo "$base/system/etc/security/cacerts"
      return 0
    fi
  done
  return 1
}

install_addon_certs_into() {
  dest="$1"
  mkdir -p "$dest" 2>/dev/null

  if is_enabled reqable && [ -f "$BUILTIN_DIR/reqable/833e2479.0" ]; then
    cp -f "$BUILTIN_DIR/reqable/833e2479.0" "$dest/"
  fi
  if is_enabled proxypin && [ -f "$BUILTIN_DIR/proxypin/243f0bfb.0" ]; then
    cp -f "$BUILTIN_DIR/proxypin/243f0bfb.0" "$dest/"
  fi

  for cert in "$CUSTOM_DIR"/*.0; do
    [ -f "$cert" ] || continue
    cp -f "$cert" "$dest/"
  done
}

count_addon_certs() {
  n=0
  if is_enabled reqable && [ -f "$BUILTIN_DIR/reqable/833e2479.0" ]; then
    n=$((n + 1))
  fi
  if is_enabled proxypin && [ -f "$BUILTIN_DIR/proxypin/243f0bfb.0" ]; then
    n=$((n + 1))
  fi
  for cert in "$CUSTOM_DIR"/*.0; do
    [ -f "$cert" ] || continue
    n=$((n + 1))
  done
  echo "$n"
}

# 模块目录只放「要追加」的证书（与 reqable / ProxyPin 相同）
# 真正增量生效靠 apex_inject.sh：现场拷贝目标路径全部 CA + 追加 → bind
sync_active_certs() {
  mkdir -p "$ACTIVE_DIR" "$CUSTOM_DIR" 2>/dev/null
  rm -f "$ACTIVE_DIR"/*.0 2>/dev/null
  install_addon_certs_into "$ACTIVE_DIR"
  fix_cert_permissions "$ACTIVE_DIR"
  set_selinux_context "$SYSTEM_CACERTS" "$ACTIVE_DIR"
  log_msg "sync_active_certs: addon=$(count_addon_certs)"
}

list_active_hashes() {
  ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | while read -r f; do
    basename "$f"
  done
}

detect_root_impl() {
  if [ "$KSU" = "true" ] || [ -d /data/adb/ksu ] || [ -f /data/adb/ksu/bin/ksud ]; then
    if [ -f /data/adb/ksu/bin/ksud ] && strings /data/adb/ksu/bin/ksud 2>/dev/null | grep -qi sukisu; then
      echo SukiSU
    else
      echo KernelSU
    fi
    return 0
  fi
  if [ "$APATCH" = "true" ] || [ -d /data/adb/ap ] || [ -f /data/adb/ap/bin/apd ]; then
    echo APatch
    return 0
  fi
  if [ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] || [ -f /sbin/magisk ]; then
    echo Magisk
    return 0
  fi
  echo Unknown
}

check_apex_injected() {
  api=$(get_api)
  if [ "$api" -lt 34 ]; then
    echo 2
    return 0
  fi
  probe=""
  if is_enabled reqable && [ -f "$ACTIVE_DIR/833e2479.0" ]; then
    probe="833e2479.0"
  elif is_enabled proxypin && [ -f "$ACTIVE_DIR/243f0bfb.0" ]; then
    probe="243f0bfb.0"
  else
    for cert in "$CUSTOM_DIR"/*.0; do
      [ -f "$cert" ] || continue
      probe=$(basename "$cert")
      break
    done
  fi
  if [ -z "$probe" ]; then
    echo 2
    return 0
  fi
  if [ -f "$APEX_CACERTS/$probe" ]; then
    echo 1
  else
    echo 0
  fi
}

compute_status_tag() {
  if [ -f "$MODDIR/disable" ]; then
    echo "模块已禁用"
    return 0
  fi
  addons=$(count_addon_certs)
  if [ "$addons" -eq 0 ]; then
    echo "未启用证书"
    return 0
  fi
  apex_ok=$(check_apex_injected)
  if [ "$apex_ok" = "0" ]; then
    echo "APEX 待注入"
    return 0
  fi
  echo "运行正常"
}

update_module_description() {
  tag="$1"
  prop="$MODDIR/module.prop"
  [ -f "$prop" ] || return 0
  if grep -q '^description=' "$prop" 2>/dev/null; then
    sed -i "s|^description=.*|description=[ ${tag} ] ${DESC_BODY}|" "$prop"
  else
    echo "description=[ ${tag} ] ${DESC_BODY}" >>"$prop"
  fi
  chmod 0644 "$prop" 2>/dev/null
}

refresh_module_description() {
  tag=$(compute_status_tag)
  update_module_description "$tag"
}
