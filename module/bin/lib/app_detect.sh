#!/system/bin/sh
# 已安装抓包 App 的 CA 路径探测（不含导入 / 解析）
#
# 安装脚本与 WebUI/CLI 共用本文件。
# 差异仅在于进程 mount ns：安装多在管理器隔离 ns，其它 App 私有目录可能不可见；
# WebUI 也常在隔离 ns。需经 init ns / 目标进程 root 探测并拷出（ensure_readable_cert_file）。

_app_cert_in_init_ns() {
  p="$1"
  [ -n "$p" ] || return 1
  command -v nsenter >/dev/null 2>&1 || return 1
  [ -d /proc/1/ns/mnt ] || return 1
  nsenter --mount=/proc/1/ns/mnt -- test -f "$p" 2>/dev/null
}

# 保证当前 ns 可读：本 ns 直接返回；否则从 init ns 拷到外部目录
ensure_readable_cert_file() {
  src="$1"
  [ -n "$src" ] || return 1
  if [ -f "$src" ] && [ -r "$src" ]; then
    echo "$src"
    return 0
  fi
  # status 热路径可关 init 探测
  [ "${_APP_CERT_TRY_INIT_NS:-1}" != "0" ] || return 1
  _app_cert_in_init_ns "$src" || return 1
  probe_dir="${CB_EXT_DIR:-/data/adb/certbridge}/live_probe"
  mkdir -p "$probe_dir" 2>/dev/null || {
    probe_dir="${DATADIR:-/data/local/tmp}/live_probe"
    mkdir -p "$probe_dir" 2>/dev/null || return 1
  }
  tag=$(echo "$src" | cksum 2>/dev/null | awk '{print $1}')
  [ -n "$tag" ] || tag="x"
  dest="$probe_dir/ns_${tag}.crt"
  nsenter --mount=/proc/1/ns/mnt -- cat "$src" >"$dest" 2>/dev/null || {
    rm -f "$dest"
    return 1
  }
  [ -s "$dest" ] || {
    rm -f "$dest"
    return 1
  }
  chmod 0644 "$dest" 2>/dev/null
  echo "$dest"
}

_app_cert_first_existing() {
  for p in "$@"; do
    [ -n "$p" ] || continue
    if readable=$(ensure_readable_cert_file "$p" 2>/dev/null); then
      echo "$readable"
      return 0
    fi
  done
  return 1
}

# 管理器隔离 ns 下，经正在运行的目标 App 的 /proc/<pid>/root 读私有文件
_app_cert_via_pkg_proc() {
  pkg="$1"
  shift
  [ -n "$pkg" ] || return 1
  pids=$(pidof "$pkg" 2>/dev/null) || return 1
  [ -n "$pids" ] || return 1
  for pid in $pids; do
    [ -d "/proc/$pid/root" ] || continue
    for rel in "$@"; do
      [ -n "$rel" ] || continue
      for base in \
        "/proc/$pid/root/data/user/0/$pkg" \
        "/proc/$pid/root/data/data/$pkg" \
        "/proc/$pid/root/data/user_ce/0/$pkg"; do
        p="$base/$rel"
        if [ -f "$p" ] && [ -r "$p" ]; then
          echo "$p"
          return 0
        fi
      done
    done
  done
  return 1
}

# 在包数据目录下按文件名浅层查找（本 ns + init ns）；应对路径微调 / Android 14+ 布局变化
_app_cert_find_named() {
  name="$1"
  shift
  [ -n "$name" ] || return 1
  for root in "$@"; do
    [ -n "$root" ] || continue
    if [ -d "$root" ]; then
      hit=$(find "$root" -maxdepth 4 -type f -name "$name" 2>/dev/null | head -n 1)
      if [ -n "$hit" ]; then
        if readable=$(ensure_readable_cert_file "$hit" 2>/dev/null); then
          echo "$readable"
          return 0
        fi
      fi
    fi
    if [ "${_APP_CERT_TRY_INIT_NS:-1}" != "0" ] && \
        command -v nsenter >/dev/null 2>&1 && [ -d /proc/1/ns/mnt ]; then
      hit=$(nsenter --mount=/proc/1/ns/mnt -- \
        find "$root" -maxdepth 4 -type f -name "$name" 2>/dev/null | head -n 1)
      if [ -n "$hit" ]; then
        if readable=$(ensure_readable_cert_file "$hit" 2>/dev/null); then
          echo "$readable"
          return 0
        fi
      fi
    fi
  done
  return 1
}

_app_cert_pkg_roots() {
  pkg="$1"
  [ -n "$pkg" ] || return 1
  echo "/data/user/0/$pkg"
  echo "/data/data/$pkg"
  echo "/data/user_ce/0/$pkg"
  echo "/storage/emulated/0/Android/data/$pkg"
  echo "/data/media/0/Android/data/$pkg"
}

