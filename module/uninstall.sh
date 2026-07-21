#!/system/bin/sh
MODDIR=${0%/*}
TEMP_APEX="/data/local/tmp/certbridge-apex-ca"
TEMP_SYSTEM="/data/local/tmp/certbridge-system-ca"
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"
SYSTEM_CACERTS="/system/etc/security/cacerts"

umount "$APEX_CACERTS" 2>/dev/null
umount "$SYSTEM_CACERTS" 2>/dev/null
umount "$TEMP_APEX" 2>/dev/null
umount "$TEMP_SYSTEM" 2>/dev/null
rm -rf "$TEMP_APEX" "$TEMP_SYSTEM" 2>/dev/null
