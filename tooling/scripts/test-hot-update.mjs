#!/usr/bin/env node
/**
 * CertBridge 独立热更新安全契约测试。
 *
 * 本仓库只检查 CertBridge 自身，不读取其它模块仓库。
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const hot = readFileSync(join(root, "module/bin/lib/hot_update.sh"), "utf8");
const hotinstall = readFileSync(join(root, "module/hotinstall.sh"), "utf8");
const service = readFileSync(join(root, "module/service.sh"), "utf8");
const uninstall = readFileSync(join(root, "module/uninstall.sh"), "utf8");

function requireText(text, pattern, label) {
  if (!text.includes(pattern)) {
    throw new Error(`${label}: missing ${JSON.stringify(pattern)}`);
  }
}

function simulateHotUpdateContract() {
  const root = mkdtempSync(join(tmpdir(), "certbridge-release-contract-"));
  const oldDir = join(root, "modules/CACertStore");
  const pendingDir = join(root, "modules_update/CACertStore");
  const payloadDir = join(root, "payload/CACertStore");
  const required = ["module.prop", "service.sh", "hotinstall.sh"];
  const writeTree = (dir, files) => {
    for (const [rel, text] of Object.entries(files)) {
      const path = join(dir, rel);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
    }
  };
  try {
    writeTree(oldDir, Object.fromEntries(required.map((file) => [file, "old"])));
    writeTree(payloadDir, Object.fromEntries(required.map((file) => [file, "new"])));
    writeFileSync(join(oldDir, "update"), "");
    cpSync(payloadDir, pendingDir, { recursive: true });
    cpSync(payloadDir, oldDir, { recursive: true, force: true });
    if (required.some((file) => readFileSync(join(oldDir, file), "utf8") !== "new")) {
      throw new Error("successful install did not replace every required file");
    }
    rmSync(pendingDir, { recursive: true, force: true });
    rmSync(join(oldDir, "update"), { force: true });
    rmSync(payloadDir, { recursive: true, force: true });
    if (
      existsSync(pendingDir) ||
      existsSync(join(oldDir, "update")) ||
      existsSync(payloadDir)
    ) {
      throw new Error("successful install left temporary release state");
    }

    writeTree(oldDir, Object.fromEntries(required.map((file) => [file, "old"])));
    writeTree(payloadDir, { "module.prop": "new" });
    writeFileSync(join(oldDir, "update"), "");
    if (required.some((file) => !existsSync(join(payloadDir, file)))) {
      if (!existsSync(join(oldDir, "update")))
        throw new Error("failed install lost update marker");
      if (readFileSync(join(oldDir, "module.prop"), "utf8") !== "old") {
        throw new Error("failed install modified active module");
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

requireText(hot, "/data/adb/.certbridge_hot_update_payload", "external payload");
requireText(hot, 'LOCK="/data/adb/.', "lock");
requireText(hot, 'echo "$$" >"$LOCK/pid"', "lock owner");
requireText(hot, "hu_verify_file", "post-copy verification");
requireText(hot, "保留标准更新标记", "failure fallback");
requireText(hot, 'rm -rf "$PAYLOAD"', "payload cleanup");
requireText(hot, "/data/adb/.certbridge_hot_update.sh", "worker cleanup");
requireText(hotinstall, 'setsid sh "$MODDIR/service.sh"', "detached service");
requireText(hotinstall, 'nohup sh "$MODDIR/service.sh"', "fallback service");
if (hot.indexOf("hu_verify_file") >= hot.indexOf('rm -f "$OLD/update"')) {
  throw new Error("verification must precede marker cleanup");
}

requireText(uninstall, "/data/adb/.certbridge_hot_update_payload", "uninstall payload");
requireText(uninstall, "/data/adb/.CACertStore.hot_update.lock", "uninstall lock");
requireText(uninstall, "/data/adb/.certbridge_hot_update.sh", "uninstall worker");
requireText(uninstall, "/data/adb/modules_update/CACertStore", "uninstall staged module");
requireText(service, "/data/adb/.CACertStore.hot_update.lock", "service stale lock");

const update = JSON.parse(readFileSync(join(root, "docs/public/update.json"), "utf8"));
if (!update.version || !update.versionCode || !update.zipUrl.includes("CertBridge_")) {
  throw new Error("docs/public/update.json is incomplete");
}
simulateHotUpdateContract();

console.log("[test:hot-update] CertBridge contracts and release metadata passed");
