#!/usr/bin/env node
import { execSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const moduleRoot = join(repoRoot, "module");
const staging = join(repoRoot, ".build", "staging");
const releaseDir = join(repoRoot, "release");
const builtWebDir = join(repoRoot, ".build", "webroot");

const ROOT_FILES = [
  "module.prop",
  "post-fs-data.sh",
  "service.sh",
  "customize.sh",
  "action.sh",
  "uninstall.sh",
];

function log(message) {
  console.log(`[package-module] ${message}`);
}

function readVersion() {
  const prop = readFileSync(join(moduleRoot, "module.prop"), "utf8");
  return prop.match(/^version=(.+)$/m)?.[1]?.trim() || "unknown";
}

function directoryHasFiles(path) {
  return readdirSync(path, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? directoryHasFiles(join(path, entry.name)) : true,
  );
}

const BIN_LIBS = [
  "bin/lib/log.sh",
  "bin/lib/keys.sh",
  "bin/lib/conf.sh",
  "bin/lib/lock.sh",
  "bin/lib/store.sh",
  "bin/lib/certs.sh",
  "bin/lib/openssl.sh",
  "bin/lib/app_detect.sh",
  "bin/lib/cert_parse.sh",
  "bin/lib/cert_sources.sh",
  "bin/lib/install_flow.sh",
  "bin/lib/verify.sh",
  "bin/lib/generation.sh",
  "bin/lib/status.sh",
];

const OPENSSL_ALL_BINARIES = [
  "openssl-arm",
  "openssl-arm64",
  "openssl-x64",
  "openssl-x86",
];

/** abi 短名 → 文件名；默认只打手机架构，模拟器用 OPENSSL_ABIS=all */
const OPENSSL_ABI_FILE = {
  arm: "openssl-arm",
  arm64: "openssl-arm64",
  x64: "openssl-x64",
  x86_64: "openssl-x64",
  x86: "openssl-x86",
};

function resolveOpensslPackageBinaries() {
  const raw = (process.env.OPENSSL_ABIS ?? "arm,arm64").trim().toLowerCase();
  if (raw === "all") {
    return [...OPENSSL_ALL_BINARIES];
  }
  const selected = [];
  for (const token of raw.split(/[,+\s]+/).filter(Boolean)) {
    const name = OPENSSL_ABI_FILE[token];
    if (!name) {
      throw new Error(
        `unknown OPENSSL_ABIS token "${token}" (use arm,arm64,x86,x64 or all)`,
      );
    }
    if (!selected.includes(name)) selected.push(name);
  }
  if (!selected.length) {
    throw new Error("OPENSSL_ABIS resolved to empty set");
  }
  return selected;
}

const OPENSSL_BINARIES = resolveOpensslPackageBinaries();

const OPENSSL_ZIP_URL =
  "https://github.com/JelmerDeHen/MagiskBypassCertificateTransparencyError/releases/download/v0.0.1/MagiskBypassCertificateTransparencyError.zip";

async function downloadFile(url, dest) {
  log(`downloading ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`download failed HTTP ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  log(`saved ${(buf.length / 1024 / 1024).toFixed(1)} MB -> ${dest}`);
}

function extractZip(zipPath, extractDir) {
  mkdirSync(extractDir, { recursive: true });
  if (process.platform === "win32") {
    const z = zipPath.replace(/'/g, "''");
    const d = extractDir.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${z}' -DestinationPath '${d}' -Force"`,
      { stdio: "inherit" },
    );
    return;
  }
  try {
    execSync(`unzip -qo "${zipPath}" -d "${extractDir}"`, {
      stdio: "inherit",
    });
    return;
  } catch {
    // GitHub runners may lack unzip; Python is usually available
  }
  execSync(
    `python3 -c "import zipfile; zipfile.ZipFile(r'''${zipPath}''').extractall(r'''${extractDir}''')"`,
    { stdio: "inherit" },
  );
}

async function ensureOpensslBinaries() {
  const dest = join(moduleRoot, "bin", "openssl");
  mkdirSync(dest, { recursive: true });
  const missing = OPENSSL_BINARIES.filter(
    (name) => !existsSync(join(dest, name)),
  );
  if (!missing.length) {
    log("bundled openssl binaries present");
    return;
  }

  log(`fetching bundled openssl for: ${missing.join(", ")}`);
  const cacheDir = join(repoRoot, ".build", "openssl-cache");
  const zipPath = join(cacheDir, "openssl-src.zip");
  const extractDir = join(cacheDir, "extract");
  mkdirSync(cacheDir, { recursive: true });
  if (!existsSync(zipPath) || statSync(zipPath).size < 1000) {
    await downloadFile(OPENSSL_ZIP_URL, zipPath);
  }
  rmSync(extractDir, { recursive: true, force: true });
  extractZip(zipPath, extractDir);
  for (const name of OPENSSL_BINARIES) {
    const src = join(extractDir, "bin", name);
    if (!existsSync(src)) {
      throw new Error(`openssl binary missing in upstream zip: ${name}`);
    }
    cpSync(src, join(dest, name));
  }
  writeFileSync(
    join(dest, "README.txt"),
    [
      "# Static OpenSSL for Android",
      "# Used when the install / runtime environment has no system openssl.",
      "# Package ships phone ABIs by default (arm + arm64); set OPENSSL_ABIS=all for x86/x64.",
      "# Install keeps only the device ABI on disk.",
      "# Source: MagiskBypassCertificateTransparencyError static builds",
      "# https://github.com/JelmerDeHen/MagiskBypassCertificateTransparencyError",
      "",
    ].join("\n"),
  );
  log("bundled openssl binaries ready");
}

/** 发布 zip 只保留本次打包选中的架构，去掉仓库里可能残留的其它 ABI */
function pruneStagingOpenssl() {
  const dir = join(staging, "bin", "openssl");
  if (!existsSync(dir)) return;
  const keep = new Set(OPENSSL_BINARIES);
  for (const name of OPENSSL_ALL_BINARIES) {
    const path = join(dir, name);
    if (!existsSync(path)) continue;
    if (keep.has(name)) continue;
    rmSync(path);
    log(`omitted from zip: bin/openssl/${name}`);
  }
  for (const name of OPENSSL_BINARIES) {
    if (!existsSync(join(dir, name))) {
      throw new Error(`staging missing openssl binary: ${name}`);
    }
  }
  log(`openssl in zip: ${OPENSSL_BINARIES.join(", ")}`);
}

function listBuiltinCertFiles(kind) {
  const dir = join(moduleRoot, "certs", "builtin", kind);
  if (!existsSync(dir)) {
    throw new Error(`missing builtin cert directory: certs/builtin/${kind}`);
  }
  const files = readdirSync(dir).filter((name) =>
    /^[0-9a-fA-F]{8}\.\d+$/.test(name),
  );
  if (files.length < 1) {
    throw new Error(
      `missing builtin hash.N certificate under certs/builtin/${kind}/`,
    );
  }
  return files.map((name) => join("certs", "builtin", kind, name));
}

function validateSources() {
  const required = [
    ...ROOT_FILES,
    "bin/common.sh",
    ...BIN_LIBS,
    "bin/apex_inject.sh",
    "bin/hot_mount.sh",
    "bin/cert_manager.sh",
    "config/certs.conf",
    "webroot/index.html",
    "webroot/assets/tip.png",
  ];
  for (const relPath of required) {
    if (!existsSync(join(moduleRoot, relPath))) {
      throw new Error(`missing required module file: ${relPath}`);
    }
  }

  // Reqable 从已安装 App 导入；仅 ProxyPin 保留模块内置证书
  const builtinCerts = [...listBuiltinCertFiles("proxypin")];
  if (existsSync(join(moduleRoot, "certs", "builtin", "reqable"))) {
    throw new Error(
      "certs/builtin/reqable must not be packaged (Reqable CA is imported from the app)",
    );
  }

  for (const relPath of ["system", "certs/system_base", "certs/active"]) {
    const legacyPath = join(moduleRoot, relPath);
    if (existsSync(legacyPath) && directoryHasFiles(legacyPath)) {
      throw new Error(
        `legacy certificate overlay must not be packaged: ${relPath}`,
      );
    }
  }

  for (const relPath of [
    ...ROOT_FILES.filter((file) => file.endsWith(".sh")),
    "bin/common.sh",
    ...BIN_LIBS,
    "bin/apex_inject.sh",
    "bin/hot_mount.sh",
    "bin/cert_manager.sh",
  ]) {
    const content = readFileSync(join(moduleRoot, relPath), "utf8");
    if (content.includes("\r\n"))
      throw new Error(`CRLF is not allowed in shell script: ${relPath}`);
    if (!content.startsWith("#!/system/bin/sh"))
      throw new Error(`invalid shell shebang: ${relPath}`);
  }

  for (const relPath of builtinCerts) {
    const content = readFileSync(join(moduleRoot, relPath));
    const isPem = content
      .subarray(0, 27)
      .toString("ascii")
      .includes("BEGIN CERTIFICATE");
    const isDer = content[0] === 0x30;
    if (!isPem && !isDer)
      throw new Error(`invalid built-in certificate encoding: ${relPath}`);
    const certificate = new X509Certificate(content);
    if (!certificate.ca)
      throw new Error(`built-in certificate is not a CA: ${relPath}`);
    if (Date.parse(certificate.validTo) <= Date.now())
      throw new Error(`built-in certificate expired: ${relPath}`);
  }
}

function validateOpensslBinaries() {
  for (const name of OPENSSL_BINARIES) {
    const relPath = join("bin", "openssl", name);
    if (!existsSync(join(moduleRoot, relPath))) {
      throw new Error(`missing bundled openssl binary: ${relPath}`);
    }
    if (statSync(join(moduleRoot, relPath)).size < 100000) {
      throw new Error(`openssl binary looks too small: ${relPath}`);
    }
  }
}

function validateCbx509() {
  const dex = join(moduleRoot, "bin", "cbx509", "classes.dex");
  const wrapper = join(moduleRoot, "bin", "cbx509.sh");
  if (!existsSync(wrapper)) throw new Error("missing bin/cbx509.sh");
  if (!existsSync(dex) || statSync(dex).size < 200) {
    throw new Error("missing bin/cbx509/classes.dex — run npm run build:cbx509");
  }
}

function resolvePackageEditions() {
  const raw = (process.env.PACKAGE_EDITIONS || "both").trim().toLowerCase();
  if (raw === "both" || raw === "") return ["full", "lite"];
  if (raw === "full" || raw === "lite") return [raw];
  throw new Error(`PACKAGE_EDITIONS must be both|full|lite, got: ${raw}`);
}

async function ensureCbx509() {
  const dex = join(moduleRoot, "bin", "cbx509", "classes.dex");
  if (existsSync(dex) && statSync(dex).size > 200) {
    log(`cbx509 present (${statSync(dex).size} bytes)`);
    return;
  }
  log("building cbx509 dex...");
  execSync("node tooling/scripts/build-cbx509.mjs", {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

function copyFromModule(relPath) {
  const source = join(moduleRoot, relPath);
  const target = join(staging, relPath);
  if (!existsSync(source)) {
    log(`skip missing: ${relPath}`);
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
}

function copyDirFromModule(relPath) {
  const source = join(moduleRoot, relPath);
  if (!existsSync(source)) return;
  mkdirSync(join(staging, relPath), { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const child = join(relPath, entry.name);
    if (entry.isDirectory()) copyDirFromModule(child);
    else copyFromModule(child);
  }
}

function createZip(zipPath) {
  if (process.platform === "win32") {
    const escapedZip = zipPath.replace(/'/g, "''");
    const escapedStaging = staging.replace(/'/g, "''");
    const ps = [
      `$staging = '${escapedStaging}'`,
      `$zip = '${escapedZip}'`,
      "if (Test-Path $zip) { Remove-Item $zip -Force }",
      "Push-Location $staging",
      "Compress-Archive -Path * -DestinationPath $zip -Force",
      "Pop-Location",
    ].join("; ");
    execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
    return;
  }
  execSync(`cd "${staging}" && zip -qr9 "${zipPath}" .`, { stdio: "inherit" });
}

function applyEdition(edition) {
  writeFileSync(join(staging, "bin", "edition"), `${edition}\n`, "utf8");
  if (edition === "lite") {
    rmSync(join(staging, "bin", "openssl"), { recursive: true, force: true });
    let prop = readFileSync(join(staging, "module.prop"), "utf8");
    prop = prop.replace(/^name=.*/m, "name=证书桥 Lite");
    prop = prop.replace(
      /^description=.*/m,
      "description=[Lite|无内置 OpenSSL] 系统信任抓包 CA；X509 由极小 dex 处理。兼容 Magisk / KernelSU / APatch",
    );
    writeFileSync(join(staging, "module.prop"), prop, "utf8");
    if (!existsSync(join(staging, "bin", "cbx509", "classes.dex"))) {
      throw new Error("lite edition missing cbx509 classes.dex");
    }
    log("edition=lite (cbx509 only, no openssl)");
    return;
  }
  // 完整版只用 OpenSSL，不打入 Lite dex
  rmSync(join(staging, "bin", "cbx509"), { recursive: true, force: true });
  rmSync(join(staging, "bin", "cbx509.sh"), { force: true });
  pruneStagingOpenssl();
  log("edition=full (openssl only)");
}

function packageOne(edition, version) {
  const zipName =
    edition === "lite"
      ? `CertBridge_${version}_lite.zip`
      : `CertBridge_${version}.zip`;
  const zipPath = join(releaseDir, zipName);

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  mkdirSync(join(staging, "data"), { recursive: true });
  writeFileSync(join(staging, "data", ".keep"), "");

  for (const file of ROOT_FILES) copyFromModule(file);
  copyDirFromModule("META-INF");
  copyDirFromModule("config");
  copyDirFromModule("bin");
  copyDirFromModule("certs");
  applyEdition(edition);

  if (!existsSync(builtWebDir)) {
    throw new Error("missing .build/webroot — run npm run build:web first");
  }
  cpSync(builtWebDir, join(staging, "webroot"), { recursive: true });

  if (existsSync(zipPath)) rmSync(zipPath);
  log(`packaging ${zipName}...`);
  createZip(zipPath);
  log(`created ${zipPath} (${(statSync(zipPath).size / 1024).toFixed(1)} KB)`);
  rmSync(staging, { recursive: true, force: true });
}

const version = readVersion();
const editions = resolvePackageEditions();
mkdirSync(releaseDir, { recursive: true });

if (editions.includes("lite")) {
  await ensureCbx509();
  validateCbx509();
  const content = readFileSync(join(moduleRoot, "bin", "cbx509.sh"), "utf8");
  if (content.includes("\r\n"))
    throw new Error("CRLF is not allowed in shell script: bin/cbx509.sh");
  if (!content.startsWith("#!/system/bin/sh"))
    throw new Error("invalid shell shebang: bin/cbx509.sh");
}

if (editions.includes("full")) {
  await ensureOpensslBinaries();
  log(
    `openssl package ABIs: ${OPENSSL_BINARIES.join(", ")} (OPENSSL_ABIS=${process.env.OPENSSL_ABIS || "arm,arm64"})`,
  );
  validateOpensslBinaries();
}

validateSources();

for (const edition of editions) {
  packageOne(edition, version);
}
log(`done (${editions.join(", ")})`);