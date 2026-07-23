#!/system/bin/sh
# 证书文件名校验、复制与 addon 合并

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
  display="${4:-}"
  name=$(next_collision_name "$src" "$dest" "$(basename "$src")") || return 1
  [ -f "$dest/$name" ] || cp -f "$src" "$dest/$name" 2>/dev/null || return 1
  checksum=$(cksum "$dest/$name" 2>/dev/null | awk '{print $1 ":" $2}')
  [ -n "$checksum" ] || return 1
  if [ -z "$display" ]; then
    display=$(read_cert_meta_display "$src" "$(basename "$src")")
  fi
  display=$(echo "$display" | tr '|' '/' | tr -d '\r\n')
  echo "$label|$name|$checksum|$display" >>"$MAP_TMP"
}

# 内置目录中取第一张合法 hash.N（仅 ProxyPin 兜底仍使用）
find_builtin_cert() {
  kind="$1"
  dir="$BUILTIN_DIR/$kind"
  [ -d "$dir" ] || return 1
  for cert in "$dir"/*.*; do
    [ -f "$cert" ] || continue
    is_cert_filename "$(basename "$cert")" || continue
    echo "$cert"
    return 0
  done
  return 1
}

install_addon_certs_into() {
  dest="$1"
  MAP_TMP="$2"
  addon_cert=""
  : >"$MAP_TMP" || return 1
  if is_enabled reqable; then
    # 开机优先从已安装 Reqable 刷新；找不到则用安装时导入的 sources
    if addon_cert=$(find_addon_cert reqable 1) || addon_cert=$(find_addon_cert reqable 0); then
      display=$(read_cert_meta_display "$addon_cert" "Reqable")
      install_one_addon "$addon_cert" "$dest" reqable "$display" || return 1
    else
      log_msg "certs: reqable enabled but no app/source certificate found (skipped)"
    fi
  fi
  if is_enabled proxypin; then
    if addon_cert=$(find_addon_cert proxypin 1) || addon_cert=$(find_addon_cert proxypin 0); then
      display=$(read_cert_meta_display "$addon_cert" "ProxyPin")
      install_one_addon "$addon_cert" "$dest" proxypin "$display" || return 1
    else
      log_msg "certs: proxypin enabled but no certificate found (skipped)"
    fi
  fi
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    display=$(read_cert_meta_display "$cert" "$name")
    install_one_addon "$cert" "$dest" "custom:$name" "$display" || return 1
  done
}

count_addon_certs() {
  n=0
  if is_enabled reqable && find_addon_cert reqable 0 >/dev/null 2>&1; then
    n=$((n + 1))
  fi
  if is_enabled proxypin && find_addon_cert proxypin 0 >/dev/null 2>&1; then
    n=$((n + 1))
  fi
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    is_cert_filename "$(basename "$cert")" && n=$((n + 1))
  done
  echo "$n"
}
