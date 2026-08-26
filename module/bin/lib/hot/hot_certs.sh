# 由 hot_mount.sh 加载；勿单独执行
# 证书归一化与收集（用户区 / 存储卡）
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
  HOT_HASH=$(openssl_subject_hash "$HOT_OPENSSL" "$HOT_INFORM" "$HOT_INPUT") || return 1
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
  [ -n "$HOT_SD_PATH" ] || HOT_SD_PATH="/sdcard/Documents/cacerts"
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
