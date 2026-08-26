# 由 cert_manager.sh 加载；WebUI / CLI 命令实现
# 临时热挂载命令
cmd_hot_mount() {
  mode="$1"
  sd_path="$2"
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
  [ "$(read_conf hot_allow 1)" = "1" ] || { echo "error=hot_allow_disabled"; return 1; }
  case "$mode" in user|sd|all) ;; *) echo "error=invalid_mode"; return 1 ;; esac
  sh "$BINDIR/hot_mount.sh" mount "$mode" "$sd_path"
}

cmd_hot_unmount() {
  [ -x "$BINDIR/hot_mount.sh" ] || { echo "error=hot_feature_not_installed"; return 1; }
  sh "$BINDIR/hot_mount.sh" unmount
}
