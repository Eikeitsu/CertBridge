#!/system/bin/sh
# openssl 兼容入口：把 x509 / version 交给 cbx509 dex（CertBridge Lite）
# 用法与 openssl 相同：cbx509.sh x509 -in FILE ...
#
# Magisk/KSU 安装脚本会注入 busybox 的 LD_LIBRARY_PATH，ART 无法加载 libart，
# 表现为「找到证书但校验/转换失败」。启动前清掉这些变量。

unset LD_LIBRARY_PATH
unset LD_PRELOAD
unset LD_CONFIG
export ANDROID_DATA="${ANDROID_DATA:-/data}"
export ANDROID_ROOT="${ANDROID_ROOT:-/system}"

CBX509_DIR="${CBX509_DIR:-}"
if [ -z "$CBX509_DIR" ]; then
  _self=$0
  case "$_self" in
    */*) CBX509_DIR=$(CDPATH='' cd -- "${_self%/*}/cbx509" 2>/dev/null && pwd) ;;
  esac
fi
if [ -z "$CBX509_DIR" ] || [ ! -f "$CBX509_DIR/classes.dex" ]; then
  for d in \
    "${BINDIR}/cbx509" \
    "${MODDIR}/bin/cbx509" \
    "${MODPATH}/bin/cbx509"
  do
    [ -n "$d" ] && [ -f "$d/classes.dex" ] && {
      CBX509_DIR=$d
      break
    }
  done
fi
[ -n "$CBX509_DIR" ] && [ -f "$CBX509_DIR/classes.dex" ] || {
  echo "cbx509: classes.dex not found" >&2
  exit 127
}

DEX="$CBX509_DIR/classes.dex"
CLASS=com.certbridge.x509.Main

cbx509_run() {
  ap="$1"
  shift
  CLASSPATH="$DEX" "$ap" -Djava.class.path="$DEX" /system/bin "$CLASS" "$@"
}

for ap in \
  /system/bin/app_process64 \
  /system/bin/app_process \
  /system/bin/app_process32
do
  [ -x "$ap" ] || continue
  cbx509_run "$ap" "$@"
  exit $?
done

for dv in /system/bin/dalvikvm64 /system/bin/dalvikvm /system/bin/dalvikvm32; do
  [ -x "$dv" ] || continue
  "$dv" -cp "$DEX" "$CLASS" "$@"
  exit $?
done

echo "cbx509: no app_process/dalvikvm" >&2
exit 127
