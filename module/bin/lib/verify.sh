#!/system/bin/sh
# 注入结果校验

verify_namespace_store() {
  pid="$1"
  target="$2"
  expected=$(count_certs "$GEN_CERTS")
  [ "$expected" -ge "$MIN_SAFE_CERTS" ] || return 1
  n=$(nsenter --mount=/proc/"$pid"/ns/mnt -- sh -c "ls -1 '$target'/*.* 2>/dev/null | wc -l" 2>/dev/null)
  n=$(echo "$n" | tr -d ' ')
  [ "${n:-0}" -eq "$expected" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    actual=$(nsenter --mount=/proc/"$pid"/ns/mnt -- cksum "$target/$name" 2>/dev/null | \
      awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}

verify_direct_store() {
  target="$1"
  expected=$(count_certs "$GEN_CERTS")
  [ "$expected" -ge "$MIN_SAFE_CERTS" ] || return 1
  [ "$(count_certs "$target")" -eq "$expected" ] || return 1
  while IFS='|' read -r label name checksum display; do
    [ -n "$name" ] || continue
    actual=$(cksum "$target/$name" 2>/dev/null | awk '{print $1 ":" $2}')
    [ "$actual" = "$checksum" ] || return 1
  done <"$APPLIED_MAP"
}

check_store_injected() {
  [ -s "$APPLIED_MAP" ] || { echo 2; return 0; }

  # 轻量 Magic：系统路径应能看到叠上去的 addon（Magic Mount / 管理器叠层）
  if is_magic_mount_mode; then
    if ! verify_magic_overlay_live; then
      log_msg "verify: magic overlay missing under $SYSTEM_CACERTS"
      echo 0
      return 0
    fi
  fi

  has_bind_target=0
  for target in $(list_target_stores); do
    has_bind_target=1
    verify_namespace_store 1 "$target" || { echo 0; return 0; }
    for zygote in zygote zygote64; do
      for pid in $(pidof "$zygote" 2>/dev/null); do
        verify_namespace_store "$pid" "$target" || { echo 0; return 0; }
      done
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
