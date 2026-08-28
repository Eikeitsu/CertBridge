#!/usr/bin/env node
/**
 * CertBridge 独立热更新安全契约测试。
 *
 * 本仓库只检查 CertBridge 自身，不读取其它模块仓库。
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const hot = readFileSync(join(root, "module/bin/lib/hot_update.sh"), "utf8");
const service = readFileSync(join(root, "module/service.sh"), "utf8");
const uninstall = readFileSync(join(root, "module/uninstall.sh"), "utf8");

function requireText(text, pattern, label) {
  if (!text.includes(pattern)) {
    throw new Error(`${label}: missing ${JSON.stringify(pattern)}`);
  }
}

requireText(hot, "/data/adb/.certbridge_hot_update_payload", "external payload");
requireText(hot, 'LOCK="/data/adb/.', "lock");
requireText(hot, 'echo "$$" >"$LOCK/pid"', "lock owner");
requireText(hot, "hu_verify_file", "post-copy verification");
requireText(hot, "保留标准更新标记", "failure fallback");
requireText(hot, 'rm -rf "$PAYLOAD"', "payload cleanup");
requireText(hot, "/data/adb/.certbridge_hot_update.sh", "worker cleanup");
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

console.log("[test:hot-update] CertBridge contracts and release metadata passed");
