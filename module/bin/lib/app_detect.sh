#!/system/bin/sh
# 已安装抓包 App 的 CA 路径探测（不含导入 / 解析）

_app_cert_first_existing() {
  for p in "$@"; do
    [ -n "$p" ] || continue
    [ -f "$p" ] && { echo "$p"; return 0; }
  done
  return 1
}

# 查找已安装抓包 App 导出的 CA 路径
find_live_app_cert() {
  kind="$1"
  case "$kind" in
    reqable)
      _app_cert_first_existing \
        "/storage/emulated/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/storage/emulated/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/media/0/Android/data/com.reqable.android.pro/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android/files/certificate/reqable-root.crt" \
        "/data/user/0/com.reqable.android.pro/files/certificate/reqable-root.crt"
      ;;
    proxypin)
      _app_cert_first_existing \
        "/data/user/0/com.network.proxy/files/ca.crt" \
        "/data/user/0/com.wangyu.proxypin/files/ca.crt" \
        "/data/data/com.network.proxy/files/ca.crt" \
        "/data/data/com.wangyu.proxypin/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.network.proxy/files/ca.crt" \
        "/storage/emulated/0/Android/data/com.wangyu.proxypin/files/ca.crt"
      ;;
    httpcanary)
      _app_cert_first_existing \
        "/data/user/0/com.guoshi.httpcanary/cache/HttpCanary.pem" \
        "/data/user/0/com.guoshi.httpcanary.premium/cache/HttpCanary.pem" \
        "/data/data/com.guoshi.httpcanary/cache/HttpCanary.pem" \
        "/data/data/com.guoshi.httpcanary.premium/cache/HttpCanary.pem"
      ;;
    adguard)
      # 包名路径里的 adg 是第三方目录名，kind 统一用 adguard
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
      # 多为用户导出到下载目录；亦试常见自定义路径
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

# 可作为「自定义导入预设」探测的 kind（不含 Reqable/ProxyPin 源开关）
optional_custom_app_kinds() {
  echo "httpcanary adguard charles mitmproxy pcapdroid"
}
