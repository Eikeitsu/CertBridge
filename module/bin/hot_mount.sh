#!/system/bin/sh
# CertBridge temporary CA session.
# Builds an immutable merged store, binds it into active mount namespaces,
# and removes only mounts carrying this session's marker.

MODDIR=${MODDIR:-${0%/*}/..}
. "$MODDIR/bin/common.sh"

HOT_ROOT="$CERT_POOL/hot"
HOT_CURRENT="$HOT_ROOT/current"
HOT_CERTS="$HOT_CURRENT/cacerts"
HOT_LEDGER="$HOT_CURRENT/mounts.list"
HOT_STATE="$STATEDIR/hot-session.conf"
HOT_MARKER="certbridge_session"
HOT_MAX_FILES=128
HOT_ADDED=0
HOT_SKIPPED=0
HOT_HAS_LOCK=0

hot_exit_cleanup() {
  rm -f "$HOT_ROOT"/.cert.$$.* "$HOT_ROOT/.sd-files.$$" \
    "$HOT_ROOT/.namespaces.$$" "$HOT_ROOT/.status-namespaces.$$" 2>/dev/null
  rm -f "$HOT_STATE.tmp.$$" 2>/dev/null
  rm -rf "$HOT_ROOT/.new.$$" 2>/dev/null
  if [ "$HOT_HAS_LOCK" = "1" ]; then
    release_write_lock
    HOT_HAS_LOCK=0
  fi
}

hot_unlock() {
  release_write_lock
  HOT_HAS_LOCK=0
}

trap hot_exit_cleanup 0
trap 'hot_exit_cleanup; exit 1' 1 2 15

hot_read_state() {
  key="$1"
  if [ -f "$HOT_STATE" ]; then
    HOT_STATE_SOURCE="$HOT_STATE"
  elif [ -f "$HOT_CURRENT/session.conf" ]; then
    HOT_STATE_SOURCE="$HOT_CURRENT/session.conf"
  else
    return 0
  fi
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$HOT_STATE_SOURCE" 2>/dev/null
}

hot_state_set() {
  HOT_STATE_KEY="$1"
  HOT_STATE_VALUE="$2"
  [ -f "$HOT_STATE" ] || return 1
  HOT_STATE_TMP="$HOT_STATE.tmp.$$"
  awk -F= -v key="$HOT_STATE_KEY" -v value="$HOT_STATE_VALUE" '
    BEGIN { done=0 }
    $1 == key { print key "=" value; done=1; next }
    { print }
    END { if (!done) print key "=" value }
  ' "$HOT_STATE" >"$HOT_STATE_TMP" || return 1
  chmod 0600 "$HOT_STATE_TMP" 2>/dev/null
  mv -f "$HOT_STATE_TMP" "$HOT_STATE"
}

hot_boot_id() {
  tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null
}

hot_normalize_cert() {
  HOT_INPUT="$1"
  HOT_OUTPUT="$2"
  HOT_OPENSSL="$3"
  HOT_SIZE=$(wc -c <"$HOT_INPUT" 2>/dev/null)
  [ "${HOT_SIZE:-0}" -gt 0 ] && [ "$HOT_SIZE" -le "$MAX_CUSTOM_BYTES" ] || return 1

  HOT_INFORM=""
  if $HOT_OPENSSL x509 -in "$HOT_INPUT" -noout >/dev/null 2>&1; then
    HOT_INFORM=""
  elif $HOT_OPENSSL x509 -inform DER -in "$HOT_INPUT" -noout >/dev/null 2>&1; then
    HOT_INFORM="-inform DER"
  else
    return 1
  fi
  $HOT_OPENSSL x509 $HOT_INFORM -in "$HOT_INPUT" -checkend 0 -noout >/dev/null 2>&1 || return 1
  $HOT_OPENSSL x509 $HOT_INFORM -in "$HOT_INPUT" -noout -text 2>/dev/null | \
    grep -q 'CA:TRUE' || return 1
  HOT_HASH=$($HOT_OPENSSL x509 $HOT_INFORM -in "$HOT_INPUT" -subject_hash_old -noout 2>/dev/null | \
    tr 'A-F' 'a-f')
  case "$HOT_HASH" in
    ????????) ;;
    *) return 1 ;;
  esac
  case "$HOT_HASH" in *[!0-9a-f]*) return 1 ;; esac
  $HOT_OPENSSL x509 $HOT_INFORM -in "$HOT_INPUT" -out "$HOT_OUTPUT" >/dev/null 2>&1 || return 1
}

hot_add_one() {
  HOT_FILE="$1"
  HOT_LABEL="$2"
  HOT_STAGE_CERTS="$3"
  HOT_STAGE_MAP="$4"
  HOT_OPENSSL="$5"
  [ "$HOT_ADDED" -lt "$HOT_MAX_FILES" ] || {
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    return 0
  }
  [ -L "$HOT_FILE" ] && {
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    return 0
  }
  HOT_READ_FILE="$HOT_FILE"
  case "$HOT_LABEL" in
    sd:*)
      HOT_READ_FILE=$(readlink -f "$HOT_FILE" 2>/dev/null)
      case "$HOT_READ_FILE" in "$HOT_SD_PATH"/*) ;; *)
        HOT_SKIPPED=$((HOT_SKIPPED + 1))
        return 0
        ;;
      esac
      ;;
  esac
  [ -f "$HOT_READ_FILE" ] || {
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    return 0
  }
  HOT_FILE_ID_BEFORE=$(path_identity "$HOT_READ_FILE")
  [ -n "$HOT_FILE_ID_BEFORE" ] || {
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    return 0
  }
  HOT_NORMALIZED="$HOT_ROOT/.cert.$$.$HOT_ADDED"
  rm -f "$HOT_NORMALIZED" 2>/dev/null
  if ! hot_normalize_cert "$HOT_READ_FILE" "$HOT_NORMALIZED" "$HOT_OPENSSL"; then
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    rm -f "$HOT_NORMALIZED"
    return 0
  fi
  HOT_FILE_ID_AFTER=$(path_identity "$HOT_READ_FILE")
  if [ "$HOT_FILE_ID_AFTER" != "$HOT_FILE_ID_BEFORE" ]; then
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    rm -f "$HOT_NORMALIZED"
    return 0
  fi
  HOT_NAME=$(next_collision_name "$HOT_NORMALIZED" "$HOT_STAGE_CERTS" "$HOT_HASH.0") || {
    HOT_SKIPPED=$((HOT_SKIPPED + 1))
    rm -f "$HOT_NORMALIZED"
    return 0
  }
  if [ ! -f "$HOT_STAGE_CERTS/$HOT_NAME" ]; then
    cp -f "$HOT_NORMALIZED" "$HOT_STAGE_CERTS/$HOT_NAME" 2>/dev/null || {
      rm -f "$HOT_NORMALIZED"
      return 1
    }
  fi
  HOT_SUM=$(cksum "$HOT_STAGE_CERTS/$HOT_NAME" 2>/dev/null | awk '{print $1 ":" $2}')
  echo "$HOT_LABEL|$HOT_NAME|$HOT_SUM" >>"$HOT_STAGE_MAP"
  HOT_ADDED=$((HOT_ADDED + 1))
  rm -f "$HOT_NORMALIZED"
}

hot_add_user_certs() {
  HOT_STAGE_CERTS="$1"
  HOT_STAGE_MAP="$2"
  HOT_OPENSSL="$3"
  for HOT_USER_DIR in /data/misc/user/*/cacerts-added; do
    [ -d "$HOT_USER_DIR" ] || continue
    HOT_USER_ID=$(basename "$(dirname "$HOT_USER_DIR")")
    for HOT_FILE in "$HOT_USER_DIR"/*.*; do
      [ -f "$HOT_FILE" ] || continue
      hot_add_one "$HOT_FILE" "user:$HOT_USER_ID" \
        "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
    done
  done
}

hot_validate_sd_path() {
  HOT_SD_PATH="$1"
  [ -n "$HOT_SD_PATH" ] || HOT_SD_PATH="/sdcard/CertBridge"
  HOT_CLEAN_PATH=$(printf '%s' "$HOT_SD_PATH" | tr -d '\r\n')
  [ "$HOT_CLEAN_PATH" = "$HOT_SD_PATH" ] || return 1
  case "$HOT_SD_PATH" in
    *".."*|*"'"*|*'"'*|*'`'*) return 1 ;;
  esac
  case "$HOT_SD_PATH" in
    /sdcard/*|/storage/emulated/*|/storage/self/primary/*|/mnt/media_rw/*) ;;
    *) return 1 ;;
  esac
  [ -d "$HOT_SD_PATH" ] || return 2
  HOT_CANON_PATH=$(readlink -f "$HOT_SD_PATH" 2>/dev/null)
  [ -n "$HOT_CANON_PATH" ] && [ -d "$HOT_CANON_PATH" ] || return 1
  case "$HOT_CANON_PATH" in
    /storage/emulated/*|/storage/self/primary/*|/mnt/media_rw/*) ;;
    *) return 1 ;;
  esac
  HOT_SD_PATH="$HOT_CANON_PATH"
  HOT_SD_DIR_ID=$(path_identity "$HOT_SD_PATH")
  [ -n "$HOT_SD_DIR_ID" ] || return 1
  return 0
}

hot_add_sd_certs() {
  HOT_SD_PATH="$1"
  HOT_STAGE_CERTS="$2"
  HOT_STAGE_MAP="$3"
  HOT_OPENSSL="$4"
  [ "$(path_identity "$HOT_SD_PATH")" = "$HOT_SD_DIR_ID" ] || return 1
  HOT_LIST="$HOT_ROOT/.sd-files.$$"
  find "$HOT_SD_PATH" -type f 2>/dev/null >"$HOT_LIST" || {
    rm -f "$HOT_LIST"
    return 1
  }
  while IFS= read -r HOT_FILE; do
    case "$HOT_FILE" in
      *.0|*.pem|*.crt|*.cer|*.der|*.PEM|*.CRT|*.CER|*.DER) ;;
      *) continue ;;
    esac
    hot_add_one "$HOT_FILE" "sd:$(basename "$HOT_FILE")" \
      "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || {
      rm -f "$HOT_LIST"
      return 1
    }
  done <"$HOT_LIST"
  rm -f "$HOT_LIST"
  [ "$(path_identity "$HOT_SD_PATH")" = "$HOT_SD_DIR_ID" ] || return 1
}

hot_namespace_id() {
  readlink "/proc/$1/ns/mnt" 2>/dev/null
}

hot_namespace_has_target() {
  nsenter --mount=/proc/"$1"/ns/mnt -- test -d "$2" 2>/dev/null
}

hot_collect_namespaces() {
  HOT_NS_FILE="$1"
  HOT_TARGET="$2"
  : >"$HOT_NS_FILE"
  HOT_SEEN="|"

  for HOT_PID in 1 $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$HOT_PID/ns" ] || continue
    HOT_NS=$(hot_namespace_id "$HOT_PID")
    [ -n "$HOT_NS" ] || continue
    case "$HOT_SEEN" in *"|$HOT_NS|"*) continue ;; esac
    hot_namespace_has_target "$HOT_PID" "$HOT_TARGET" || continue
    echo "$HOT_NS|$HOT_PID" >>"$HOT_NS_FILE"
    HOT_SEEN="$HOT_SEEN$HOT_NS|"
  done

  for HOT_PROC in /proc/[0-9]*; do
    [ -d "$HOT_PROC/ns" ] || continue
    HOT_PID=${HOT_PROC##*/}
    HOT_NS=$(hot_namespace_id "$HOT_PID")
    [ -n "$HOT_NS" ] || continue
    case "$HOT_SEEN" in *"|$HOT_NS|"*) continue ;; esac
    hot_namespace_has_target "$HOT_PID" "$HOT_TARGET" || continue
    echo "$HOT_NS|$HOT_PID" >>"$HOT_NS_FILE"
    HOT_SEEN="$HOT_SEEN$HOT_NS|"
  done
}

