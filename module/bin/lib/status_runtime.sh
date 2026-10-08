#!/system/bin/sh
# 由 status.sh 加载
# boot-epoch / runtime-status 缓存 / Root 识别 / 热挂载会话探测
current_boot_id() {
  tr -d '\r\n' </proc/sys/kernel/random/boot_id 2>/dev/null
}

# KernelSU 软重启（越狱模式常用）不换内核 boot_id，但会重跑模块脚本。
# boot-epoch 在每次 post-fs-data 递增，用来区分「同 boot_id 的不同用户态周期」。
current_boot_epoch() {
  tr -d '\r\n' <"$BOOT_EPOCH_FILE" 2>/dev/null
}

current_boot_token() {
  echo "$(current_boot_id):$(current_boot_epoch)"
}

bump_boot_epoch() {
  mkdir -p "$STATEDIR" 2>/dev/null
  old=$(current_boot_epoch)
  case "$old" in
    ""|*[!0-9]*) old=0 ;;
  esac
  echo $((old + 1)) >"$BOOT_EPOCH_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$BOOT_EPOCH_FILE.tmp.$$" "$BOOT_EPOCH_FILE"
  chmod 0600 "$BOOT_EPOCH_FILE" 2>/dev/null
}

read_runtime_status() {
  key="$1"
  [ -f "$RUNTIME_STATUS_FILE" ] || return 1
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' \
    "$RUNTIME_STATUS_FILE" 2>/dev/null | tr -d '\r'
}

runtime_status_fresh() {
  cached_token=$(read_runtime_status boot_token)
  if [ -n "$cached_token" ]; then
    [ "$cached_token" = "$(current_boot_token)" ]
    return $?
  fi
  # 兼容旧缓存：仅有 boot_id 时，还要求 epoch 为空/0（未曾软重启递增）
  cached_boot=$(read_runtime_status boot_id)
  epoch=$(current_boot_epoch)
  [ -n "$cached_boot" ] && [ "$cached_boot" = "$(current_boot_id)" ] && \
    { [ -z "$epoch" ] || [ "$epoch" = "0" ]; }
}

# phase: post-fs-data | service | manual
# apex_ok: 0|1|2  （同 check_store_injected）
write_runtime_status() {
  phase="$1"
  apex_ok="$2"
  tag="$3"
  mkdir -p "$STATEDIR" 2>/dev/null
  tmp="$RUNTIME_STATUS_FILE.tmp.$$"
  cat >"$tmp" <<EOF
boot_id=$(current_boot_id)
boot_epoch=$(current_boot_epoch)
boot_token=$(current_boot_token)
phase=$phase
apex_ok=$apex_ok
tag=$tag
updated_at=$(date +%s)
EOF
  chmod 0600 "$tmp" 2>/dev/null
  mv -f "$tmp" "$RUNTIME_STATUS_FILE"
}

# ── Root 两级探测 ──────────────────────────────────────────────
# L1 root（大类）：Magisk | KernelSU | APatch | Unknown
# L2 root_flavor（分支）：official | SukiSU | BakaSU | KernelSU-Next | …
# BakaSU 原名 ReSukiSU（旧包名 com.resukisu.resukisu，新 org.bakasu.bakasu）

_root_resolve_ksud() {
  if type hide_resolve_ksud >/dev/null 2>&1; then
    hide_resolve_ksud
    return $?
  fi
  for cand in \
    /data/adb/ksu/bin/ksud \
    /data/adb/ksud/bin/ksud \
    /data/adb/ksu/ksud; do
    [ -x "$cand" ] && echo "$cand" && return 0
  done
  return 1
}

_root_blob_has() {
  _blob="$1"
  _pat="$2"
  [ -n "$_blob" ] && [ -f "$_blob" ] || return 1
  grep -aql -i "$_pat" "$_blob" 2>/dev/null
}

