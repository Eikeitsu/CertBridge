# 由 common / cert_domain 加载
# subject_hash、规范化导入、meta 显示名
_openssl_pick_hash8() {
  printf '%s\n' "$1" | tr -d '\r' | tr 'A-F' 'a-f' | awk '
    {
      gsub(/[^0-9a-f]/, " ")
      n = split($0, a, " ")
      for (i = 1; i <= n; i++) if (length(a[i]) == 8) h = a[i]
    }
    END { if (h != "") print h }
  '
}

# 取出 subject_hash_old（8 位 hex）。Lite 的 app_process 可能在 stdout 夹杂日志或 \\r。
openssl_subject_hash() {
  openssl_cmd="$1"
  inform="$2"
  file="$3"
  raw=$($openssl_cmd x509 $inform -in "$file" -subject_hash_old -noout 2>/dev/null) || true
  hash=$(_openssl_pick_hash8 "$raw")
  case "$hash" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f])
      printf '%s\n' "$hash"
      return 0
      ;;
  esac
  # Lite 兜底：-certbridge_info 里的 hash=（避免只打了 -subject_hash_old 时崩掉）
  raw=$($openssl_cmd x509 $inform -in "$file" -noout -certbridge_info 2>/dev/null) || true
  hash=$(printf '%s\n' "$raw" | tr -d '\r' | awk -F= '
    tolower($1) == "hash" {
      gsub(/[^0-9A-Fa-f]/, "", $2)
      print tolower($2)
      exit
    }
  ')
  case "$hash" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f])
      printf '%s\n' "$hash"
      return 0
      ;;
  esac
  return 1
}

# 将任意 CA 规范化为 hash.N 写入目标目录，并写 .meta 显示名
# 返回文件名到 stdout
import_ca_into_dir() {
  src="$1"
  dest_dir="$2"
  fallback_name="${3:-CA 证书}"
  [ -f "$src" ] || {
    echo "文件不存在" >&2
    return 1
  }
  openssl_cmd=$(find_openssl) || {
    echo "X509 工具不可用" >&2
    return 1
  }
  mkdir -p "$dest_dir" 2>/dev/null || {
    echo "无法创建目标目录" >&2
    return 1
  }
  tmp="$DATADIR/import.$$.pem"
  mkdir -p "$DATADIR" 2>/dev/null
  inform=""
  if $openssl_cmd x509 -in "$src" -noout >/dev/null 2>&1; then
    inform=""
  elif $openssl_cmd x509 -inform DER -in "$src" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  else
    echo "无法解析为 X.509" >&2
    return 1
  fi
  $openssl_cmd x509 $inform -in "$src" -checkend 0 -noout >/dev/null 2>&1 || {
    echo "证书已过期" >&2
    return 1
  }
  $openssl_cmd x509 $inform -in "$src" -noout -text 2>/dev/null | grep -q 'CA:TRUE' || {
    echo "不是 CA 证书（缺少 CA:TRUE）" >&2
    return 1
  }
  hash=$(openssl_subject_hash "$openssl_cmd" "$inform" "$src") || {
    echo "无法计算系统库文件名" >&2
    return 1
  }
  $openssl_cmd x509 $inform -in "$src" -out "$tmp" >/dev/null 2>&1 || {
    rm -f "$tmp"
    echo "写入规范化 PEM 失败" >&2
    return 1
  }
  name=$(next_collision_name "$tmp" "$dest_dir" "$hash.0") || {
    rm -f "$tmp"
    echo "文件名冲突处理失败" >&2
    return 1
  }
  if [ ! -f "$dest_dir/$name" ]; then
    cp -f "$tmp" "$dest_dir/$name" || {
      rm -f "$tmp"
      echo "复制证书失败" >&2
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