hot_source_for_pid() {
  HOT_PID="$1"
  if nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- test -d "$HOT_CERTS" 2>/dev/null; then
    echo "$HOT_CERTS"
  elif nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- test -d "/proc/1/root$HOT_CERTS" 2>/dev/null; then
    echo "/proc/1/root$HOT_CERTS"
  else
    return 1
  fi
}

hot_marker_for_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    sh -c "cat '$HOT_TARGET/$HOT_MARKER' 2>/dev/null" 2>/dev/null | tr -d '\r\n'
}

hot_path_identity_for_pid() {
  HOT_PID="$1"
  HOT_PATH="$2"
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- stat -c '%d:%i' "$HOT_PATH" 2>/dev/null | \
    tr -d '\r\n'
}

hot_mount_id_for_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    awk -v target="$HOT_TARGET" '
      $5 == target && ($1 + 0) > max { max=$1 }
      END { if (max) print max }
    ' /proc/self/mountinfo 2>/dev/null | tr -d '\r\n'
}

hot_ledger_has_mount_id() {
  HOT_MOUNT_ID="$1"
  HOT_NS="$2"
  [ -n "$HOT_MOUNT_ID" ] && [ -f "$HOT_LEDGER" ] || return 1
  awk -F'|' -v id="$HOT_MOUNT_ID" -v ns="$HOT_NS" '
    $1 == "mounted" && $3 == id { found=1 }
    $1 == "unmounted" && $2 == ns && $3 == id { removed=1 }
    END { exit !(found && !removed) }
  ' \
    "$HOT_LEDGER" 2>/dev/null
}

