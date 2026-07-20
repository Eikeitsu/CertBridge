const CasApp = {
  status: {},
  statusTimer: null,
  pendingFile: null,

  bindEvents() {
    document.getElementById('reqableEnabled')?.addEventListener('change', () => this.toggleBuiltin('reqable'));
    document.getElementById('proxypinEnabled')?.addEventListener('change', () => this.toggleBuiltin('proxypin'));
    document.getElementById('autoReinject')?.addEventListener('change', () => this.toggleBuiltin('auto_reinject'));

    document.querySelectorAll('.pref[data-expand]').forEach((node) => {
      node.addEventListener('click', (event) => {
        if (event.target.closest('.hyper-switch')) return;
        if (event.target.closest('button')) return;
        CasUi.toggleExpand(node.dataset.expand);
      });
    });

    document.querySelectorAll('.pref[data-url]').forEach((node) => {
      node.addEventListener('click', () => CasApi.openUrl(node.dataset.url));
    });

    document.getElementById('refreshStatusBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.refreshStatus(true);
    });
    document.getElementById('refreshLogBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.refreshLog(true);
    });
    document.getElementById('clearLogBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearLog();
    });
    document.getElementById('reinjectBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.reinject();
    });
    document.getElementById('syncBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sync();
    });
    document.getElementById('rebootBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.reboot();
    });
    document.getElementById('pickCertBtn')?.addEventListener('click', () => {
      document.getElementById('certFile')?.click();
    });
    document.getElementById('certFile')?.addEventListener('change', () => this.onPickFile());
    document.getElementById('fontSlider')?.addEventListener('input', () => CasUi.onFontSliderChange());

    window.addEventListener('resize', () => CasUi.syncTopbarSpacer());
    window.visualViewport?.addEventListener('resize', () => CasUi.syncTopbarSpacer());
  },

  async toggleBuiltin(name) {
    const map = {
      reqable: 'reqableEnabled',
      proxypin: 'proxypinEnabled',
      auto_reinject: 'autoReinject'
    };
    const el = document.getElementById(map[name]);
    const value = el?.checked ? '1' : '0';
    CasUi.toast('正在应用…');
    await CasApi.cli(`toggle ${name} ${value}`);
    await this.refreshStatus(false);
    CasUi.toast(value === '1' ? '已开启' : '已关闭');
  },

  async reinject() {
    CasUi.toast('正在重新注入…');
    await CasApi.cli('reinject');
    await this.refreshStatus(false);
    CasUi.toast('注入完成');
  },

  async sync() {
    CasUi.toast('正在同步…');
    await CasApi.cli('sync');
    await this.refreshStatus(false);
    await this.refreshCustomList();
    CasUi.toast('同步完成');
  },

  async reboot() {
    if (!window.confirm('确认重启设备？')) return;
    CasUi.toast('正在重启…');
    await CasApi.exec('reboot');
  },

  async onPickFile() {
    const input = document.getElementById('certFile');
    const file = input?.files?.[0];
    if (!file) return;

    let name = file.name.trim().toLowerCase();
    const hint = document.getElementById('pickedFileHint');

    if (!/^[0-9a-f]{8}\.0$/.test(name)) {
      const rename = window.prompt(
        '文件名需为 8 位 hex + .0（如 a1b2c3d4.0）\n请输入目标文件名：',
        name.replace(/\.(pem|crt|cer)$/i, '') + '.0'
      );
      if (!rename || !/^[0-9a-f]{8}\.0$/.test(rename.trim().toLowerCase())) {
        CasUi.toast('文件名格式不正确');
        input.value = '';
        return;
      }
      name = rename.trim().toLowerCase();
    }

    if (hint) hint.textContent = `已选择: ${file.name} → ${name}`;
    this.pendingFile = { file, name };

    if (!window.confirm(`安装自定义证书 ${name}？`)) {
      input.value = '';
      this.pendingFile = null;
      if (hint) hint.textContent = '未选择文件';
      return;
    }

    CasUi.toast('正在安装…');
    try {
      const b64 = await new Promise((ok, no) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result).split(',')[1] || '');
        r.onerror = no;
        r.readAsDataURL(file);
      });
      const safeB64 = b64.replace(/'/g, '');
      const result = await CasApi.cli(`install_custom '${safeB64}' '${name}'`);
      if (result.stdout.includes('ok=1')) {
        CasUi.toast('安装成功，建议重启');
      } else {
        CasUi.toast('安装失败');
      }
    } catch (e) {
      CasUi.toast('安装失败');
    }
    input.value = '';
    this.pendingFile = null;
    if (hint) hint.textContent = '未选择文件';
    await this.refreshStatus(false);
    await this.refreshCustomList();
  },

  async refreshCustomList() {
    const box = document.getElementById('customList');
    if (!box) return;
    const result = await CasApi.cli('list_custom');
    const lines = result.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('custom|'));
    if (!lines.length) {
      box.innerHTML = '<div class="field-hint" style="padding:8px 0">暂无自定义证书</div>';
      return;
    }
    box.innerHTML = lines
      .map((line) => {
        const name = line.split('|')[1];
        return `<div class="kv-row"><span class="k">${name}</span><span class="v"><button type="button" class="chip chip-btn" data-rm="${name}">删除</button></span></div>`;
      })
      .join('');
    box.querySelectorAll('[data-rm]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const n = btn.dataset.rm;
        if (!window.confirm(`删除 ${n}？`)) return;
        await CasApi.cli(`remove_custom '${n}'`);
        CasUi.toast('已删除');
        await this.refreshStatus(false);
        await this.refreshCustomList();
      });
    });
  },

  async refreshStatus(showToast) {
    const badge = document.getElementById('statusBadge');
    if (!CasApi.hasBridge()) {
      document.getElementById('deviceName').textContent = '未检测到 WebUI 桥接';
      if (badge) {
        badge.className = 'status-badge disabled';
        badge.textContent = '请用 KernelSU / 支持 WebUI 的管理器打开';
      }
      return;
    }

    const result = await CasApi.cli('status');
    if (result.errno === -2) {
      if (badge) {
        badge.className = 'status-badge disabled';
        badge.textContent = '状态读取超时';
      }
      if (showToast) CasUi.toast('状态读取超时');
      return;
    }

    const s = CasApi.parseKv(result.stdout);
    this.status = s;

    document.getElementById('statActive').textContent = s.active_count || '0';
    document.getElementById('statCustom').textContent = s.custom_count || '0';
    document.getElementById('reqableEnabled').checked = s.reqable_enabled === '1';
    document.getElementById('proxypinEnabled').checked = s.proxypin_enabled === '1';
    document.getElementById('autoReinject').checked = s.auto_reinject !== '0';

    const reqSub = document.getElementById('reqableSub');
    if (reqSub) reqSub.textContent = s.reqable_active === '1' ? '已挂载 · 833e2479.0' : '未挂载 · 833e2479.0';
    const ppSub = document.getElementById('proxypinSub');
    if (ppSub) ppSub.textContent = s.proxypin_active === '1' ? '已挂载 · 243f0bfb.0' : '未挂载 · 243f0bfb.0';

    if (document.getElementById('homeAndroid')) {
      document.getElementById('homeAndroid').textContent = s.release ? `${s.release}` : '--';
    }
    if (document.getElementById('homeRoot')) {
      document.getElementById('homeRoot').textContent = s.root || '--';
    }
    if (document.getElementById('homeVersion')) {
      document.getElementById('homeVersion').textContent = s.version || '--';
    }
    const apexEl = document.getElementById('homeApex');
    if (apexEl) {
      if (s.apex_ok === '2') apexEl.textContent = 'N/A';
      else if (s.apex_ok === '1') apexEl.textContent = '已注入';
      else apexEl.textContent = '待注入';
    }

    const now = new Date();
    const updated = document.getElementById('homeUpdatedAt');
    if (updated) {
      updated.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, '0'))
        .join(':');
    }

    if (badge) {
      badge.className = 'status-badge';
      if (s.disabled === '1') {
        badge.textContent = '模块已禁用';
        badge.classList.add('disabled');
      } else if (s.apex_ok === '1' || s.apex_ok === '2') {
        badge.textContent = `正常 · ${s.active_count || 0} 张证书已启用`;
      } else {
        badge.textContent = '证书已同步，APEX 待注入（可点重新注入或重启）';
        badge.classList.add('stopped');
      }
    }

    if (showToast) CasUi.toast('状态已刷新');
  },

  async refreshLog(showToast) {
    const lines = document.documentElement.getAttribute('data-layout') === 'dock' ? 50 : 20;
    const result = await CasApi.exec(`tail -n ${lines} '${CAS.LOG_FILE}' 2>/dev/null`);
    const text = result.stdout.trim();
    const box = document.getElementById('logBox');
    if (box) box.textContent = text || '暂无日志';
    const logSub = document.getElementById('logSub');
    const count = text ? text.split('\n').filter(Boolean).length : 0;
    if (logSub) logSub.textContent = count ? `最近 ${count} 行` : '暂无记录';
    if (showToast) CasUi.toast(result.errno === -2 ? '日志读取超时' : '日志已刷新');
  },

  async clearLog() {
    if (!window.confirm('确认清空日志？')) return;
    await CasApi.exec(`: > '${CAS.LOG_FILE}'`);
    await this.refreshLog(false);
    CasUi.toast('日志已清空');
  },

  async loadDeviceInfo() {
    const model = await CasApi.exec(
      `getprop ro.product.marketname 2>/dev/null || getprop ro.product.model 2>/dev/null`
    );
    const el = document.getElementById('deviceName');
    if (!el) return;
    if (model.errno === -1 && model.stderr === 'no_ksu_bridge') {
      el.textContent = 'WebUI 桥接不可用';
      return;
    }
    el.textContent = model.stdout.trim() || 'Android';
  },

  async init() {
    try {
      const savedScale = localStorage.getItem(CAS.FONT_KEY);
      if (savedScale) CasUi.applyFontScale(parseFloat(savedScale));
    } catch (_) {}

    if (typeof CasTheme !== 'undefined') CasTheme.init();
    this.bindEvents();

    if (!CasApi.hasBridge()) {
      document.getElementById('deviceName').textContent = '未检测到 WebUI 桥接';
      document.getElementById('statusBadge').textContent = '请使用 KernelSU 等支持 WebUI 的管理器打开';
      document.getElementById('statusBadge').classList.add('disabled');
      CasUi.syncTopbarSpacer();
      CasUi.toast('当前环境无法执行 shell');
      return;
    }

    await Promise.allSettled([
      this.loadDeviceInfo(),
      this.refreshStatus(),
      this.refreshCustomList(),
      this.refreshLog()
    ]);

    CasUi.syncTopbarSpacer();
    requestAnimationFrame(() => CasUi.syncTopbarSpacer());
    setTimeout(() => CasUi.syncTopbarSpacer(), 180);

    if (this.statusTimer) clearInterval(this.statusTimer);
    this.statusTimer = setInterval(() => this.refreshStatus(), CAS.STATUS_INTERVAL);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CasApp.init().catch((error) => {
    console.error(error);
    CasUi.toast('页面初始化失败');
  });
});
