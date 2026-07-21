#!/system/bin/sh
MODDIR=${0%/*}
TEMP_APEX="/data/local/tmp/certbridge-apex-ca"
TEMP_SYSTEM="/data/local/tmp/certbridge-system-ca"
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
SYSTEM_CACERTS="/system/etc/security/cacerts"

for target in "$APEX_CACERTS" "$SYSTEM_CACERTS"; do
  umount "$target" 2>/dev/null
  nsenter --mount=/proc/1/ns/mnt -- umount "$target" 2>/dev/null
  for process in zygote zygote64 com.android.settings; do
    for pid in $(pidof "$process" 2>/dev/null); do
      nsenter --mount=/proc/"$pid"/ns/mnt -- umount "$target" 2>/dev/null
    done
  done
done

rm -rf "$TEMP_APEX" "$TEMP_SYSTEM" "${TEMP_APEX}".* "${TEMP_SYSTEM}".* 2>/dev/null