_root_mgr_pkg_installed() {
  _pkg="$1"
  [ -n "$_pkg" ] || return 1
  if [ -f /data/system/packages.list ]; then
    grep -qE "^${_pkg}([[:space:]]|$)" /data/system/packages.list 2>/dev/null && return 0
  fi
  ls -1d /data/app/"${_pkg}"-* /data/app/*/"${_pkg}"-* 2>/dev/null | head -n 1 | grep -q . && return 0
  return 1
}

# 规范化分支名（旧 ReSukiSU → BakaSU）
_root_normalize_flavor() {
  case "$1" in
    ReSukiSU|resukisu|ReSuki) echo BakaSU ;;
    ""|official|Official|KernelSU) echo official ;;
    *) echo "$1" ;;
  esac
}

# L1：大类
detect_root_family() {
  if [ "$APATCH" = "true" ] || [ -d /data/adb/ap ] || [ -f /data/adb/ap/bin/apd ]; then
    echo APatch
    return 0
  fi
  if [ "$KSU" = "true" ] || [ -d /data/adb/ksu ] || [ -f /data/adb/ksu/bin/ksud ] || \
      [ -f /data/adb/ksud/bin/ksud ]; then
    echo KernelSU
    return 0
  fi
  if [ -d /data/adb/magisk ] || [ -f /data/adb/magisk/magisk ] || [ -f /sbin/magisk ] || \
      [ "$MAGISK_VER_CODE" != "" ]; then
    echo Magisk
    return 0
  fi
  echo Unknown
}

# L2：KernelSU 系分支（不含大类名本身）
detect_ksu_flavor() {
  _ksud=$(_root_resolve_ksud) || _ksud=
  _hit=

  if [ -n "$_ksud" ]; then
    # BakaSU / 旧 ReSukiSU 必须先于 SukiSU（二进制常残留 sukisu 串）
    if _root_blob_has "$_ksud" 'bakasu' || \
        _root_blob_has "$_ksud" 'org.bakasu' || \
        _root_blob_has "$_ksud" 'resukisu' || \
        _root_blob_has "$_ksud" 'com.resukisu'; then
      echo BakaSU
      return 0
    fi
    if _root_blob_has "$_ksud" 'sukisu' || \
        _root_blob_has "$_ksud" 'com.sukisu.ultra'; then
      _hit=SukiSU
    elif _root_blob_has "$_ksud" 'kernelsu-next' || \
        _root_blob_has "$_ksud" 'KernelSU-Next' || \
        _root_blob_has "$_ksud" 'ksunext' || \
        _root_blob_has "$_ksud" 'com.rifsxd.ksunext'; then
      _hit=KernelSU-Next
    elif _root_blob_has "$_ksud" '5ec1cff' && _root_blob_has "$_ksud" 'mksu'; then
      _hit=MKSU
    elif _root_blob_has "$_ksud" 'rsuntk' || _root_blob_has "$_ksud" 'com.rsuntk'; then
      _hit=RKSU
    fi
  fi

  if [ -z "$_hit" ] && [ -n "$_ksud" ]; then
    _ver=$("$_ksud" -V 2>&1) || _ver=
    [ -n "$_ver" ] || _ver=$("$_ksud" --version 2>&1) || _ver=
    if printf '%s' "$_ver" | grep -qiE 'bakasu|resukisu'; then
      _hit=BakaSU
    elif printf '%s' "$_ver" | grep -qi 'sukisu'; then
      _hit=SukiSU
    elif printf '%s' "$_ver" | grep -qiE 'kernelsu-next|ksu.?next|ksunext'; then
      _hit=KernelSU-Next
    fi
  fi

  if [ -z "$_hit" ]; then
    if _root_mgr_pkg_installed org.bakasu.bakasu || \
        _root_mgr_pkg_installed com.resukisu.resukisu; then
      _hit=BakaSU
    elif _root_mgr_pkg_installed com.sukisu.ultra || \
        _root_mgr_pkg_installed com.sukisu.ultra.debug; then
      _hit=SukiSU
    elif _root_mgr_pkg_installed com.rifsxd.ksunext || \
        _root_mgr_pkg_installed com.rifsxd.ksunext.debug; then
      _hit=KernelSU-Next
    elif _root_mgr_pkg_installed me.weishu.kernelsu; then
      _hit=official
    fi
  fi

  _root_normalize_flavor "${_hit:-official}"
}

# L2：Magisk 系分支
detect_magisk_flavor() {
  _bin=
  for cand in /data/adb/magisk/magisk /sbin/magisk; do
    [ -x "$cand" ] || [ -f "$cand" ] && _bin="$cand" && break
  done
  if [ -n "$_bin" ]; then
    if _root_blob_has "$_bin" 'kitsune' || _root_blob_has "$_bin" 'magiskdelta' || \
        _root_blob_has "$_bin" 'fox2code'; then
      echo Kitsune
      return 0
    fi
    if _root_blob_has "$_bin" 'magisk alpha' || _root_blob_has "$_bin" 'magiskalpha'; then
      echo Alpha
      return 0
    fi
  fi
  if _root_mgr_pkg_installed io.github.vvb2060.magisk || \
      _root_mgr_pkg_installed io.github.huskydg.magisk; then
    echo Kitsune
    return 0
  fi
  if _root_mgr_pkg_installed io.github.vvb2060.magisk.alpha; then
    echo Alpha
    return 0
  fi
  echo official
}

# L2：APatch 系分支
detect_apatch_flavor() {
  _apd=
  for cand in /data/adb/ap/bin/apd /data/adb/apd; do
    [ -x "$cand" ] || [ -f "$cand" ] && _apd="$cand" && break
  done
  if [ -n "$_apd" ]; then
    if _root_blob_has "$_apd" 'apatch-next' || _root_blob_has "$_apd" 'apatchnext'; then
      echo APatch-Next
      return 0
    fi
  fi
  if _root_mgr_pkg_installed me.bmax.apatch.next; then
    echo APatch-Next
    return 0
  fi
  echo official
}

# 读/写两级缓存：family|flavor
_root_cache_read() {
  [ -f "$ROOT_CACHE_FILE" ] || return 1
  _line=$(tr -d '\r\n' <"$ROOT_CACHE_FILE" 2>/dev/null)
  [ -n "$_line" ] || return 1
  # 新格式 family|flavor
  case "$_line" in
    *\|*)
      ROOT_CACHE_FAMILY=${_line%%\|*}
      ROOT_CACHE_FLAVOR=${_line#*\|}
      ROOT_CACHE_FLAVOR=$(_root_normalize_flavor "$ROOT_CACHE_FLAVOR")
      case "$ROOT_CACHE_FAMILY" in
        Magisk|KernelSU|APatch|Unknown) return 0 ;;
      esac
      return 1
      ;;
  esac
  # 旧单值缓存迁移
  case "$_line" in
    Magisk|APatch|Unknown)
      ROOT_CACHE_FAMILY=$_line
      ROOT_CACHE_FLAVOR=official
      return 0
      ;;
    KernelSU)
      ROOT_CACHE_FAMILY=KernelSU
      ROOT_CACHE_FLAVOR=official
      return 0
      ;;
    SukiSU|KernelSU-Next|MKSU|RKSU|BakaSU|ReSukiSU)
      ROOT_CACHE_FAMILY=KernelSU
      ROOT_CACHE_FLAVOR=$(_root_normalize_flavor "$_line")
      return 0
      ;;
  esac
  return 1
}

_root_cache_write() {
  _fam="$1"
  _flv="$2"
  mkdir -p "$STATEDIR" 2>/dev/null
  echo "${_fam}|${_flv}" >"$ROOT_CACHE_FILE.tmp.$$" 2>/dev/null && \
    mv -f "$ROOT_CACHE_FILE.tmp.$$" "$ROOT_CACHE_FILE" 2>/dev/null
}

# 探测并填充 ROOT_FAMILY / ROOT_FLAVOR（带 boot 缓存）
detect_root_pair() {
  if _root_cache_read; then
    ROOT_FAMILY=$ROOT_CACHE_FAMILY
    ROOT_FLAVOR=$ROOT_CACHE_FLAVOR
    return 0
  fi

  ROOT_FAMILY=$(detect_root_family)
  case "$ROOT_FAMILY" in
    KernelSU) ROOT_FLAVOR=$(detect_ksu_flavor) ;;
    Magisk) ROOT_FLAVOR=$(detect_magisk_flavor) ;;
    APatch) ROOT_FLAVOR=$(detect_apatch_flavor) ;;
    *) ROOT_FLAVOR=official ;;
  esac
  ROOT_FLAVOR=$(_root_normalize_flavor "$ROOT_FLAVOR")
  _root_cache_write "$ROOT_FAMILY" "$ROOT_FLAVOR"
}

# L1 兼容入口：只返回大类（隐藏助手 case 等用）
detect_root_impl() {
  detect_root_pair
  echo "$ROOT_FAMILY"
}

# L2 入口
detect_root_flavor() {
  detect_root_pair
  echo "$ROOT_FLAVOR"
}

# 展示用：能判出 L2 只显示分支（BakaSU），否则显示 L1（KernelSU）
format_root_label() {
  detect_root_pair
  if [ "$ROOT_FAMILY" = "Unknown" ]; then
    echo Unknown
    return 0
  fi
  if [ -n "$ROOT_FLAVOR" ] && [ "$ROOT_FLAVOR" != "official" ]; then
    echo "$ROOT_FLAVOR"
    return 0
  fi
  echo "$ROOT_FAMILY"
}

hot_session_recorded() {
  hot_state="$STATEDIR/hot-session.conf"
  [ -f "$hot_state" ] || return 1
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_boot=$(awk -F= '$1 == "boot_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_epoch=$(awk -F= '$1 == "boot_epoch" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_session" ] || return 1
  [ "$hot_boot" = "$(current_boot_id)" ] || return 1
  # 无 epoch 字段的旧会话：仅在尚未发生软重启递增时视为有效
  cur_epoch=$(current_boot_epoch)
  if [ -n "$hot_epoch" ]; then
    [ "$hot_epoch" = "$cur_epoch" ]
  else
    [ -z "$cur_epoch" ] || [ "$cur_epoch" = "0" ]
  fi
}

hot_session_active() {
  hot_session_recorded || return 1
  hot_state="$STATEDIR/hot-session.conf"
  hot_session=$(awk -F= '$1 == "session_id" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  hot_target=$(awk -F= '$1 == "target" { sub(/^[^=]*=/, ""); print; exit }' "$hot_state" 2>/dev/null)
  [ -n "$hot_target" ] || return 1
  actual=$(nsenter --mount=/proc/1/ns/mnt -- \
    sh -c "cat '$hot_target/.sess' 2>/dev/null || cat '$hot_target/certbridge_session' 2>/dev/null" 2>/dev/null | tr -d '\r\n')
  [ "$actual" = "$hot_session" ]
}

# 热更新过渡标记：正常数十秒内由 hotinstall 清除。
# 若进程被安装器杀掉会残留，导致 WebUI 一直显示「热更新中」。
# 超过 TTL 自动清除；返回 0=已清除或不存在，1=仍在进行中。
HOT_UPDATE_MARKER_TTL_SEC="${HOT_UPDATE_MARKER_TTL_SEC:-180}"
clear_stale_hot_update_marker() {
  _marker="${STATEDIR}/hot-update"
  [ -f "$_marker" ] || return 0
  _ts=$(tr -d ' \r\n' <"$_marker" 2>/dev/null)
  _now=$(date +%s 2>/dev/null | tr -d ' \r\n')
  case "$_ts" in
    ""|*[!0-9]*)
      _ts=$(stat -c %Y "$_marker" 2>/dev/null | tr -d ' \r\n')
      ;;
  esac
  case "$_ts" in
    ""|*[!0-9]*)
      rm -f "$_marker" 2>/dev/null
      return 0
      ;;
  esac
  case "$_now" in
    ""|*[!0-9]*)
      rm -f "$_marker" 2>/dev/null
      return 0
      ;;
  esac
  if [ "$((_now - _ts))" -gt "$HOT_UPDATE_MARKER_TTL_SEC" ]; then
    rm -f "$_marker" 2>/dev/null
    return 0
  fi
  return 1
}

# 证书缺省显示名（applied 第 4 列为空时）