hot_mount_points_to_source() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_MOUNT_ID="$3"
  HOT_MOUNT_LINE=$(nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    awk -v target="$HOT_TARGET" -v id="$HOT_MOUNT_ID" \
      '$1 == id && $5 == target { print; exit }' /proc/self/mountinfo 2>/dev/null)
  case "$HOT_MOUNT_LINE" in
    *"$HOT_CERTS"*|*"/adb/modules/CertBridge/certs/hot/current/cacerts"*|*"/CertBridge/certs/hot/current/cacerts"*)
      return 0
      ;;
  esac
  return 1
}

hot_top_owned_by_session() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_SESSION="$3"
  HOT_SOURCE_ID=$(hot_read_state source_identity)
  [ -n "$HOT_SOURCE_ID" ] || return 1
  [ "$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SESSION" ] || return 1
  HOT_TARGET_ID=$(hot_path_identity_for_pid "$HOT_PID" "$HOT_TARGET")
  [ "$HOT_TARGET_ID" = "$HOT_SOURCE_ID" ] || return 1
  HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
  HOT_NS=$(hot_namespace_id "$HOT_PID")
  hot_ledger_has_mount_id "$HOT_MOUNT_ID" "$HOT_NS" || \
    hot_mount_points_to_source "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID"
}

