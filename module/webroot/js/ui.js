const CasUi = {
  toast(message) {
    const snackbar = document.getElementById('snackbar');
    const text = document.getElementById('snackbarText');
    if (!snackbar || !text) return;
    text.textContent = message;
    snackbar.classList.add('show');
    clearTimeout(snackbar._timer);
    snackbar._timer = setTimeout(() => snackbar.classList.remove('show'), 2200);
  },

  toggleExpand(id) {
    document.getElementById(`expand-${id}`)?.classList.toggle('open');
    document.getElementById(`arrow-${id}`)?.classList.toggle('open');
  },

  renderChips(containerId, items, current, handler) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items
      .map((item) => {
        const active = String(current) === item.id ? ' active' : '';
        return `<div class="chip${active}" data-value="${item.id}">${item.l}</div>`;
      })
      .join('');
    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        handler(chip.dataset.value);
      });
    });
  },

  applyFontScale(scale) {
    const value = Number.isFinite(scale) ? scale : 1;
    document.documentElement.style.setProperty('--font-scale', value);
    const slider = document.getElementById('fontSlider');
    const desc = document.getElementById('fontSizeDesc');
    if (slider) slider.value = value;
    if (desc) desc.textContent = `${value.toFixed(2)}x`;
    try {
      localStorage.setItem(CAS.FONT_KEY, value);
    } catch (_) {}
    this.syncTopbarSpacer();
  },

  onFontSliderChange() {
    this.applyFontScale(parseFloat(document.getElementById('fontSlider').value));
  },

  syncTopbarSpacer() {
    const bar = document.getElementById('topbar');
    const spacer = document.getElementById('topbarSpacer');
    if (!bar || !spacer) return;
    spacer.style.height = `${Math.ceil(bar.getBoundingClientRect().height)}px`;
  }
};
