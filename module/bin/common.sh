#!/system/bin/sh
# CertBridge 公共入口：路径初始化 + 按场景加载 lib/*
# 其它脚本统一：. "$MODDIR/bin/common.sh"
# 可选：CERTBRIDGE_PROFILE=install|runtime（默认 runtime）

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
  SOURCES_DIR="$CERT_POOL/sources"
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
  RUNTIME_STATUS_FILE="$STATEDIR/runtime-status.conf"
  ROOT_CACHE_FILE="$STATEDIR/root-impl.cache"
  APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
  SYSTEM_CACERTS="/system/etc/security/cacerts"
  MIN_SAFE_CERTS=10
  MAX_CUSTOM_BYTES=65536
}

certbridge_load_lib() {
  name="$1"
  # shellcheck disable=SC1090
  . "$LIBDIR/$name"
}

# 证书域公共库（探测 / 解析 / 来源）
certbridge_load_cert_domain() {
  certbridge_load_lib openssl.sh
  certbridge_load_lib certs.sh
  certbridge_load_lib app_detect.sh
  certbridge_load_lib cert_parse.sh
  certbridge_load_lib cert_sources.sh
}

certbridge_load_libs_install() {
  certbridge_load_lib log.sh
  certbridge_load_lib keys.sh
  certbridge_load_cert_domain
  certbridge_load_lib install_flow.sh
}

certbridge_load_libs_runtime() {
  certbridge_load_lib log.sh
  certbridge_load_lib keys.sh
  certbridge_load_lib conf.sh
  certbridge_load_lib lock.sh
  certbridge_load_lib store.sh
  certbridge_load_cert_domain
  certbridge_load_lib verify.sh
  certbridge_load_lib generation.sh
  certbridge_load_lib status.sh
}

certbridge_init_paths "$0"

if [ -n "$CERTBRIDGE_LIBS_LOADED" ]; then
  return 0 2>/dev/null || exit 0
fi

if [ ! -d "$LIBDIR" ]; then
  echo "[CertBridge] 缺少 bin/lib，请重新安装模块" >&2
  return 1 2>/dev/null || exit 1
fi

CERTBRIDGE_PROFILE="${CERTBRIDGE_PROFILE:-runtime}"
case "$CERTBRIDGE_PROFILE" in
  install) certbridge_load_libs_install ;;
  runtime|*) certbridge_load_libs_runtime ;;
esac
CERTBRIDGE_LIBS_LOADED="$CERTBRIDGE_PROFILE"