hot_namespace_may_reference_session() {
  HOT_PID="$1"
  HOT_NS="$2"
  HOT_TARGET="$3"
  HOT_SESSION="$4"
  [ -f "$HOT_LEDGER" ] || return 0

  if [ "$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SESSION" ]; then
    return 0
  fi
  HOT_LEDGER_BOOT=$(hot_read_state boot_id)
  HOT_CURRENT_BOOT=$(hot_boot_id)
  if [ -n "$HOT_LEDGER_BOOT" ] && [ "$HOT_LEDGER_BOOT" = "$HOT_CURRENT_BOOT" ] && \
      awk -F'|' -v ns="$HOT_NS" '
      ($1 == "mounted" && $2 == ns) { mounted[$3]=1 }
      ($1 == "unmounted" && $2 == ns) { delete mounted[$3] }
      ($1 == "intent" && $2 == ns) { intent=1 }
      ($1 == "mounted" && $2 == ns) { resolved=1 }
      ($1 == "failed" && $2 == ns) { resolved=1 }
      ($1 == "uncertain" && $2 == ns) { uncertain=1 }
      END {
        for (id in mounted) found=1
        exit !(found || uncertain || (intent && !resolved))
      }
    ' "$HOT_LEDGER" 2>/dev/null; then
    return 0
  fi
  HOT_IDS=$(nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    awk -v target="$HOT_TARGET" '$5 == target { print $1 }' /proc/self/mountinfo 2>/dev/null)
  for HOT_MOUNT_ID in $HOT_IDS; do
    hot_ledger_has_mount_id "$HOT_MOUNT_ID" "$HOT_NS" && return 0
    hot_mount_points_to_source "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" && return 0
  done
  return 1
}

hot_verify_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_SESSION="$3"
  HOT_EXPECTED="$4"
  [ "$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SESSION" ] || return 1
  HOT_COUNT=$(nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
    sh -c "ls -1 '$HOT_TARGET'/*.* 2>/dev/null | wc -l" 2>/dev/null | tr -d ' ')
  [ "${HOT_COUNT:-0}" -eq "$HOT_EXPECTED" ]
}

hot_rollback_pid() {
  HOT_PID="$1"
  HOT_TARGET="$2"
  HOT_MOUNT_ID="$3"
  HOT_SOURCE_ID="$4"
  [ "$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_MOUNT_ID" ] || return 1
  [ "$(hot_path_identity_for_pid "$HOT_PID" "$HOT_TARGET")" = "$HOT_SOURCE_ID" ] || return 1
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- umount "$HOT_TARGET" 2>/dev/null
}

hot_bind_pid() {
  HOT_PID="$1"
  HOT_NS="$2"
  HOT_TARGET="$3"
  HOT_SESSION="$4"
  HOT_EXPECTED="$5"
  HOT_SOURCE_ID=$(hot_read_state source_identity)
  [ -n "$HOT_SOURCE_ID" ] || return 1
  HOT_EXISTING=$(hot_marker_for_pid "$HOT_PID" "$HOT_TARGET")
  [ -z "$HOT_EXISTING" ] || {
    if hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
      echo "mounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
      return 0
    fi
    return 1
  }
  HOT_SOURCE=$(hot_source_for_pid "$HOT_PID") || return 1
  nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- mount --bind "$HOT_SOURCE" "$HOT_TARGET" 2>/dev/null || \
    return 1
  HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
  HOT_TARGET_ID=$(hot_path_identity_for_pid "$HOT_PID" "$HOT_TARGET")
  if [ -z "$HOT_MOUNT_ID" ] || [ "$HOT_TARGET_ID" != "$HOT_SOURCE_ID" ]; then
    echo "uncertain|$HOT_NS|$HOT_PID" >>"$HOT_LEDGER"
    hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1
    return 1
  fi
  echo "mounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
  if ! nsenter --mount=/proc/"$HOT_PID"/ns/mnt -- \
      mount -o remount,bind,ro "$HOT_TARGET" 2>/dev/null; then
    if hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1; then
      echo "unmounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
    fi
    return 1
  fi
  if ! hot_verify_pid "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" "$HOT_EXPECTED"; then
    if hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1; then
      echo "unmounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
    fi
    return 1
  fi
}