# 查找已安装抓包 App 导出的 CA 路径
# try_init_ns：1=本 ns 没有时经 init mount ns 再探（WebUI/安装需要）；0=仅本 ns（status 轻量）
find_live_app_cert() {
  kind="$1"
  try_init_ns="${2:-1}"
  _APP_CERT_TRY_INIT_NS="$try_init_ns"
  case "$kind" in
    reqable)
      # 固定候选：旧 reqable-root.crt + 新版 reqable-ca.crt；
      # 含 /data/data、user_ce、外置 Android/data，以及有无 certificate/ 子目录
      if path=$(_app_cert_first_existing \
        "/data/user/0/com.reqable.android/files/certificate/reqable-ca.crt" \
        "/data/user/0/com.reqable.android.pro/files/certificate/reqable-ca.crt" \
        "/data/data/com.reqable.android/files/certificate/reqable-ca.crt" \
        "/data/data/com.reqable.android.pro/files/certificate/reqable-ca.crt" \
        "/data/user_ce/0/com.reqable.android/files/certificate/reqable-ca.crt" \
        "/data/user_ce/0/com.reqable.android.pro/files/certificate/reqable-ca.crt" \
        "/data/user/0/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/user_ce/0/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/user_ce/0/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android/files/reqable-ca.crt" \
        "/data/user/0/com.reqable.android.pro/files/reqable-ca.crt" \
        "/data/data/com.reqable.android/files/reqable-ca.crt" \
        "/data/data/com.reqable.android.pro/files/reqable-ca.crt" \
        "/data/user/0/com.reqable.android/files/reqable-root.crt" \
        "/data/user/0/com.reqable.android.pro/files/reqable-root.crt" \
        "/data/data/com.reqable.android/files/reqable-root.crt" \
        "/data/data/com.reqable.android.pro/files/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android/files/certificate/reqable-ca.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/certificate/reqable-ca.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/certificate/reqable-ca.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/certificate/reqable-ca.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android/files/reqable-ca.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/reqable-ca.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/reqable-ca.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/reqable-ca.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android/files/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/reqable-root.crt"); then
        echo "$path"
        return 0
      fi
      # 管理器隔离 ns：经运行中的 Reqable 进程视图读取
      if path=$(_app_cert_via_pkg_proc com.reqable.android \
          "files/certificate/reqable-ca.crt" "files/certificate/reqable-root.crt" \
          "files/reqable-ca.crt" "files/reqable-root.crt") || \
         path=$(_app_cert_via_pkg_proc com.reqable.android.pro \
          "files/certificate/reqable-ca.crt" "files/certificate/reqable-root.crt" \
          "files/reqable-ca.crt" "files/reqable-root.crt"); then
        echo "$path"
        return 0
      fi
      # 浅层按文件名搜索（路径再变也能捡到）
      for _pkg in com.reqable.android com.reqable.android.pro; do
        # shellcheck disable=SC2046
        if path=$(_app_cert_find_named reqable-ca.crt $(_app_cert_pkg_roots "$_pkg")) || \
           path=$(_app_cert_find_named reqable-root.crt $(_app_cert_pkg_roots "$_pkg")); then
          echo "$path"
          return 0
        fi
      done
      return 1
      ;;
    proxypin)
      # Flutter getApplicationSupportDirectory：files/ 或历史 app_flutter/
      if path=$(_app_cert_first_existing \
        "/data/user/0/com.network.proxy/files/ca.crt" \
        "/data/user/0/com.wangyu.proxypin/files/ca.crt" \
        "/data/data/com.network.proxy/files/ca.crt" \
        "/data/data/com.wangyu.proxypin/files/ca.crt" \
        "/data/user_ce/0/com.network.proxy/files/ca.crt" \
        "/data/user_ce/0/com.wangyu.proxypin/files/ca.crt" \
        "/data/user/0/com.network.proxy/app_flutter/ca.crt" \
        "/data/user/0/com.wangyu.proxypin/app_flutter/ca.crt" \
        "/data/data/com.network.proxy/app_flutter/ca.crt" \
        "/data/data/com.wangyu.proxypin/app_flutter/ca.crt" \
        "/storage/emulated/0/Android/data/com.network.proxy/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.wangyu.proxypin/files/ca.crt" \
        "/data/media/0/Android/data/com.network.proxy/files/ca.crt" \
        "/data/media/0/Android/data/com.wangyu.proxypin/files/ca.crt" \
        "/storage/emulated/0/Download/ProxyPinCA.crt" \
        "/storage/emulated/0/Download/ProxyPinCA.pem" \
        "/data/media/0/Download/ProxyPinCA.crt" \
        "/sdcard/Download/ProxyPinCA.crt"); then
        echo "$path"
        return 0
      fi
      if path=$(_app_cert_via_pkg_proc com.network.proxy \
          "files/ca.crt" "app_flutter/ca.crt") || \
         path=$(_app_cert_via_pkg_proc com.wangyu.proxypin \
          "files/ca.crt" "app_flutter/ca.crt"); then
        echo "$path"
        return 0
      fi
      for _pkg in com.network.proxy com.wangyu.proxypin; do
        # shellcheck disable=SC2046
        if path=$(_app_cert_find_named ca.crt $(_app_cert_pkg_roots "$_pkg")); then
          echo "$path"
          return 0
        fi
      done
      return 1
      ;;
    httpcanary)
      _app_cert_first_existing \
        "/data/user/0/com.guoshi.httpcanary/cache/HttpCanary.pem" \
        "/data/user/0/com.guoshi.httpcanary.premium/cache/HttpCanary.pem" \
        "/data/data/com.guoshi.httpcanary/cache/HttpCanary.pem" \
        "/data/data/com.guoshi.httpcanary.premium/cache/HttpCanary.pem"
      ;;
    adguard)
      if path=$(_app_cert_first_existing \
        "/data/user/0/com.adguard.android/files/ca.crt" \
        "/data/user/0/com.adguard.android/files/certificate.crt" \
        "/data/user/0/com.adguard.android.contentblocker/files/ca.crt" \
        "/data/data/com.adguard.android/files/ca.crt" \
        "/data/user/0/com.network.adg/files/ca.crt" \
        "/data/user/0/com.network.adg/files/certificate.crt" \
        "/data/user/0/com.adg.catcher/files/ca.crt" \
        "/data/data/com.network.adg/files/ca.crt"); then
        echo "$path"
        return 0
      fi
      for dir in /data/user/0/com.adguard* /data/data/com.adguard* \
        /data/user/0/*adg* /data/data/*adg*; do
        [ -d "$dir" ] || continue
        path=$(_app_cert_first_existing \
          "$dir/files/ca.crt" \
          "$dir/files/certificate.crt" \
          "$dir/cache/ca.pem" \
          "$dir/cache/HttpCanary.pem") || continue
        echo "$path"
        return 0
      done
      return 1
      ;;
    charles)
      _app_cert_first_existing \
        "/storage/emulated/0/Download/charles-ssl-proxying-certificate.pem" \
        "/storage/emulated/0/Download/charles-proxy-ssl-proxying-certificate.pem" \
        "/data/media/0/Download/charles-ssl-proxying-certificate.pem" \
        "/sdcard/Download/charles-ssl-proxying-certificate.pem" \
        "/storage/emulated/0/Documents/charles-ssl-proxying-certificate.pem" \
        "/data/local/tmp/charles-ssl-proxying-certificate.pem"
      ;;
    mitmproxy)
      _app_cert_first_existing \
        "/storage/emulated/0/Download/mitmproxy-ca-cert.pem" \
        "/storage/emulated/0/Download/mitmproxy-ca-cert.cer" \
        "/data/media/0/Download/mitmproxy-ca-cert.pem" \
        "/sdcard/Download/mitmproxy-ca-cert.pem" \
        "/storage/emulated/0/Documents/mitmproxy-ca-cert.pem" \
        "/data/local/tmp/mitmproxy-ca-cert.pem" \
        "/data/data/org.mitmproxy.android/files/mitmproxy-ca-cert.pem"
      ;;
    pcapdroid)
      _app_cert_first_existing \
        "/data/user/0/com.emanuelef.remote_capture/files/cacert.pem" \
        "/data/user/0/com.emanuelef.remote_capture/files/ca.crt" \
        "/data/data/com.emanuelef.remote_capture/files/cacert.pem" \
        "/data/data/com.emanuelef.remote_capture/files/ca.crt" \
        "/storage/emulated/0/Download/PCAPdroid_CA.crt" \
        "/storage/emulated/0/Download/PCAPdroid_CA.pem" \
        "/sdcard/Download/PCAPdroid_CA.crt"
      ;;
    *) return 1 ;;
  esac
}

app_cert_label() {
  case "$1" in
    reqable) echo "Reqable" ;;
    proxypin) echo "ProxyPin" ;;
    httpcanary) echo "HttpCanary" ;;
    adguard) echo "ADGuard" ;;
    charles) echo "Charles" ;;
    mitmproxy) echo "mitmproxy" ;;
    pcapdroid) echo "PCAPdroid" ;;
    *) echo "$1" ;;
  esac
}

optional_custom_app_kinds() {
  echo "httpcanary adguard charles mitmproxy pcapdroid"
}
