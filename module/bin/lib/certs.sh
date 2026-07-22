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
