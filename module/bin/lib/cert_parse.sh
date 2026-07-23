#!/system/bin/sh
# 证书解析：显示名、详情、规范化导入为 hash.N

# 从 PEM/DER 证书取显示名（优先 CN，其次 O，再 subject 截断）
cert_display_name_from_file() {
  file="$1"
  fallback="${2:-CA 证书}"
  openssl_cmd=$(find_openssl 2>/dev/null) || {
    echo "$fallback"
    return 0
  }
  inform=""
  if ! $openssl_cmd x509 -in "$file" -noout >/dev/null 2>&1; then
    if $openssl_cmd x509 -inform DER -in "$file" -noout >/dev/null 2>&1; then
      inform="-inform DER"
    else
      echo "$fallback"
      return 0
    fi
  fi
  name=$($openssl_cmd x509 $inform -in "$file" -noout -subject -nameopt multiline 2>/dev/null | \
    awk -F'= *' '
      tolower($1) ~ /commonname/ { gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; found=1; exit }
    ')
  if [ -z "$name" ]; then
    name=$($openssl_cmd x509 $inform -in "$file" -noout -subject -nameopt multiline 2>/dev/null | \
      awk -F'= *' '
        tolower($1) ~ /organization/ { gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2; exit }
      ')
  fi
  if [ -z "$name" ]; then
    name=$($openssl_cmd x509 $inform -in "$file" -noout -subject -nameopt RFC2253 2>/dev/null | \
      sed -n 's/.*[Cc][Nn]=\([^,]*\).*/\1/p' | head -n1)
  fi
  name=$(echo "$name" | tr -d '\r\n')
  [ -n "$name" ] || name="$fallback"
  echo "$name"
}

# 证书详情（key=value，供 WebUI）
cert_info_from_file() {
  file="$1"
  openssl_cmd=$(find_openssl) || {
    echo "error=openssl_unavailable"
    return 1
  }
  [ -f "$file" ] || {
    echo "error=not_found"
    return 1
  }
  inform=""
  if $openssl_cmd x509 -in "$file" -noout >/dev/null 2>&1; then
    inform=""
  elif $openssl_cmd x509 -inform DER -in "$file" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  else
    echo "error=invalid_x509"
    return 1
  fi
  subject=$($openssl_cmd x509 $inform -in "$file" -noout -subject -nameopt RFC2253 2>/dev/null | sed 's/^subject=//')
  issuer=$($openssl_cmd x509 $inform -in "$file" -noout -issuer -nameopt RFC2253 2>/dev/null | sed 's/^issuer=//')
  not_before=$($openssl_cmd x509 $inform -in "$file" -noout -startdate 2>/dev/null | sed 's/^notBefore=//')
  not_after=$($openssl_cmd x509 $inform -in "$file" -noout -enddate 2>/dev/null | sed 's/^notAfter=//')
  hash=$($openssl_cmd x509 $inform -in "$file" -subject_hash_old -noout 2>/dev/null | tr 'A-F' 'a-f')
  fp=$($openssl_cmd x509 $inform -in "$file" -noout -fingerprint -sha256 2>/dev/null | sed 's/^sha256 Fingerprint=//')
  display=$(cert_display_name_from_file "$file" "$(basename "$file")")
  echo "ok=1"
  echo "display_name=$display"
  echo "subject=$subject"
  echo "issuer=$issuer"
  echo "not_before=$not_before"
  echo "not_after=$not_after"
  echo "hash=$hash"
  echo "fingerprint_sha256=$fp"
  echo "filename=$(basename "$file")"
}

# 将任意 CA 规范化为 hash.N 写入目标目录，并写 .meta 显示名
# 返回文件名到 stdout
import_ca_into_dir() {
  src="$1"
  dest_dir="$2"
  fallback_name="${3:-CA 证书}"
  [ -f "$src" ] || return 1
  openssl_cmd=$(find_openssl) || return 1
  mkdir -p "$dest_dir" 2>/dev/null || return 1
  tmp="$DATADIR/import.$$.pem"
  mkdir -p "$DATADIR" 2>/dev/null
  inform=""
  if $openssl_cmd x509 -in "$src" -noout >/dev/null 2>&1; then
    inform=""
  elif $openssl_cmd x509 -inform DER -in "$src" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  else
    return 1
  fi
  $openssl_cmd x509 $inform -in "$src" -checkend 0 -noout >/dev/null 2>&1 || return 1
  $openssl_cmd x509 $inform -in "$src" -noout -text 2>/dev/null | grep -q 'CA:TRUE' || return 1
  hash=$($openssl_cmd x509 $inform -in "$src" -subject_hash_old -noout 2>/dev/null | tr 'A-F' 'a-f')
  case "$hash" in
    ????????) ;;
    *) return 1 ;;
  esac
  case "$hash" in *[!0-9a-f]*) return 1 ;; esac
  $openssl_cmd x509 $inform -in "$src" -out "$tmp" >/dev/null 2>&1 || {
    rm -f "$tmp"
    return 1
  }
  name=$(next_collision_name "$tmp" "$dest_dir" "$hash.0") || {
    rm -f "$tmp"
    return 1
  }
  if [ ! -f "$dest_dir/$name" ]; then
    cp -f "$tmp" "$dest_dir/$name" || {
      rm -f "$tmp"
      return 1
    }
  fi
  chmod 0644 "$dest_dir/$name" 2>/dev/null
  display=$(cert_display_name_from_file "$dest_dir/$name" "$fallback_name")
  printf 'display_name=%s\n' "$display" >"$dest_dir/$name.meta"
  chmod 0644 "$dest_dir/$name.meta" 2>/dev/null
  rm -f "$tmp"
  echo "$name"
}

read_cert_meta_display() {
  meta="$1.meta"
  fallback="$2"
  if [ -f "$meta" ]; then
    name=$(awk -F= '$1 == "display_name" { print substr($0, index($0, "=") + 1); exit }' "$meta")
    name=$(echo "$name" | tr -d '\r\n')
    [ -n "$name" ] && {
      echo "$name"
      return 0
    }
  fi
  if [ -f "$1" ]; then
    cert_display_name_from_file "$1" "$fallback"
    return 0
  fi
  echo "$fallback"
}
