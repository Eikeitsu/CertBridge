#!/system/bin/sh
# 配置读写

read_conf() {
  key="$1"
  default="${2:-}"
  [ -f "$CONF" ] || { echo "$default"; return 0; }
  val=$(awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$CONF" 2>/dev/null | tr -d '\r')
  [ -n "$val" ] && echo "$val" || echo "$default"
}

write_conf() {
  key="$1"
  value="$2"
  case "$key" in reqable|proxypin|schema_version) ;; *) return 1 ;; esac
  mkdir -p "$CONFDIR" 2>/dev/null
  tmp="$CONF.tmp.$$"
  if [ -f "$CONF" ]; then
    awk -F= -v key="$key" -v value="$value" '
      BEGIN { done=0 }
      $1 == key { print key "=" value; done=1; next }
      { print }
      END { if (!done) print key "=" value }
    ' "$CONF" >"$tmp" || return 1
  else
    echo "$key=$value" >"$tmp" || return 1
  fi
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$CONF"
}

is_enabled() {
  [ "$(read_conf "$1" "1")" = "1" ]
}
