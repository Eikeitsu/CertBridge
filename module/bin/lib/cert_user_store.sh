#!/system/bin/sh
# 用户信任库（cacerts-added）写入
# Android 将「用户 CA」存为 /data/misc/user/<id>/cacerts-added/<subject_hash_old>.N（多为 DER）

user_cacerts_added_dir() {
  uid="${1:-0}"
  echo "/data/misc/user/${uid}/cacerts-added"
}

user_cacerts_removed_dir() {
  uid="${1:-0}"
  echo "/data/misc/user/${uid}/cacerts-removed"
}

# 禁止挂入系统信任库的用户 CA 指纹表（一行一个 sha256，小写）
# 典型：AdGuard Intermediate——即使用户热挂载开着也绝不能进系统库
user_system_mount_deny_file() {
  echo "${DATADIR}/user_system_mount_deny.fps"
}

# 登记：该用户 CA 永远不得热挂载/合并进系统信任库
user_ca_record_system_mount_deny() {
  src="$1"
  [ -n "$src" ] || return 1
  fp=$(cert_fingerprint_sha256 "$src" 2>/dev/null) || return 1
  [ -n "$fp" ] || return 1
  fp=$(printf '%s' "$fp" | tr 'A-F' 'a-f' | tr -d '\r\n')
  deny=$(user_system_mount_deny_file)
  mkdir -p "${deny%/*}" 2>/dev/null
  if [ -f "$deny" ] && grep -qxF "$fp" "$deny" 2>/dev/null; then
    return 0
  fi
  echo "$fp" >>"$deny" 2>/dev/null || return 1
  chmod 0600 "$deny" 2>/dev/null || true
  return 0
}

# 是否禁止把该 CA 挂进系统信任库（0=禁止）
# 匹配：指纹拒绝表，或 AdGuard Intermediate（角色/主题名）
user_ca_forbid_system_mount() {
  f="$1"
  [ -n "$f" ] && [ -f "$f" ] || return 1
  fp=$(cert_fingerprint_sha256 "$f" 2>/dev/null) || fp=""
  if [ -n "$fp" ]; then
    fp=$(printf '%s' "$fp" | tr 'A-F' 'a-f' | tr -d '\r\n')
    deny=$(user_system_mount_deny_file)
    if [ -f "$deny" ] && grep -qxF "$fp" "$deny" 2>/dev/null; then
      return 0
    fi
  fi
  if type classify_adguard_ca_file >/dev/null 2>&1; then
    case "$(classify_adguard_ca_file "$f" 2>/dev/null)" in
      intermediate) return 0 ;;
    esac
  fi
  # 无 classify 时的兜底：subject/issuer 同时暗示 AdGuard + Intermediate
  openssl_cmd=$(find_openssl 2>/dev/null) || return 1
  inform=""
  if $openssl_cmd x509 -inform DER -in "$f" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  elif $openssl_cmd x509 -in "$f" -noout >/dev/null 2>&1; then
    inform=""
  else
    return 1
  fi
  blob=$($openssl_cmd x509 $inform -in "$f" -noout -subject -issuer -nameopt RFC2253 2>/dev/null) || return 1
  case "$blob" in
    *[Ii]ntermediate*)
      case "$blob" in
        *[Aa][Dd][Gg]uard*|*ADGuard*|*Adguard*) return 0 ;;
      esac
      ;;
  esac
  return 1
}

