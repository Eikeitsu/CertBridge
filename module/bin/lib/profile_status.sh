# 由 common runtime 加载
# Zygisk 过滤组件状态、安装档案、Zygisk 底座探测
# Zygisk 过滤状态：与 hide_assist 是否安装无关
zn_hide_component_present() {
  [ -d "$MODDIR/zygisk" ] || return 1
  for _zn_so in "$MODDIR/zygisk"/*.so; do
    [ -f "$_zn_so" ] && return 0
  done
  return 1
}
emit_zn_hide_status() {
  if zn_hide_component_present; then
    echo "zn_hide_supported=1"
    echo "zn_hide_allow=$(read_conf zn_hide_allow 0)"
    # 非空 zn_modules.txt 视为启用了 ZN Module 辅路径声明（禁止空壳）
    zn_mod=0
    if [ -f "$MODDIR/zn_modules.txt" ] && [ -s "$MODDIR/zn_modules.txt" ]; then
      zn_mod=1
    fi
    echo "zn_hide_zn_module=$zn_mod"
    if [ "$zn_mod" = "1" ]; then
      echo "zn_hide_summary=经典 Zygisk 过滤已安装；另含 ZN Module 辅路径声明"
    else
      echo "zn_hide_summary=经典 Zygisk 过滤已安装（mount/maps 自藏；需启用 Zygisk）"
    fi
  else
    echo "zn_hide_supported=0"
    echo "zn_hide_allow=0"
    echo "zn_hide_zn_module=0"
    echo "zn_hide_summary=未安装 Zygisk 挂载痕迹过滤（自定义安装可勾选）"
  fi
}
# 安装时写入的组件档案（WebUI 关于页）
emit_install_profile_status() {
  profile="$CONFDIR/install-profile.conf"
  read_prof() {
    key="$1"
    def="$2"
    if [ -f "$profile" ]; then
      val=$(awk -F= -v k="$key" '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$profile" 2>/dev/null | tr -d '\r')
      [ -n "$val" ] && { echo "$val"; return; }
    fi
    echo "$def"
  }
  echo "profile_webui=$(read_prof webui 1)"
  echo "profile_hot=$(read_prof hot_reload 0)"
  echo "profile_hide_assist=$(read_prof hide_assist 0)"
  echo "profile_zn_hide=$(read_prof zn_hide 0)"
  echo "profile_install_mode=$(read_prof install_mode unknown)"
}
# Zygisk 注入底座探测（与本模块 zygisk/*.so 组件是否安装无关）
_cb_mod_enabled() {
  [ -d "$1" ] && [ ! -f "$1/disable" ] && [ ! -f "$1/remove" ]
}
detect_zygisk_loader() {
  if _cb_mod_enabled /data/adb/modules/rezygisk; then
    echo rezygisk
    return 0
  fi
  if _cb_mod_enabled /data/adb/modules/zygisksu; then
    if grep -qi "NeoZygisk" /data/adb/modules/zygisksu/module.prop 2>/dev/null; then
      echo neozygisk
    else
      echo zygisknext
    fi
    return 0
  fi
  if command -v magisk >/dev/null 2>&1; then
    zrow=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk'" 2>/dev/null | tr -d '\r')
    case "$zrow" in
      *1*) echo magisk; return 0 ;;
    esac
  fi
  if [ -d /data/adb/zygisk ] || pgrep -x zygiskd >/dev/null 2>&1; then
    echo unknown
    return 0
  fi
  echo none
}
zygisk_loader_label() {
  case "$1" in
    rezygisk) echo "ReZygisk" ;;
    neozygisk) echo "NeoZygisk" ;;
    zygisknext) echo "ZygiskNext" ;;
    magisk) echo "Magisk 内置 Zygisk" ;;
    unknown) echo "疑似已启用（未识别产品）" ;;
    none) echo "未检测到" ;;
    *) echo "$1" ;;
  esac
}
emit_zygisk_loader_status() {
  loader=$(detect_zygisk_loader)
  echo "zygisk_loader=$loader"
  echo "zygisk_loader_label=$(zygisk_loader_label "$loader")"
  case "$loader" in
    none) echo "zygisk_loader_ok=0" ;;
    *) echo "zygisk_loader_ok=1" ;;
  esac
}
