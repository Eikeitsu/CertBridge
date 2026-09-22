#!/system/bin/sh
# 语言探测 + 文案加载（安装 / runtime 共用）
# 配置：ui_lang=system|zh-CN|en

CB_I18N_LOADED=""
CB_UI_LANG=""

# 读系统 locale 原始串
detect_system_locale_raw() {
  raw=$(getprop persist.sys.locale 2>/dev/null | tr -d '\r')
  [ -n "$raw" ] || raw=$(getprop ro.product.locale 2>/dev/null | tr -d '\r')
  if [ -z "$raw" ]; then
    lang=$(getprop persist.sys.language 2>/dev/null | tr -d '\r')
    country=$(getprop persist.sys.country 2>/dev/null | tr -d '\r')
    if [ -n "$lang" ] && [ -n "$country" ]; then
      raw="${lang}-${country}"
    else
      raw="$lang"
    fi
  fi
  printf '%s\n' "$raw"
}

# 归一为 zh-CN | en
normalize_ui_lang() {
  raw=$(printf '%s' "$1" | tr 'A-Z' 'a-z' | tr '_' '-')
  case "$raw" in
    zh|zh-*|zh_*) echo "zh-CN" ;;
    en|en-*|en_*) echo "en" ;;
    system|"") echo "" ;;
    *) echo "en" ;;
  esac
}

# 解析最终语言：conf → system → en
resolve_ui_lang() {
  pref=$(read_conf ui_lang system 2>/dev/null || echo system)
  case "$pref" in
    zh-CN|zh_CN|zh) echo "zh-CN"; return 0 ;;
    en|en-US|en_US) echo "en"; return 0 ;;
    system|auto|"") ;;
    *)
      n=$(normalize_ui_lang "$pref")
      [ -n "$n" ] && { echo "$n"; return 0; }
      ;;
  esac
  sys=$(normalize_ui_lang "$(detect_system_locale_raw)")
  [ -n "$sys" ] && { echo "$sys"; return 0; }
  echo "en"
}

i18n_catalog_path() {
  lang="$1"
  # 安装时 MODDIR/MODPATH；runtime 用 MODDIR
  base="${MODDIR:-${MODPATH:-}}"
  [ -n "$base" ] || base="."
  echo "$base/bin/i18n/${lang}.sh"
}

i18n_load() {
  lang="${1:-}"
  [ -n "$lang" ] || lang=$(resolve_ui_lang)
  CB_UI_LANG="$lang"
  catalog=$(i18n_catalog_path "$lang")
  if [ ! -f "$catalog" ]; then
    catalog=$(i18n_catalog_path "en")
    CB_UI_LANG="en"
  fi
  if [ ! -f "$catalog" ]; then
    CB_I18N_LOADED=""
    return 1
  fi
  # shellcheck disable=SC1090
  . "$catalog"
  CB_I18N_LOADED=1
  return 0
}

# 取文案：i18n_msg install.pick_mode
i18n_msg() {
  key="$1"
  ns="${key%%.*}"
  rest="${key#*.}"
  [ "$ns" = "$key" ] && rest=""
  var="MSG_${ns}"
  if [ -n "$rest" ]; then
    flat=$(printf '%s' "$rest" | tr '.-' '__' | tr -c 'A-Za-z0-9_' '_')
    var="MSG_${ns}_${flat}"
  fi
  # 间接展开
  eval "val=\${$var-}"
  if [ -n "$val" ]; then
    printf '%s\n' "$val"
    return 0
  fi
  printf '%s\n' "$key"
}

# 简单 {{name}} 替换：i18n_fmt 'install.ask_component' name=WebUI
# 纯 shell 替换，避免每次起 sed（status / WebUI 热路径）
i18n_fmt() {
  key="$1"
  shift
  text=$(i18n_msg "$key")
  for pair in "$@"; do
    k=${pair%%=*}
    v=${pair#*=}
    needle="{{${k}}}"
    while :; do
      case "$text" in
        *"$needle"*)
          text="${text%%"$needle"*}${v}${text#*"$needle"}"
          ;;
        *) break ;;
      esac
    done
  done
  printf '%s\n' "$text"
}

# 安装结束：若未手设则写入探测语言
i18n_seed_user_lang() {
  pref=$(read_conf ui_lang "" 2>/dev/null || true)
  case "$pref" in
    zh-CN|en|system) return 0 ;;
  esac
  lang=$(resolve_ui_lang)
  write_conf ui_lang "$lang" 2>/dev/null || true
}
