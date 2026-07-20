#!/system/bin/sh
MODDIR=${0%/*}
TEMP_APEX="/data/local/tmp/cacertstore-apex-ca"
APEX_CACERTS="/apex/com.android.conscrypt/cacerts"

umount "$APEX_CACERTS" 2>/dev/null
umount "$TEMP_APEX" 2>/dev/null
rm -rf "$TEMP_APEX" 2>/dev/null
