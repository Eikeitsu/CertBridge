const CasApi = {
  EXEC_TIMEOUT: 12000,

  hasBridge() {
    return typeof ksu !== "undefined" && typeof ksu.exec === "function";
  },

  exec(cmd, timeout = this.EXEC_TIMEOUT) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const timer = setTimeout(() => {
        delete window[cb];
        finish({ errno: -2, stdout: "", stderr: "timeout" });
      }, timeout);

      if (!this.hasBridge()) {
        clearTimeout(timer);
        finish({ errno: -1, stdout: "", stderr: "no_ksu_bridge" });
        return;
      }

      const cb = `cb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      window[cb] = (errno, stdout, stderr) => {
        clearTimeout(timer);
        delete window[cb];
        finish({
          errno: typeof errno === "number" ? errno : 0,
          stdout: stdout == null ? "" : String(stdout),
          stderr: stderr == null ? "" : String(stderr),
        });
      };

      try {
        ksu.exec(cmd, "{}", cb);
      } catch (error) {
        try {
          ksu.exec(cmd, cb);
        } catch (error2) {
          clearTimeout(timer);
          delete window[cb];
          finish({ errno: -1, stdout: "", stderr: String(error2 || error) });
        }
      }
    });
  },

  async cli(args, timeout) {
    const result = await this.exec(`sh '${CAS.CLI}' ${args}`, timeout);
    return result;
  },

  parseKv(stdout) {
    const out = {};
    String(stdout || "")
      .split("\n")
      .forEach((line) => {
        const i = line.indexOf("=");
        if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      });
    return out;
  },

  openUrl(url) {
    return this.exec(
      `am start -a android.intent.action.VIEW -d '${url}' >/dev/null 2>&1`,
    );
  },
};
