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
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
SYSTEM_CACERTS="/system/etc/security/cacerts"

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

sync_active_certs() {
  mkdir -p "$ACTIVE_DIR" "$CUSTOM_DIR" 2>/dev/null
  rm -f "$ACTIVE_DIR"/*.0 2>/dev/null

  if is_enabled reqable && [ -f "$BUILTIN_DIR/reqable/833e2479.0" ]; then
    cp -f "$BUILTIN_DIR/reqable/833e2479.0" "$ACTIVE_DIR/"
  fi
  if is_enabled proxypin && [ -f "$BUILTIN_DIR/proxypin/243f0bfb.0" ]; then
    cp -f "$BUILTIN_DIR/proxypin/243f0bfb.0" "$ACTIVE_DIR/"
  fi

  for cert in "$CUSTOM_DIR"/*.0; do
    [ -f "$cert" ] || continue
    cp -f "$cert" "$ACTIVE_DIR/"
  done

  fix_cert_permissions "$ACTIVE_DIR"
  set_selinux_context "$SYSTEM_CACERTS" "$ACTIVE_DIR"
  log_msg "sync_active_certs: $(ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | wc -l) cert(s)"
}

list_active_hashes() {
  ls -1 "$ACTIVE_DIR"/*.0 2>/dev/null | while read -r f; do
    basename "$f"
  done
}
