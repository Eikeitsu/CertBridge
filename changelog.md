# CertBridge CI


- WebUI 改为 React 工程：首页 / 证书 / 日志 / 更多，打包产物进 `webroot`
- 统一 Trust Signal 视觉与文案；外观保留深浅色、强调色与字号（去掉旧多套布局主题包）
- 概览：状态舞台优先，下拉刷新走 `status --live` 实测并写回缓存；注入失败展示可读原因与建议
- 证书页：开关、自定义导入与详情展开（指纹等可复制）；关证但未重启时提示「仍在生效」；支持热挂载入口
- 更多页：挂载模式、临时挂载路径、**动态模块简介**开关（对接 `quiet_prop`），以及关于信息
- 更多页新增**更新通道**：正式（Pages）与 CI（`ci-dist` 同分支清单+zip）；可检测并下载安装；CI 可选 jsDelivr
- 机型 / 系统信息多厂商 getprop 兜底，减少空白或只显示内部型号
- 文档站新增 [WebUI 使用说明](/guide/webui) 与界面示意图；恢复 Vite / npm 文档与 Web 构建链路
- CI：Package Module 推送 `ci-dist`（`update.json` + zip）；Build Web 只出 artifact 并串联重打包；不再用 `dist-web` 作更新通道