# 给用户库证书文件套 SELinux 上下文（优先抄同目录已有证书）
_set_user_cacert_context() {
  dest_dir="$1"
  file="$2"
  [ -f "$file" ] || return 0
  command -v getenforce >/dev/null 2>&1 || return 0
  [ "$(getenforce 2>/dev/null)" = "Enforcing" ] || return 0
  ctx=""
  for s in "$dest_dir"/*; do
    [ -f "$s" ] || continue
    [ "$s" = "$file" ] && continue
    ctx=$(ls -Z "$s" 2>/dev/null | awk '{print $1}')
    [ -n "$ctx" ] && [ "$ctx" != "?" ] && break
  done
  if [ -z "$ctx" ] || [ "$ctx" = "?" ]; then
    ctx=$(ls -Zd "$dest_dir" 2>/dev/null | awk '{print $1}')
  fi
  if [ -z "$ctx" ] || [ "$ctx" = "?" ]; then
    ctx="u:object_r:system_data_file:s0"
  fi
  chcon "$ctx" "$file" 2>/dev/null || true
}

# 将 CA 写入用户库；stdout 打印文件名 hash.N
# 用户库用 DER（与设置里「安装证书」一致）；已存在同指纹则跳过复制
install_ca_into_user_store() {
  src="$1"
  uid="${2:-0}"
  if [ ! -f "$src" ] || [ ! -r "$src" ]; then
    src=$(ensure_readable_cert_file "$src") || {
      echo "文件不存在" >&2
      return 1
    }
  fi
  openssl_cmd=$(find_openssl) || {
    echo "X509 工具不可用" >&2
    return 1
  }
  dest_dir=$(user_cacerts_added_dir "$uid")
  removed_dir=$(user_cacerts_removed_dir "$uid")
  mkdir -p "$dest_dir" 2>/dev/null || {
    echo "无法创建用户证书目录" >&2
    return 1
  }
  first_byte=$(od -An -N1 -tx1 "$src" 2>/dev/null | tr -d ' \n')
  inform=""
  if [ "$first_byte" = "30" ] && \
      $openssl_cmd x509 -inform DER -in "$src" -noout >/dev/null 2>&1; then
    inform="-inform DER"
  elif $openssl_cmd x509 -in "$src" -noout >/dev/null 2>&1; then
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
    echo "无法计算用户库文件名" >&2
    return 1
  }
  tmp="$DATADIR/user_import.$$.der"
  mkdir -p "$DATADIR" 2>/dev/null
  $openssl_cmd x509 $inform -in "$src" -outform DER -out "$tmp" >/dev/null 2>&1 || {
    rm -f "$tmp"
    echo "写入 DER 失败" >&2
    return 1
  }
  # 同 hash 已有相同内容则复用
  name=""
  for old in "$dest_dir/$hash".*; do
    [ -f "$old" ] || continue
    if cmp -s "$tmp" "$old" 2>/dev/null; then
      name=${old##*/}
      break
    fi
  done
  if [ -z "$name" ]; then
    name=$(next_collision_name "$tmp" "$dest_dir" "$hash.0") || {
      rm -f "$tmp"
      echo "文件名冲突处理失败" >&2
      return 1
    }
    if [ ! -f "$dest_dir/$name" ]; then
      cp -f "$tmp" "$dest_dir/$name" || {
        rm -f "$tmp"
        echo "复制到用户库失败" >&2
        return 1
      }
    fi
  fi
  rm -f "$tmp"
  chmod 0644 "$dest_dir/$name" 2>/dev/null
  chown 0:0 "$dest_dir/$name" 2>/dev/null || true
  _set_user_cacert_context "$dest_dir" "$dest_dir/$name"
  # 若曾在设置里「禁用」，清掉 removed，否则应用仍会拒绝
  rm -f "$removed_dir/$hash".* 2>/dev/null
  echo "$name"
}

# 用户库中是否已有与 src 相同指纹的 CA
user_store_has_same_cert() {
  src="$1"
  uid="${2:-0}"
  dest_dir=$(user_cacerts_added_dir "$uid")
  [ -d "$dest_dir" ] || return 1
  src_fp=$(cert_fingerprint_sha256 "$src" 2>/dev/null) || return 1
  [ -n "$src_fp" ] || return 1
  for c in "$dest_dir"/*; do
    [ -f "$c" ] || continue
    cfp=$(cert_fingerprint_sha256 "$c" 2>/dev/null) || continue
    [ "$cfp" = "$src_fp" ] && return 0
  done
  return 1
}
