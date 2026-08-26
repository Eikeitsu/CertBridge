# 由 cert_manager.sh 加载
# 列表 / 预设 / 指纹 / 详情（只读向）
cmd_list_custom() {
  for cert in "$CUSTOM_DIR"/*.*; do
    [ -f "$cert" ] || continue
    name=$(basename "$cert")
    is_cert_filename "$name" || continue
    display=$(read_cert_meta_display "$cert" "$name")
    display=$(echo "$display" | tr '|' '/')
    echo "custom|$name|$display"
  done
}

cmd_import_app_preset() {
  import_optional_app_preset "$1"
}

cmd_list_applied_fps() {
  list_applied_fingerprints
}

cmd_cert_info() {
  target="$1"
  case "$target" in
    reqable|proxypin)
      file=$(find_addon_cert "$target" 0) || {
        echo "error=not_found"
        return 1
      }
      ;;
    custom:*)
      name=${target#custom:}
      is_cert_filename "$name" || {
        echo "error=invalid_filename"
        return 1
      }
      file="$CUSTOM_DIR/$name"
      ;;
    *)
      echo "error=invalid_target"
      return 1
      ;;
  esac
  cert_info_from_file "$file"
}
