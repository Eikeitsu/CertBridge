#!/system/bin/sh
# 注入结果校验
# 状态判定与注入侧 soft-fail 对齐：TLS 主路径上 addon 可见即可视为成功；
# 整库精确匹配失败只记日志，避免「证书能用却报 Zygote 校验失败」。

# 与 count_certs 相同规则，在目标命名空间内计数 hash.N
count_certs_in_namespace() {
  pid="$1"
  target="$2"
  nsenter --mount=/proc/"$pid"/ns/mnt -- sh -c '
    n=0
    for cert in "'"$target"'/"*.*; do
      [ -f "$cert" ] || continue
      name=${cert##*/}
      stem=${name%%.*}
      suffix=${name#*.}
      [ "$stem" != "$name" ] || continue
      [ "${#stem}" -eq 8 ] || continue
      case "$stem" in *[!0-9a-fA-F]*) continue ;; esac
      [ -n "$suffix" ] || continue
      case "$suffix" in *[!0-9]*) continue ;; esac
      n=$((n + 1))
    done
    echo "$n"
  ' 2>/dev/null | tr -d ' \r\n'
}

# 仅检查已启用 addon 是否在命名空间中且 cksum 一致（够判定「能用」）
verify_namespace_addons() {
  pid="$1"
  target="$2"
  [ -s "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    actual=$(nsenter --mount=/proc/"$pid"/ns/mnt -- cksum "$target/$name" 2>/dev/null | \
      awk '{print $1 ":" $2}')
    [ -n "$actual" ] && [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
  return 0
}

verify_direct_addons() {
  target="$1"
  [ -s "$APPLIED_MAP" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    actual=$(cksum "$target/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ -n "$actual" ] && [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
  return 0
}

# 整库校验（数量 + addon cksum）；计数规则与 count_certs 一致
verify_namespace_store() {
  pid="$1"
  target="$2"
  expected=$(count_certs "$GEN_CERTS")
  [ "$expected" -ge "$MIN_SAFE_CERTS" ] || return 1
  n=$(count_certs_in_namespace "$pid" "$target")
  [ "${n:-0}" -eq "$expected" ] || return 1
  verify_namespace_addons "$pid" "$target"
}

verify_direct_store() {
  target="$1"
  expected=$(count_certs "$GEN_CERTS")
  [ "$expected" -ge "$MIN_SAFE_CERTS" ] || return 1
  [ "$(count_certs "$target")" -eq "$expected" ] || return 1
  verify_direct_addons "$target"
}

# 目标是否仍绑着本模块临时层（比整库 cksum 更贴近「挂上了」）
namespace_bind_owned() {
  pid="$1"
  target="$2"
  stage=$(target_stage_dir "$target" 2>/dev/null) || return 1
  [ -n "$stage" ] || return 1
  source_id=$(path_identity "$stage")
  [ -n "$source_id" ] || return 1
  [ "$(namespace_path_identity "$pid" "$target")" = "$source_id" ]
}

# 状态用：整库通过，或绑定归属正确，或 addon 可见
namespace_store_operational() {
  pid="$1"
  target="$2"
  if verify_namespace_store "$pid" "$target"; then
    return 0
  fi
  if namespace_bind_owned "$pid" "$target"; then
    log_warn "verify: pid=$pid $target full-store soft-fail; bind owned (treat ok)"
    return 0
  fi
  if verify_namespace_addons "$pid" "$target"; then
    log_warn "verify: pid=$pid $target full-store soft-fail; addon present (treat ok)"
    return 0
  fi
  return 1
}

# 状态页只校验 TLS 实际使用的主路径，避免 system / conscrypt@版本号 误报
list_status_verify_targets() {
  primary=$(get_target_store)
  [ -d "$primary" ] || return 0
  echo "$primary"
}

check_store_injected() {
  [ -s "$APPLIED_MAP" ] || { echo 2; return 0; }

  # 轻量 Magic：系统路径应能看到叠上去的 addon（Magic Mount / 管理器叠层）
  if is_magic_mount_mode; then
    if ! verify_magic_overlay_live; then
      log_error "verify: magic overlay missing under $SYSTEM_CACERTS"
      echo 0
      return 0
    fi
  fi

  has_bind_target=0
  for target in $(list_status_verify_targets); do
    has_bind_target=1
    namespace_store_operational 1 "$target" || { echo 0; return 0; }
    for zygote in zygote zygote64; do
      # 只取第一个主 Zygote，避免次要/残留进程误杀状态
      pid=$(pidof "$zygote" 2>/dev/null | awk '{print $1; exit}')
      [ -n "$pid" ] || continue
      namespace_store_operational "$pid" "$target" || { echo 0; return 0; }
    done
  done

  # magic + Android <14：无 bind 目标，叠层校验已通过
  if [ "$has_bind_target" = "0" ]; then
    if is_magic_mount_mode; then
      echo 2
      return 0
    fi
  fi

  [ "$(get_api)" -ge 34 ] && echo 1 || echo 2
}