hot_unmount_pass() {
  HOT_SESSION="$1"
  HOT_TARGET="$2"
  HOT_NS_FILE="$HOT_ROOT/.namespaces.$$"
  hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
  while IFS='|' read -r HOT_NS HOT_PID; do
    [ -n "$HOT_PID" ] || continue
    hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" || continue
    HOT_MOUNT_ID=$(hot_mount_id_for_pid "$HOT_PID" "$HOT_TARGET")
    HOT_SOURCE_ID=$(hot_read_state source_identity)
    if hot_rollback_pid "$HOT_PID" "$HOT_TARGET" "$HOT_MOUNT_ID" "$HOT_SOURCE_ID" >/dev/null 2>&1; then
      echo "unmounted|$HOT_NS|$HOT_MOUNT_ID|$HOT_SOURCE_ID|$HOT_PID" >>"$HOT_LEDGER"
    fi
  done <"$HOT_NS_FILE"
  rm -f "$HOT_NS_FILE"
}

hot_count_mounted_namespaces() {
  HOT_SESSION="$1"
  HOT_TARGET="$2"
  HOT_NS_FILE="$HOT_ROOT/.namespaces.$$"
  HOT_MOUNTED=0
  hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
  while IFS='|' read -r HOT_NS HOT_PID; do
    [ -n "$HOT_PID" ] || continue
    if hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" || \
        hot_namespace_may_reference_session "$HOT_PID" "$HOT_NS" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_MOUNTED=$((HOT_MOUNTED + 1))
    fi
  done <"$HOT_NS_FILE"
  rm -f "$HOT_NS_FILE"
  echo "$HOT_MOUNTED"
}

hot_runtime_counts() {
  HOT_SESSION="$1"
  HOT_TARGET="$2"
  HOT_NS_FILE="$HOT_ROOT/.status-namespaces.$$"
  HOT_RUNTIME_OWNED=0
  HOT_RUNTIME_PROBLEM=0
  hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
  while IFS='|' read -r HOT_NS HOT_PID; do
    [ -n "$HOT_PID" ] || continue
    if hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_RUNTIME_OWNED=$((HOT_RUNTIME_OWNED + 1))
    elif hot_namespace_may_reference_session "$HOT_PID" "$HOT_NS" "$HOT_TARGET" "$HOT_SESSION"; then
      HOT_RUNTIME_PROBLEM=$((HOT_RUNTIME_PROBLEM + 1))
    elif awk -F'|' -v ns="$HOT_NS" '$1 == "failed" && $2 == ns { found=1 } END { exit !found }' \
        "$HOT_LEDGER" 2>/dev/null; then
      HOT_RUNTIME_PROBLEM=$((HOT_RUNTIME_PROBLEM + 1))
    fi
  done <"$HOT_NS_FILE"
  rm -f "$HOT_NS_FILE"
  echo "$HOT_RUNTIME_OWNED|$HOT_RUNTIME_PROBLEM"
}

hot_unmount_internal() {
  HOT_SESSION=$(hot_read_state session_id)
  HOT_TARGET=$(hot_read_state target)
  HOT_STATE_BOOT=$(hot_read_state boot_id)
  HOT_NOW_BOOT=$(hot_boot_id)
  [ -n "$HOT_SESSION" ] || HOT_SESSION=$(cat "$HOT_CERTS/$HOT_MARKER" 2>/dev/null | tr -d '\r\n')
  [ -n "$HOT_TARGET" ] || HOT_TARGET=$(get_target_store)
  [ -n "$HOT_SESSION" ] && [ -n "$HOT_TARGET" ] || {
    [ -d "$HOT_CURRENT" ] && return 1
    rm -f "$HOT_STATE"
    return 0
  }
  if [ -n "$HOT_STATE_BOOT" ] && [ -n "$HOT_NOW_BOOT" ] && [ "$HOT_STATE_BOOT" != "$HOT_NOW_BOOT" ]; then
    HOT_REMAINING=$(hot_count_mounted_namespaces "$HOT_SESSION" "$HOT_TARGET")
    [ "$HOT_REMAINING" -eq 0 ] || return 1
    rm -rf "$HOT_CURRENT" 2>/dev/null
    rm -f "$HOT_STATE"
    return 0
  fi

  HOT_PASS=0
  while [ "$HOT_PASS" -lt 3 ]; do
    hot_unmount_pass "$HOT_SESSION" "$HOT_TARGET"
    HOT_PASS=$((HOT_PASS + 1))
  done
  HOT_REMAINING=$(hot_count_mounted_namespaces "$HOT_SESSION" "$HOT_TARGET")
  [ "$HOT_REMAINING" -eq 0 ] || return 1
  rm -rf "$HOT_CURRENT" 2>/dev/null
  rm -f "$HOT_STATE"
  log_msg "hot: session $HOT_SESSION removed without reboot"
}

