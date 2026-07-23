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
  for target in $(list_target_stores); do
    verify_namespace_store 1 "$target" || { echo 0; return 0; }
    for zygote in zygote zygote64; do
      for pid in $(pidof "$zygote" 2>/dev/null); do
        verify_namespace_store "$pid" "$target" || { echo 0; return 0; }
      done
    done
  done
  [ "$(get_api)" -ge 34 ] && echo 1 || echo 2
}
