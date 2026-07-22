#!/system/bin/sh
# CertBridge 公共入口：路径初始化 + 按功能加载 lib/*
# 其它脚本统一：. "$MODDIR/bin/common.sh"

certbridge_resolve_moddir() {
  local script="${1:-$0}"
  local base="${script%/*}"
  case "$base" in
    */bin) echo "${base%/*}" ;;
    */bin/lib) echo "${base%/bin/lib}" ;;
    *) echo "$base" ;;
  esac
}

certbridge_init_paths() {
  MODDIR="${MODDIR:-$(certbridge_resolve_moddir "$1")}"
  BINDIR="$MODDIR/bin"
  LIBDIR="$BINDIR/lib"
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
}

certbridge_init_paths "$0"

if [ -n "$CERTBRIDGE_LIBS_LOADED" ]; then
  return 0 2>/dev/null || exit 0
fi
CERTBRIDGE_LIBS_LOADED=1

if [ ! -d "$LIBDIR" ]; then
  echo "[CertBridge] 缺少 bin/lib，请重新安装模块" >&2
  return 1 2>/dev/null || exit 1
fi

. "$LIBDIR/log.sh"
. "$LIBDIR/keys.sh"
. "$LIBDIR/conf.sh"
. "$LIBDIR/lock.sh"
. "$LIBDIR/store.sh"
. "$LIBDIR/certs.sh"
. "$LIBDIR/openssl.sh"
. "$LIBDIR/verify.sh"
. "$LIBDIR/generation.sh"
. "$LIBDIR/status.sh"