hot_build_generation() {
  HOT_MODE="$1"
  HOT_SD_PATH="$2"
  HOT_TARGET=$(get_target_store)
  HOT_LIVE_SOURCE="/proc/1/root$HOT_TARGET"
  HOT_BASE_COUNT=$(count_certs "$HOT_LIVE_SOURCE")
  if [ "$HOT_BASE_COUNT" -lt "$MIN_SAFE_CERTS" ]; then
    HOT_LIVE_SOURCE="$HOT_TARGET"
    HOT_BASE_COUNT=$(count_certs "$HOT_LIVE_SOURCE")
  fi
  [ "$HOT_BASE_COUNT" -ge "$MIN_SAFE_CERTS" ] || return 1
  HOT_OPENSSL=$(find_openssl) || return 2

  HOT_STAGE="$HOT_ROOT/.new.$$"
  HOT_STAGE_CERTS="$HOT_STAGE/cacerts"
  HOT_STAGE_MAP="$HOT_STAGE/hot-certs.list"
  HOT_STAGE_LEDGER="$HOT_STAGE/mounts.list"
  rm -rf "$HOT_STAGE" 2>/dev/null
  mkdir -p "$HOT_STAGE_CERTS" || return 1
  copy_cert_store "$HOT_LIVE_SOURCE" "$HOT_STAGE_CERTS" || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  # 热挂载必须保留已启用的永久 addon，避免用「原版+用户证」盖掉 Reqable/ProxyPin
  HOT_ADDON_MAP="$HOT_STAGE/addon-certs.list"
  if ! install_addon_certs_into "$HOT_STAGE_CERTS" "$HOT_ADDON_MAP"; then
    log_msg "hot: failed to merge enabled permanent certificates"
    rm -rf "$HOT_STAGE"
    return 1
  fi
  : >"$HOT_STAGE_MAP"
  : >"$HOT_STAGE_LEDGER"
  HOT_ADDED=0
  HOT_SKIPPED=0

  case "$HOT_MODE" in
    user)
      hot_add_user_certs "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      ;;
    sd)
      hot_add_sd_certs "$HOT_SD_PATH" "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      ;;
    all)
      hot_add_user_certs "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      hot_add_sd_certs "$HOT_SD_PATH" "$HOT_STAGE_CERTS" "$HOT_STAGE_MAP" "$HOT_OPENSSL" || return 1
      ;;
    *) rm -rf "$HOT_STAGE"; return 1 ;;
  esac
  [ "$HOT_ADDED" -gt 0 ] || {
    rm -rf "$HOT_STAGE"
    return 3
  }

  HOT_SESSION="$(date +%s)-$$-$(hot_boot_id)"
  echo "$HOT_SESSION" >"$HOT_STAGE_CERTS/$HOT_MARKER"
  HOT_TOTAL=$(count_certs "$HOT_STAGE_CERTS")
  [ "$HOT_TOTAL" -ge "$HOT_BASE_COUNT" ] || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  HOT_SOURCE_ID=$(stat -c '%d:%i' "$HOT_STAGE_CERTS" 2>/dev/null | tr -d '\r\n')
  [ -n "$HOT_SOURCE_ID" ] || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  chown -R 0:0 "$HOT_STAGE" 2>/dev/null
  chmod 0755 "$HOT_STAGE" "$HOT_STAGE_CERTS" 2>/dev/null
  chmod 0644 "$HOT_STAGE_CERTS"/* "$HOT_STAGE_MAP" 2>/dev/null
  set_selinux_context "$HOT_TARGET" "$HOT_STAGE_CERTS" || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  cat >"$HOT_STAGE/session.conf" <<EOF
session_id=$HOT_SESSION
boot_id=$(hot_boot_id)
target=$HOT_TARGET
mode=$HOT_MODE
sd_path=$HOT_SD_PATH
base_count=$HOT_BASE_COUNT
store_count=$HOT_TOTAL
added_count=$HOT_ADDED
skipped_count=$HOT_SKIPPED
source_identity=$HOT_SOURCE_ID
namespace_count=0
namespace_failed=0
EOF
  chmod 0600 "$HOT_STAGE/session.conf" "$HOT_STAGE_MAP" "$HOT_STAGE_LEDGER" 2>/dev/null

  rm -rf "$HOT_CURRENT" 2>/dev/null
  mv "$HOT_STAGE" "$HOT_CURRENT" || {
    rm -rf "$HOT_STAGE"
    return 1
  }
  HOT_STATE_TMP="$HOT_STATE.tmp.$$"
  cp -f "$HOT_CURRENT/session.conf" "$HOT_STATE_TMP" || return 1
  chmod 0600 "$HOT_STATE_TMP"
  mv -f "$HOT_STATE_TMP" "$HOT_STATE" || return 1
}

hot_mount_namespaces() {
  HOT_PRIMARY=$(hot_read_state target)
  HOT_SESSION=$(hot_read_state session_id)
  HOT_EXPECTED=$(hot_read_state store_count)
  HOT_OK=0
  HOT_FAIL=0
  for HOT_TARGET in $(list_target_stores); do
    HOT_NS_FILE="$HOT_ROOT/.namespaces.$$"
    hot_collect_namespaces "$HOT_NS_FILE" "$HOT_TARGET"
    while IFS='|' read -r HOT_NS HOT_PID; do
      [ -n "$HOT_PID" ] || continue
      HOT_NS_BEFORE=$(hot_namespace_id "$HOT_PID")
      [ "$HOT_NS_BEFORE" = "$HOT_NS" ] || {
        HOT_FAIL=$((HOT_FAIL + 1))
        continue
      }
      echo "intent|$HOT_NS|$HOT_PID|$HOT_TARGET" >>"$HOT_LEDGER"
      if hot_bind_pid "$HOT_PID" "$HOT_NS" "$HOT_TARGET" "$HOT_SESSION" "$HOT_EXPECTED" && \
          [ "$(hot_namespace_id "$HOT_PID")" = "$HOT_NS" ]; then
        HOT_OK=$((HOT_OK + 1))
      else
        echo "failed|$HOT_NS|$HOT_PID|$HOT_TARGET" >>"$HOT_LEDGER"
        HOT_FAIL=$((HOT_FAIL + 1))
      fi
    done <"$HOT_NS_FILE"
    rm -f "$HOT_NS_FILE"
  done
  HOT_CRITICAL_FAIL=0
  for HOT_PID in 1 $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$HOT_PID/ns" ] || continue
    hot_top_owned_by_session "$HOT_PID" "$HOT_PRIMARY" "$HOT_SESSION" || HOT_CRITICAL_FAIL=1
  done
  if [ "$HOT_CRITICAL_FAIL" -ne 0 ]; then
    hot_unmount_internal >/dev/null 2>&1
    return 1
  fi
  hot_state_set namespace_count "$HOT_OK" || log_msg "hot: failed to persist namespace count"
  hot_state_set namespace_failed "$HOT_FAIL" || log_msg "hot: failed to persist namespace failures"
  log_msg "hot: mounted session=$HOT_SESSION mode=$(hot_read_state mode) added=$(hot_read_state added_count) namespaces=$HOT_OK failed=$HOT_FAIL"
}

hot_start() {
  HOT_MODE="$1"
  HOT_SD_PATH="$2"
  case "$HOT_MODE" in user|sd|all) ;; *) echo "error=invalid_mode"; return 1 ;; esac
  if [ "$HOT_MODE" = "sd" ] || [ "$HOT_MODE" = "all" ]; then
    hot_validate_sd_path "$HOT_SD_PATH"
    HOT_PATH_RC=$?
    [ "$HOT_PATH_RC" -eq 0 ] || {
      [ "$HOT_PATH_RC" -eq 2 ] && echo "error=sd_path_missing" || echo "error=invalid_sd_path"
      return 1
    }
  fi
  command -v nsenter >/dev/null 2>&1 || { echo "error=nsenter_unavailable"; return 1; }
  acquire_write_lock || { echo "error=busy"; return 1; }
  HOT_HAS_LOCK=1
  if ! hot_unmount_internal; then
    hot_unlock
    echo "error=previous_session_busy"
    return 1
  fi
  hot_build_generation "$HOT_MODE" "$HOT_SD_PATH"
  HOT_BUILD_RC=$?
  if [ "$HOT_BUILD_RC" -ne 0 ]; then
    hot_unlock
    case "$HOT_BUILD_RC" in
      2) echo "error=openssl_unavailable" ;;
      3) echo "error=no_valid_certificates" ;;
      *) echo "error=hot_build_failed" ;;
    esac
    return 1
  fi
  if ! hot_mount_namespaces; then
    hot_unlock
    echo "error=hot_mount_failed"
    return 1
  fi
  hot_unlock
  refresh_module_description >/dev/null
  echo "ok=1"
  echo "hot_active=1"
  echo "hot_added=$(hot_read_state added_count)"
  echo "hot_skipped=$(hot_read_state skipped_count)"
  echo "hot_namespaces=$(hot_read_state namespace_count)"
  echo "hot_failed=$(hot_read_state namespace_failed)"
}

hot_stop() {
  acquire_write_lock || { echo "error=busy"; return 1; }
  HOT_HAS_LOCK=1
  hot_stop_locked
  HOT_STOP_RC=$?
  hot_unlock
  return "$HOT_STOP_RC"
}

hot_stop_locked() {
  if hot_unmount_internal; then
    refresh_module_description >/dev/null
    echo "ok=1"
    echo "hot_active=0"
  else
    HOT_REMAINING=$(hot_count_mounted_namespaces "$(hot_read_state session_id)" "$(hot_read_state target)")
    echo "error=hot_unmount_incomplete"
    echo "hot_remaining=$HOT_REMAINING"
    return 1
  fi
}

hot_status() {
  HOT_MODE="${1:-light}"
  HOT_SESSION=$(hot_read_state session_id)
  HOT_TARGET=$(hot_read_state target)
  HOT_STATE_BOOT=$(hot_read_state boot_id)
  HOT_NOW_BOOT=$(hot_boot_id)
  if [ -z "$HOT_SESSION" ] || [ "$HOT_STATE_BOOT" != "$HOT_NOW_BOOT" ]; then
    echo "hot_active=0"
    echo "hot_stale=$([ -n "$HOT_SESSION" ] && echo 1 || echo 0)"
    echo "hot_partial=0"
    echo "hot_added=0"
    echo "hot_namespaces=0"
    echo "hot_failed=0"
    return 0
  fi

  # 默认 light：只读会话文件，供 WebUI 快速展示
  if [ "$HOT_MODE" = "light" ]; then
    HOT_FAILED=$(hot_read_state namespace_failed)
    HOT_NS=$(hot_read_state namespace_count)
    HOT_PARTIAL=0
    [ "${HOT_FAILED:-0}" -gt 0 ] && HOT_PARTIAL=1
    echo "hot_active=1"
    echo "hot_stale=0"
    echo "hot_partial=$HOT_PARTIAL"
    echo "hot_mode=$(hot_read_state mode)"
    echo "hot_added=$(hot_read_state added_count)"
    echo "hot_skipped=$(hot_read_state skipped_count)"
    echo "hot_namespaces=${HOT_NS:-0}"
    echo "hot_failed=${HOT_FAILED:-0}"
    echo "hot_sd_path=$(hot_read_state sd_path)"
    return 0
  fi

  if hot_top_owned_by_session 1 "$HOT_TARGET" "$HOT_SESSION"; then
    HOT_ACTIVE=1
  else
    HOT_ACTIVE=0
  fi
  HOT_RUNTIME=$(hot_runtime_counts "$HOT_SESSION" "$HOT_TARGET")
  HOT_MOUNTED=$(echo "$HOT_RUNTIME" | cut -d'|' -f1)
  HOT_RUNTIME_FAILED=$(echo "$HOT_RUNTIME" | cut -d'|' -f2)
  HOT_CRITICAL_FAILED=0
  for HOT_PID in $(pidof zygote 2>/dev/null) $(pidof zygote64 2>/dev/null); do
    [ -d "/proc/$HOT_PID/ns" ] || continue
    hot_top_owned_by_session "$HOT_PID" "$HOT_TARGET" "$HOT_SESSION" || \
      HOT_CRITICAL_FAILED=$((HOT_CRITICAL_FAILED + 1))
  done
  HOT_STORED_FAILED="${HOT_RUNTIME_FAILED:-0}"
  HOT_PARTIAL=0
  if [ "$HOT_ACTIVE" -eq 1 ]; then
    if [ "$HOT_STORED_FAILED" -gt 0 ] || [ "$HOT_CRITICAL_FAILED" -gt 0 ]; then
      HOT_PARTIAL=1
    fi
  fi
  echo "hot_active=$HOT_ACTIVE"
  [ "$HOT_ACTIVE" -eq 1 ] && echo "hot_stale=0" || echo "hot_stale=1"
  echo "hot_partial=$HOT_PARTIAL"
  echo "hot_critical_failed=$HOT_CRITICAL_FAILED"
  echo "hot_mode=$(hot_read_state mode)"
  echo "hot_added=$(hot_read_state added_count)"
  echo "hot_skipped=$(hot_read_state skipped_count)"
  echo "hot_namespaces=$HOT_MOUNTED"
  echo "hot_failed=$HOT_STORED_FAILED"
  echo "hot_sd_path=$(hot_read_state sd_path)"
}

case "${1:-status}" in
  mount) hot_start "$2" "$3" ;;
  unmount) hot_stop ;;
  unmount_locked)
    [ "$CERTBRIDGE_LOCK_HELD" = "1" ] || { echo "error=lock_required"; exit 1; }
    hot_stop_locked
    ;;
  status) hot_status "${2:-light}" ;;
  *)
    echo "usage: hot_mount.sh {mount <user|sd|all> [sd_path]|unmount|status [light|live]}"
    exit 1
    ;;
esac
