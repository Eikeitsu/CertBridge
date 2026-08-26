# 由 common / cert_domain 加载
# 显示名、详情、指纹
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

cert_info_kv() {
  key="$1"
  val=$(echo "$2" | tr -d '\r' | tr '\n' ' ' | sed 's/[[:space:]]\{1,\}/ /g; s/^[[:space:]]*//; s/[[:space:]]*$//')
  [ -n "$val" ] || return 0
  echo "$key=$val"
}

# 从 openssl -text 补全扩展字段（完整版 OpenSSL）
cert_info_from_openssl_text() {
  text="$1"
  [ -n "$text" ] || return 0
  version=$(echo "$text" | sed -n 's/.*Version: *\([0-9][0-9]*\).*/\1/p' | head -n1)
  sig_alg=$(echo "$text" | sed -n 's/^[[:space:]]*Signature Algorithm: *//p' | head -n1)
  pubkey_alg=$(echo "$text" | sed -n 's/.*Public Key Algorithm: *//p' | head -n1)
  pubkey_bits=$(echo "$text" | sed -n 's/.*(\([0-9][0-9]*\) bit).*/\1/p' | head -n1)
  pathlen=$(echo "$text" | sed -n 's/.*pathlen:\([0-9][0-9]*\).*/\1/p' | head -n1)
  if echo "$text" | grep -q 'CA:TRUE'; then
    ca=1
  elif echo "$text" | grep -q 'CA:FALSE'; then
    ca=0
  else
    ca=""
  fi
  key_usage=$(echo "$text" | awk '
    /X509v3 Key Usage/ { getline; gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit }
  ')
  ext_key_usage=$(echo "$text" | awk '
    /X509v3 Extended Key Usage/ { getline; gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit }
  ')
  san=$(echo "$text" | awk '
    /X509v3 Subject Alternative Name/ { getline; gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit }
  ')
  ski=$(echo "$text" | awk '
    /X509v3 Subject Key Identifier/ { getline; gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print; exit }
  ')
  aki=$(echo "$text" | awk '
    /X509v3 Authority Key Identifier/ {
      getline
      gsub(/^[[:space:]]+|[[:space:]]+$/, "")
      sub(/^keyid:/, "")
      print
      exit
    }
  ')
  cert_info_kv version "$version"
  cert_info_kv sig_alg "$sig_alg"
  cert_info_kv pubkey_alg "$pubkey_alg"
  cert_info_kv pubkey_bits "$pubkey_bits"
  cert_info_kv ca "$ca"
  cert_info_kv pathlen "$pathlen"
  cert_info_kv key_usage "$key_usage"
  cert_info_kv ext_key_usage "$ext_key_usage"
  cert_info_kv san "$san"
  cert_info_kv ski "$ski"
  cert_info_kv aki "$aki"
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

  display=$(cert_display_name_from_file "$file" "$(basename "$file")")
  dump=$($openssl_cmd x509 $inform -in "$file" -noout -certbridge_info 2>/dev/null)
  if echo "$dump" | grep -q '^ok=1'; then
    echo "$dump"
    cert_info_kv display_name "$display"
    cert_info_kv filename "$(basename "$file")"
    return 0
  fi

  subject=$($openssl_cmd x509 $inform -in "$file" -noout -subject -nameopt RFC2253 2>/dev/null | sed 's/^subject=//')
  issuer=$($openssl_cmd x509 $inform -in "$file" -noout -issuer -nameopt RFC2253 2>/dev/null | sed 's/^issuer=//')
  not_before=$($openssl_cmd x509 $inform -in "$file" -noout -startdate 2>/dev/null | sed 's/^notBefore=//')
  not_after=$($openssl_cmd x509 $inform -in "$file" -noout -enddate 2>/dev/null | sed 's/^notAfter=//')
  hash=$(openssl_subject_hash "$openssl_cmd" "$inform" "$file")
  fp=$($openssl_cmd x509 $inform -in "$file" -noout -fingerprint -sha256 2>/dev/null | sed 's/^sha256 Fingerprint=//')
  fp1=$($openssl_cmd x509 $inform -in "$file" -noout -fingerprint -sha1 2>/dev/null | sed 's/^SHA1 Fingerprint=//; s/^sha1 Fingerprint=//')
  serial=$($openssl_cmd x509 $inform -in "$file" -noout -serial 2>/dev/null | sed 's/^serial=//')
  text=$($openssl_cmd x509 $inform -in "$file" -noout -text 2>/dev/null)
  echo "ok=1"
  cert_info_kv display_name "$display"
  cert_info_kv subject "$subject"
  cert_info_kv issuer "$issuer"
  cert_info_kv not_before "$not_before"
  cert_info_kv not_after "$not_after"
  cert_info_kv hash "$hash"
  cert_info_kv fingerprint_sha256 "$fp"
  cert_info_kv fingerprint_sha1 "$fp1"
  cert_info_kv serial "$serial"
  cert_info_kv filename "$(basename "$file")"
  if [ -n "$subject" ] && [ "$subject" = "$issuer" ]; then
    echo "self_signed=1"
  fi
  cert_info_from_openssl_text "$text"
}

# SHA256 指纹（无冒号大写/小写均可；失败返回非 0）
cert_fingerprint_sha256() {
  file="$1"
  [ -f "$file" ] || return 1
  openssl_cmd=$(find_openssl) || return 1
  inform=""
  if ! $openssl_cmd x509 -in "$file" -noout >/dev/null 2>&1; then
    if $openssl_cmd x509 -inform DER -in "$file" -noout >/dev/null 2>&1; then
      inform="-inform DER"
    else
      return 1
    fi
  fi
  fp=$($openssl_cmd x509 $inform -in "$file" -noout -fingerprint -sha256 2>/dev/null | \
    sed 's/^sha256 Fingerprint=//' | tr -d ':\r\n' | tr 'A-F' 'a-f')
  [ -n "$fp" ] || return 1
  echo "$fp"
}

# 从任意输出里抠出 8 位 hex hash（忽略 ART/linker 噪声）
