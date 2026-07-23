#!/system/bin/sh
# 证书来源：sources 同步、查找；addon = sources →（proxypin）builtin

SOURCES_DIR="${SOURCES_DIR:-$CERT_POOL/sources}"

# 诊断从 App 导入失败原因（打印到 stdout，供安装日志）
# 返回码：0=可导入 1=无 OpenSSL 2=未找到文件 3=校验/转换失败
diagnose_app_cert_import() {
  kind="$1"
  if ! find_openssl >/dev/null 2>&1; then
    echo "reason=openssl_unavailable"
    return 1
  fi
  echo "openssl=$(find_openssl)"
  live=$(find_live_app_cert "$kind") || {
    echo "reason=live_not_found"
    return 2
  }
  echo "live=$live"
  if ! import_ca_into_dir "$live" "$DATADIR/diag_import.$$" "$(app_cert_label "$kind")" >/dev/null 2>&1; then
    rm -rf "$DATADIR/diag_import.$$"
    echo "reason=import_failed"
    return 3
  fi
  rm -rf "$DATADIR/diag_import.$$"
  echo "reason=ok"
  return 0
}

# 从 App 同步到 sources/<kind>/，成功打印文件路径
sync_source_from_app() {
  kind="$1"
  live=$(find_live_app_cert "$kind") || return 1
  label=$(app_cert_label "$kind")
  dest="$SOURCES_DIR/$kind"
  rm -rf "$dest"
  mkdir -p "$dest" || return 1
  name=$(import_ca_into_dir "$live" "$dest" "$label") || {
    rm -rf "$dest"
    mkdir -p "$dest"
    return 1
  }
  echo "$dest/$name"
}

find_source_cert() {
  kind="$1"
  dir="$SOURCES_DIR/$kind"
  [ -d "$dir" ] || return 1
  for cert in "$dir"/*.*; do
    [ -f "$cert" ] || continue
    case "$cert" in *.meta) continue ;; esac
    is_cert_filename "$(basename "$cert")" || continue
    echo "$cert"
    return 0
  done
  return 1
}

# addon 查找：sources →（仅 proxypin）builtin；可先尝试从 App 刷新
find_addon_cert() {
  kind="$1"
  try_live="${2:-0}"
  if [ "$try_live" = "1" ]; then
    sync_source_from_app "$kind" >/dev/null 2>&1 || true
  fi
  if path=$(find_source_cert "$kind"); then
    echo "$path"
    return 0
  fi
  if [ "$kind" = "proxypin" ]; then
    find_builtin_cert proxypin
    return $?
  fi
  return 1
}

resolve_addon_file_for_label() {
  label="$1"
  case "$label" in
    reqable|proxypin)
      find_addon_cert "$label" 0
      ;;
    custom:*)
      name=${label#custom:}
      [ -f "$CUSTOM_DIR/$name" ] && echo "$CUSTOM_DIR/$name" && return 0
      return 1
      ;;
    *)
      return 1
      ;;
  esac
}
