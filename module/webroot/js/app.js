const CasApp = {
  status: {},
  statusTimer: null,
  pendingFile: null,

  bindEvents() {
    document
      .getElementById("reqableEnabled")
      ?.addEventListener("change", () => this.toggleBuiltin("reqable"));
    document
      .getElementById("proxypinEnabled")
      ?.addEventListener("change", () => this.toggleBuiltin("proxypin"));

    document.querySelectorAll(".pref[data-expand]").forEach((node) => {
      node.addEventListener("click", (event) => {
        if (event.target.closest(".hyper-switch")) return;
        if (event.target.closest("button")) return;
        CasUi.toggleExpand(node.dataset.expand);
      });
    });

    document.querySelectorAll(".pref[data-url]").forEach((node) => {
      node.addEventListener("click", () => CasApi.openUrl(node.dataset.url));
    });

    document
      .getElementById("refreshStatusBtn")
      ?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.refreshStatus(true);
      });
    document.getElementById("refreshLogBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.refreshLog(true);
    });
    document.getElementById("clearLogBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearLog();
    });
    document.getElementById("rebootBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.reboot();
    });
    document.getElementById("pickCertBtn")?.addEventListener("click", () => {
      document.getElementById("certFile")?.click();
    });
    document
      .getElementById("certFile")
      ?.addEventListener("change", () => this.onPickFile());
    document
      .getElementById("hotUserBtn")
      ?.addEventListener("click", () => this.hotMount("user"));
    document
      .getElementById("hotSdBtn")
      ?.addEventListener("click", () => this.hotMount("sd"));
    document
      .getElementById("hotAllBtn")
      ?.addEventListener("click", () => this.hotMount("all"));
    document
      .getElementById("hotUnmountBtn")
      ?.addEventListener("click", () => this.hotUnmount());
    document
      .getElementById("fontSlider")
      ?.addEventListener("input", () => CasUi.onFontSliderChange());

    window.addEventListener("resize", () => CasUi.syncTopbarSpacer());
    window.visualViewport?.addEventListener("resize", () =>
      CasUi.syncTopbarSpacer(),
    );
  },

  async toggleBuiltin(name) {
    const map = {
      reqable: "reqableEnabled",
      proxypin: "proxypinEnabled",
    };
    const el = document.getElementById(map[name]);
    const value = el?.checked ? "1" : "0";
    CasUi.toast("正在保存…");
    const result = await CasApi.cli(`toggle ${name} ${value}`);
    if (result.errno !== 0 || !result.stdout.includes("ok=1")) {
      if (el) el.checked = value !== "1";
      CasUi.toast("保存失败，请查看日志");
      return;
    }
    await this.refreshStatus(false);
    CasUi.toast("已保存，重启后生效");
  },

  async reboot() {
    if (!window.confirm("确认重启设备？")) return;
    CasUi.toast("正在重启…");
    await CasApi.exec("reboot");
  },

  getHotSdPath() {
    const path =
      document.getElementById("hotSdPath")?.value?.trim() ||
      "/sdcard/CertBridge";
    if (
      !/^\/(?:sdcard\/|storage\/(?:emulated\/|self\/primary\/)|mnt\/media_rw\/)/.test(
        path,
      ) ||
      path.includes("..") ||
      /['"`\r\n]/.test(path)
    ) {
      throw new Error("invalid_sd_path");
    }
    return path;
  },

  async hotMount(mode) {
    let path = "/sdcard/CertBridge";
    if (mode !== "user") {
      try {
        path = this.getHotSdPath();
      } catch (_) {
        CasUi.toast("存储卡路径不安全或不受支持");
        return;
      }
    }
    const labels = {
      user: "用户凭据区",
      sd: "存储卡目录",
      all: "用户凭据区与存储卡目录",
    };
    if (!window.confirm(`立即挂载${labels[mode]}中的有效 CA？该操作无需重启。`))
      return;
    CasUi.toast("正在建立临时证书会话…");
    const result = await CasApi.cli(`hot_mount ${mode} '${path}'`, 180000);
    const data = CasApi.parseKv(result.stdout);
    if (result.errno !== 0 || data.ok !== "1") {
      const errors = {
        invalid_sd_path: "存储卡路径不受支持",
        sd_path_missing: "证书目录不存在",
        openssl_unavailable: "设备缺少 OpenSSL，无法安全校验证书",
        no_valid_certificates: "没有找到有效且未过期的 CA 证书",
        previous_session_busy: "旧临时会话未能完整卸载",
        hot_build_failed: "临时证书集合生成失败",
        hot_mount_failed: "命名空间挂载或校验失败",
        nsenter_unavailable: "设备缺少 nsenter",
        hot_feature_not_installed: "安装时未选择免重启热挂载功能",
      };
      CasUi.toast(errors[data.error] || `挂载失败：${data.error || "unknown"}`);
      await this.refreshStatus(false);
      return;
    }
    const failed = Number(data.hot_failed || 0);
    CasUi.toast(
      failed > 0
        ? `已挂载 ${data.hot_added || 0} 张，${failed} 个命名空间未覆盖`
        : `已免重启挂载 ${data.hot_added || 0} 张证书`,
    );
    await this.refreshStatus(false);
  },

  async hotUnmount() {
    if (!window.confirm("无痕卸载当前临时证书会话？永久配置不会改变。")) return;
    CasUi.toast("正在安全卸载临时证书…");
    const result = await CasApi.cli("hot_unmount", 180000);
    const data = CasApi.parseKv(result.stdout);
    if (result.errno !== 0 || data.ok !== "1") {
      CasUi.toast(
        `卸载未完成，仍有 ${data.hot_remaining || "?"} 个命名空间，请重试或重启`,
      );
      await this.refreshStatus(false);
      return;
    }
    CasUi.toast("临时证书已无痕卸载");
    await this.refreshStatus(false);
  },

  async onPickFile() {
    const input = document.getElementById("certFile");
    const file = input?.files?.[0];
    if (!file) return;

    const hint = document.getElementById("pickedFileHint");

    if (file.size <= 0 || file.size > 65536) {
      CasUi.toast("证书文件必须小于 64 KiB");
      input.value = "";
      return;
    }

    if (hint) hint.textContent = `已选择: ${file.name}`;
    this.pendingFile = { file };

    if (
      !window.confirm(
        `验证并添加自定义 CA「${file.name}」？变更将在重启后生效。`,
      )
    ) {
      input.value = "";
      this.pendingFile = null;
      if (hint) hint.textContent = "未选择文件";
      return;
    }

    CasUi.toast("正在安装…");
    try {
      const b64 = await new Promise((ok, no) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(",")[1] || "");
        r.onerror = no;
        r.readAsDataURL(file);
      });
      const safeB64 = b64.replace(/'/g, "");
      const result = await CasApi.cli(`install_custom '${safeB64}'`);
      if (result.stdout.includes("ok=1")) {
        const savedName = CasApi.parseKv(result.stdout).filename || "证书";
        CasUi.toast(`${savedName} 已保存，重启后生效`);
      } else {
        const error = CasApi.parseKv(result.stdout).error || "unknown";
        const labels = {
          openssl_unavailable: "设备缺少 OpenSSL，无法安全校验证书",
          invalid_x509: "不是有效的 X.509 证书",
          expired_certificate: "证书已过期或尚未生效",
          not_ca_certificate: "证书不具备 CA:TRUE 属性",
          invalid_size: "证书文件大小不正确",
        };
        CasUi.toast(labels[error] || `安装失败：${error}`);
      }
    } catch (e) {
      CasUi.toast("安装失败");
    }
    input.value = "";
    this.pendingFile = null;
    if (hint) hint.textContent = "未选择文件";
    await this.refreshStatus(false);
    await this.refreshCustomList();
  },

  async refreshCustomList() {
    const box = document.getElementById("customList");
    if (!box) return;
    const result = await CasApi.cli("list_custom");
    const lines = result.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("custom|"));
    if (!lines.length) {
      box.innerHTML =
        '<div class="field-hint" style="padding:8px 0">暂无自定义证书</div>';
      return;
    }
    box.innerHTML = lines
      .map((line) => {
        const name = line.split("|")[1];
        return `<div class="kv-row"><span class="k">${name}</span><span class="v"><button type="button" class="chip chip-btn" data-rm="${name}">删除</button></span></div>`;
      })
      .join("");
    box.querySelectorAll("[data-rm]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const n = btn.dataset.rm;
        if (!window.confirm(`删除 ${n}？`)) return;
        const result = await CasApi.cli(`remove_custom '${n}'`);
        if (result.errno !== 0 || !result.stdout.includes("ok=1")) {
          CasUi.toast("删除失败");
          return;
        }
        CasUi.toast("已删除，重启后生效");
        await this.refreshStatus(false);
        await this.refreshCustomList();
      });
    });
  },

  async refreshStatus(showToast) {
    const badge = document.getElementById("statusBadge");
    if (!CasApi.hasBridge()) {
      document.getElementById("deviceName").textContent = "未检测到 WebUI 桥接";
      if (badge) {
        badge.className = "status-badge disabled";
        badge.textContent = "请用 KernelSU / 支持 WebUI 的管理器打开";
      }
      return;
    }

    const result = await CasApi.cli("status", 12000);
    if (result.errno === -2) {
      if (badge) {
        badge.className = "status-badge disabled";
        badge.textContent = "状态读取超时";
      }
      if (showToast) CasUi.toast("状态读取超时");
      return;
    }
    if (result.errno !== 0 || !result.stdout.includes("module_ok=1")) {
      if (badge) {
        badge.className = "status-badge disabled";
        badge.textContent = "状态读取失败";
      }
      if (showToast) CasUi.toast("状态读取失败");
      return;
    }

    const s = CasApi.parseKv(result.stdout);
    this.status = s;

    document.getElementById("statActive").textContent = s.active_count || "0";
    document.getElementById("statCustom").textContent = s.custom_count || "0";
    document.getElementById("reqableEnabled").checked =
      s.reqable_enabled === "1";
    document.getElementById("proxypinEnabled").checked =
      s.proxypin_enabled === "1";

    const hotSupported = s.hot_supported === "1";
    const hotSectionTitle = document.getElementById("hotSectionTitle");
    const hotSection = document.getElementById("hotSection");
    if (hotSectionTitle) hotSectionTitle.hidden = !hotSupported;
    if (hotSection) hotSection.hidden = !hotSupported;

    const reqSub = document.getElementById("reqableSub");
    if (reqSub)
      reqSub.textContent =
        s.reqable_active === "1"
          ? `已应用 · ${s.reqable_name || "833e2479.0"}`
          : "未应用";
    const ppSub = document.getElementById("proxypinSub");
    if (ppSub)
      ppSub.textContent =
        s.proxypin_active === "1"
          ? `已应用 · ${s.proxypin_name || "243f0bfb.0"}`
          : "未应用";

    const hotActive = s.hot_active === "1";
    const hotFailedCount = Number(s.hot_failed || 0);
    const hotPartial = s.hot_partial === "1";
    const hotStatus = document.getElementById("hotStatus");
    if (hotStatus) {
      const modes = {
        user: "用户证书",
        sd: "存储卡证书",
        all: "用户 + 存储卡",
      };
      hotStatus.textContent = hotActive
        ? `${hotPartial ? "部分挂载" : "已挂载"} · ${modes[s.hot_mode] || "临时会话"}`
        : s.hot_stale === "1"
          ? "状态异常 · 建议卸载或重启"
          : "未挂载";
    }
    const hotAdded = document.getElementById("hotAdded");
    if (hotAdded) hotAdded.textContent = hotActive ? s.hot_added || "0" : "0";
    const hotNamespaces = document.getElementById("hotNamespaces");
    if (hotNamespaces)
      hotNamespaces.textContent = hotActive ? s.hot_namespaces || "0" : "0";
    const hotHint = document.getElementById("hotHint");
    if (hotHint) {
      hotHint.textContent =
        hotActive && hotPartial
          ? `${hotFailedCount} 个普通命名空间未覆盖，或关键命名空间已变化；可卸载后重试。`
          : "临时挂载在重启后自动失效；操作期间请勿同时运行其它证书挂载脚本。";
    }

    if (document.getElementById("homeAndroid")) {
      document.getElementById("homeAndroid").textContent = s.release
        ? `${s.release}`
        : "--";
    }
    if (document.getElementById("homeRoot")) {
      document.getElementById("homeRoot").textContent = s.root || "--";
    }
    if (document.getElementById("homeVersion")) {
      document.getElementById("homeVersion").textContent = s.version || "--";
    }
    const apexEl = document.getElementById("homeApex");
    if (apexEl) {
      if (s.apex_ok === "2") apexEl.textContent = "N/A";
      else if (s.apex_ok === "1") apexEl.textContent = "已注入";
      else apexEl.textContent = "失败";
    }

    const now = new Date();
    const updated = document.getElementById("homeUpdatedAt");
    if (updated) {
      updated.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
    }

    if (document.getElementById("statusDesc") && s.desc_body) {
      document.getElementById("statusDesc").textContent = s.desc_body;
    }

    if (badge) {
      badge.className = "status-badge";
      const short = s.desc_short || "";
      if (s.disabled === "1") {
        badge.textContent = short || "模块已禁用";
        badge.classList.add("disabled");
      } else if (s.pending_reboot === "1") {
        badge.textContent = hotActive
          ? short || "临时证书已挂载，永久配置待重启"
          : "配置已保存，等待重启生效";
        badge.classList.add("stopped");
      } else if (short) {
        badge.textContent = short;
        if (
          short.includes("失败") ||
          short.includes("需重装") ||
          short.includes("未启用")
        ) {
          badge.classList.add(
            short.includes("未启用") ? "disabled" : "stopped",
          );
        }
      } else if (s.apex_ok === "1" || s.apex_ok === "2") {
        badge.textContent = `正常 · ${s.active_count || 0} 张证书已启用`;
      } else {
        badge.textContent = "APEX 注入失败，请查看日志并重启";
        badge.classList.add("stopped");
      }
    }

    if (showToast) CasUi.toast("状态已刷新");
  },

  async refreshLog(showToast) {
    const lines =
      document.documentElement.getAttribute("data-layout") === "dock" ? 50 : 20;
    const result = await CasApi.exec(
      `tail -n ${lines} '${CAS.LOG_FILE}' 2>/dev/null`,
    );
    const text = result.stdout.trim();
    const box = document.getElementById("logBox");
    if (box) box.textContent = text || "暂无日志";
    const logSub = document.getElementById("logSub");
    const count = text ? text.split("\n").filter(Boolean).length : 0;
    if (logSub) logSub.textContent = count ? `最近 ${count} 行` : "暂无记录";
    if (showToast)
      CasUi.toast(result.errno === -2 ? "日志读取超时" : "日志已刷新");
  },

  async clearLog() {
    if (!window.confirm("确认清空日志？")) return;
    await CasApi.exec(`: > '${CAS.LOG_FILE}'`);
    await this.refreshLog(false);
    CasUi.toast("日志已清空");
  },

  async loadDeviceInfo() {
    const model = await CasApi.exec(
      `getprop ro.product.marketname 2>/dev/null || getprop ro.product.model 2>/dev/null`,
    );
    const el = document.getElementById("deviceName");
    if (!el) return;
    if (model.errno === -1 && model.stderr === "no_ksu_bridge") {
      el.textContent = "WebUI 桥接不可用";
      return;
    }
    el.textContent = model.stdout.trim() || "Android";
  },

  async init() {
    try {
      const savedScale = localStorage.getItem(CAS.FONT_KEY);
      if (savedScale) CasUi.applyFontScale(parseFloat(savedScale));
    } catch (_) {}

    if (typeof CasTheme !== "undefined") CasTheme.init();
    this.bindEvents();

    if (!CasApi.hasBridge()) {
      document.getElementById("deviceName").textContent = "未检测到 WebUI 桥接";
      document.getElementById("statusBadge").textContent =
        "请使用 KernelSU 等支持 WebUI 的管理器打开";
      document.getElementById("statusBadge").classList.add("disabled");
      CasUi.syncTopbarSpacer();
      CasUi.toast("当前环境无法执行 shell");
      return;
    }

    await Promise.allSettled([
      this.loadDeviceInfo(),
      this.refreshStatus(),
      this.refreshCustomList(),
      this.refreshLog(),
    ]);

    CasUi.syncTopbarSpacer();
    requestAnimationFrame(() => CasUi.syncTopbarSpacer());
    setTimeout(() => CasUi.syncTopbarSpacer(), 180);

    // 开机结果已缓存；仅手动刷新，不后台轮询
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  CasApp.init().catch((error) => {
    console.error(error);
    CasUi.toast("页面初始化失败");
  });
});
