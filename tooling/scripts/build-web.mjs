#!/usr/bin/env node
/**
 * 构建 WebUI：Vite 打包 React + TS → .build/webroot，并同步到 module/webroot。
 * 旧版原生源码归档在 archives/webroot-vanilla-202608/，勿覆盖归档。
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { pruneUnusedWebImages } from "./lib/prune-unused-web-images.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(repoRoot, ".build", "webroot");
const moduleWeb = join(repoRoot, "module", "webroot");

function log(msg) {
  console.log(`[build-web] ${msg}`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Windows 下偶发 EPERM/ENOTEMPTY：重试删除，失败则改名后尽力清理 */
function removePathResilient(target) {
  if (!existsSync(target)) return;
  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    try {
      rmSync(target, { recursive: true, force: true });
      return;
    } catch (err) {
      const code = err && err.code;
      if (code !== "EPERM" && code !== "ENOTEMPTY" && code !== "EBUSY") throw err;
      sleep(120 * (i + 1));
    }
  }
  const quarantine = `${target}.__stale_${Date.now()}`;
  try {
    renameSync(target, quarantine);
    log(`quarantined locked path → ${relative(repoRoot, quarantine)}`);
    try {
      rmSync(quarantine, { recursive: true, force: true });
    } catch {
      log(`left quarantine in place (still locked): ${relative(repoRoot, quarantine)}`);
    }
  } catch (err) {
    // 整目录改名也失败：逐文件覆盖同步前，至少清出可写目标
    log(
      `warn: could not fully remove ${relative(repoRoot, target)} (${err.code || err.message})`,
    );
  }
}

function walkFiles(dir, prefix = "", out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    log(`warn: cannot read ${relative(repoRoot, dir)} (${err.code || err.message})`);
    return out;
  }
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    let isDir = entry.isDirectory();
    try {
      if (!isDir && entry.isSymbolicLink?.()) {
        isDir = statSync(abs).isDirectory();
      }
    } catch {
      /* locked entry: treat as file skip later */
    }
    if (isDir) walkFiles(abs, rel, out);
    else out.push(rel);
  }
  return out;
}

function copyFileResilient(from, to, rel) {
  mkdirSync(dirname(to), { recursive: true });
  try {
    cpSync(from, to, { force: true });
    return;
  } catch (err) {
    if (err.code !== "EPERM" && err.code !== "EBUSY" && err.code !== "EACCES") throw err;
  }
  // Windows 锁文件：改用读写；仍失败则跳过（常见于 tip.png 被预览占用）
  try {
    writeFileSync(to, readFileSync(from));
  } catch (err) {
    log(`warn: skip locked file ${rel} (${err.code || err.message})`);
  }
}

/** 无法整目录删除时：逐文件覆盖 + 删除源中已无的文件 */
function syncOverlay(src, dst) {
  mkdirSync(dst, { recursive: true });
  const files = walkFiles(src);
  for (const rel of files) {
    copyFileResilient(join(src, rel), join(dst, rel), rel);
  }
  const stale = walkFiles(dst).filter((rel) => !files.includes(rel));
  for (const rel of stale) {
    try {
      unlinkSync(join(dst, rel));
    } catch (err) {
      log(`warn: skip locked stale file ${rel} (${err.code || err.message})`);
    }
  }
}

function syncToModule() {
  removePathResilient(moduleWeb);
  if (existsSync(moduleWeb)) {
    log("overlay sync (directory still present)");
    syncOverlay(outDir, moduleWeb);
    return;
  }
  mkdirSync(moduleWeb, { recursive: true });
  cpSync(outDir, moduleWeb, { recursive: true });
}

log("vite build…");
execSync("npx vite build --config webui/vite.config.ts", {
  cwd: repoRoot,
  stdio: "inherit",
});

if (!existsSync(outDir)) {
  throw new Error("missing .build/webroot after vite build");
}

log("prune unused images");
pruneUnusedWebImages(outDir, log);

log("sync → module/webroot");
syncToModule();

const files = walkFiles(outDir);
log(`output -> ${outDir} (${files.length} files)`);
if (existsSync(moduleWeb)) {
  const synced = walkFiles(moduleWeb);
  log(
    `module -> ${moduleWeb} (${synced.length} files, ${statSync(join(moduleWeb, "js", "app.js")).size} B app.js)`,
  );
}
log("done");
