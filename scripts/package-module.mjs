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
import { createZipFromDir } from "./lib/create-zip.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = join(repoRoot, "module");
const staging = join(repoRoot, ".build", "staging");
const releaseDir = join(repoRoot, ".build", "release");
const builtWebDir = join(repoRoot, ".build", "webroot");

execSync("node scripts/i18n/gen-shell-catalog.mjs", {
  cwd: repoRoot,
  stdio: "inherit",
});

const ROOT_FILES = [
  "module.prop",
  "post-fs-data.sh",
  "service.sh",
  "customize.sh",
  "action.sh",
  "uninstall.sh",
  "hotinstall.sh",
  "icon.png",
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
  "bin/lib/i18n.sh",
  "bin/lib/keys.sh",
  "bin/lib/conf.sh",
  "bin/lib/lock.sh",
  "bin/lib/store.sh",
  "bin/lib/store_target.sh",
  "bin/lib/store_magic.sh",
  "bin/lib/certs.sh",
  "bin/lib/openssl.sh",
  "bin/lib/app_detect.sh",
  "bin/lib/cert_parse.sh",
  "bin/lib/cert_info.sh",
  "bin/lib/cert_import.sh",
  "bin/lib/cert_sources.sh",
  "bin/lib/cert_source_sync.sh",
  "bin/lib/cert_source_stash.sh",
  "bin/lib/cert_optional.sh",
  "bin/lib/install_flow.sh",
  "bin/lib/install_choose.sh",
  "bin/lib/install_import.sh",
  "bin/lib/install_apply.sh",
  "bin/lib/install_config.sh",
  "bin/lib/install_finish.sh",
  "bin/lib/verify.sh",
  "bin/lib/generation.sh",
  "bin/lib/generation_build.sh",
  "bin/lib/generation_meta.sh",
  "bin/lib/status.sh",
  "bin/lib/status_runtime.sh",
  "bin/lib/status_summary.sh",
  "bin/lib/status_describe.sh",
  "bin/lib/status_tag.sh",
  "bin/lib/profile_status.sh",
  "bin/lib/inject_diag.sh",
  "bin/lib/inject_error.sh",
  "bin/lib/inject_verify_diag.sh",
  "bin/lib/inject/inject_stage.sh",
  "bin/lib/inject/inject_bind.sh",
  "bin/lib/inject/inject_ops.sh",
  "bin/lib/cli_status.sh",
  "bin/lib/cli_certs.sh",
  "bin/lib/cli_certs_query.sh",
  "bin/lib/cli_certs_mutate.sh",
  "bin/lib/cli_config.sh",
  "bin/lib/cli_hot.sh",
  "bin/lib/hot/hot_state.sh",
  "bin/lib/hot/hot_certs.sh",
  "bin/lib/hot/hot_ns.sh",
  "bin/lib/hot/hot_bind.sh",
  "bin/lib/hot/hot_build.sh",
  "bin/lib/hot/hot_session.sh",
  "bin/lib/hot_update.sh",
  "bin/lib/hot_update_detect.sh",
  "bin/lib/hot_update_describe.sh",
  "bin/lib/hot_update_apply.sh",
  "bin/lib/hide_assist.sh",
  "bin/lib/hide_actions.sh",
  "bin/lib/hide_probe.sh",
  "bin/lib/hide_clear.sh",
  "bin/lib/hide_register.sh",
  "bin/lib/hide_status.sh",
  "bin/i18n/zh-CN.sh",
  "bin/i18n/en.sh",
];

const OPENSSL_ALL_BINARIES = [
  "openssl-arm",
  "openssl-arm64",
  "openssl-x64",
  "openssl-x86",
];

/** abi 短名 → openssl 文件名 / Magisk zygisk .so（产物后缀用 arm32，二进制仍名 openssl-arm） */
const OPENSSL_ABI_FILE = {
  arm32: "openssl-arm",
  arm: "openssl-arm", // 别名 → 产物名用 arm32
  arm64: "openssl-arm64",
  x86: "openssl-x86",
  x64: "openssl-x64",
  x86_64: "openssl-x64", // 别名 → 产物名用 x64
};
const ZYGISK_SO_BY_ABI = {
  arm32: "armeabi-v7a.so",
  arm: "armeabi-v7a.so",
  arm64: "arm64-v8a.so",
  x86: "x86.so",
  x64: "x86_64.so",
  x86_64: "x86_64.so",
};

/** OPENSSL_ABIS → 短名列表；默认 all = arm32/arm64/x86/x64 */
function resolvePackageAbis() {
  const raw = (process.env.OPENSSL_ABIS ?? "all").trim().toLowerCase();
  if (raw === "all") {
    return ["arm32", "arm64", "x86", "x64"];
  }
  const selected = [];
  for (const token of raw.split(/[,+\s]+/).filter(Boolean)) {
    if (!OPENSSL_ABI_FILE[token]) {
      throw new Error(
        `unknown OPENSSL_ABIS token "${token}" (use arm32,arm64,x86,x64 or all; arm=arm32)`,
      );
    }
    let abi = token;
    if (token === "x86_64") abi = "x64";
    else if (token === "arm") abi = "arm32";
    if (!selected.includes(abi)) selected.push(abi);
  }
  if (!selected.length) {
    throw new Error("OPENSSL_ABIS resolved to empty set");
  }
  return selected;
}

function binariesForAbis(abis) {
  return abis.map((abi) => OPENSSL_ABI_FILE[abi]);
}

/** PACKAGE_FAT=1 → 单 zip 含全部选中 ABI（旧行为）；默认按 ABI 分包 */
function wantFatPackage() {
  const v = (process.env.PACKAGE_FAT ?? "0").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const PACKAGE_ABIS = resolvePackageAbis();
const OPENSSL_BINARIES = binariesForAbis(PACKAGE_ABIS);

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
  const missing = OPENSSL_BINARIES.filter((name) => !existsSync(join(dest, name)));
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
      "# Packaging splits one zip per ABI by default (OPENSSL_ABIS=all).",
      "# Set PACKAGE_FAT=1 to ship all selected ABIs in one zip.",
      "# Restrict with OPENSSL_ABIS=arm32,arm64 if you only need phone ABIs.",
      "# Install still trims to the device ABI if a fat zip is used.",
      "# Source: MagiskBypassCertificateTransparencyError static builds",
      "# https://github.com/JelmerDeHen/MagiskBypassCertificateTransparencyError",
      "",
    ].join("\n"),
  );
  log("bundled openssl binaries ready");
}

/** 发布 zip 只保留 keepBinaries；去掉仓库里可能残留的其它 ABI */
function pruneStagingOpenssl(keepBinaries) {
  const dir = join(staging, "bin", "openssl");
  if (!existsSync(dir)) return;
  const keep = new Set(keepBinaries);
  for (const name of OPENSSL_ALL_BINARIES) {
    const path = join(dir, name);
    if (!existsSync(path)) continue;
    if (keep.has(name)) continue;
    rmSync(path);
    log(`omitted from zip: bin/openssl/${name}`);
  }
  for (const name of keepBinaries) {
    if (!existsSync(join(dir, name))) {
      throw new Error(`staging missing openssl binary: ${name}`);
    }
  }
  log(`openssl in zip: ${keepBinaries.join(", ")}`);
}

/** 按 ABI 只保留对应 zygisk/*.so */
function pruneStagingZygisk(abi) {
  const dir = join(staging, "zygisk");
  if (!existsSync(dir)) return;
  const keepSo = abi ? ZYGISK_SO_BY_ABI[abi] : null;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".so")) continue;
    if (!keepSo || name === keepSo) continue;
    rmSync(join(dir, name));
    log(`omitted from zip: zygisk/${name}`);
  }
  if (keepSo && !existsSync(join(dir, keepSo))) {
    log(`no zygisk/${keepSo} in this package (optional)`);
  }
}

function listBuiltinCertFiles(kind) {
  const dir = join(moduleRoot, "certs", "builtin", kind);
  if (!existsSync(dir)) {
    throw new Error(`missing builtin cert directory: certs/builtin/${kind}`);
  }
  const files = readdirSync(dir).filter((name) => /^[0-9a-fA-F]{8}\.\d+$/.test(name));
  if (files.length < 1) {
    throw new Error(`missing builtin hash.N certificate under certs/builtin/${kind}/`);
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
    "webroot/assets/tip-wechat.png",
    "webroot/assets/tip-alipay.jpg",
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
      throw new Error(`legacy certificate overlay must not be packaged: ${relPath}`);
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
    const isPem = content.subarray(0, 27).toString("ascii").includes("BEGIN CERTIFICATE");
    const isDer = content[0] === 0x30;
    if (!isPem && !isDer)
      throw new Error(`invalid built-in certificate encoding: ${relPath}`);
    const certificate = new X509Certificate(content);
    if (!certificate.ca) throw new Error(`built-in certificate is not a CA: ${relPath}`);
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
  execSync("node scripts/build-cbx509.mjs", {
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

function applyEdition(edition, { keepBinaries, abi }) {
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
  pruneStagingOpenssl(keepBinaries);
  pruneStagingZygisk(abi);
  if (abi) {
    let prop = readFileSync(join(staging, "module.prop"), "utf8");
    prop = prop.replace(/^name=.*/m, `name=证书桥 (${abi})`);
    prop = prop.replace(
      /^description=.*/m,
      `description=[${abi}|内置 OpenSSL] 系统信任抓包 CA。兼容 Magisk / KernelSU / APatch`,
    );
    writeFileSync(join(staging, "module.prop"), prop, "utf8");
  }
  log(`edition=full (openssl only${abi ? `, abi=${abi}` : ", fat"})`);
}

async function packageOne(edition, version, abi = null) {
  let zipName;
  if (edition === "lite") {
    zipName = `CertBridge_${version}_lite.zip`;
  } else if (abi) {
    zipName = `CertBridge_${version}_${abi}.zip`;
  } else {
    zipName = `CertBridge_${version}_fat.zip`;
  }
  const zipPath = join(releaseDir, zipName);
  const keepBinaries =
    edition === "lite" ? [] : abi ? binariesForAbis([abi]) : OPENSSL_BINARIES;

  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  mkdirSync(join(staging, "data"), { recursive: true });
  writeFileSync(join(staging, "data", ".keep"), "");

  for (const file of ROOT_FILES) copyFromModule(file);
  copyDirFromModule("META-INF");
  copyDirFromModule("config");
  copyDirFromModule("bin");
  copyDirFromModule("certs");
  // Zygisk so（由 build:zygisk-hide 生成）；仅复制 .so，不打入 README 占位
  if (existsSync(join(moduleRoot, "zygisk"))) {
    mkdirSync(join(staging, "zygisk"), { recursive: true });
    for (const name of readdirSync(join(moduleRoot, "zygisk"))) {
      if (!name.endsWith(".so")) continue;
      copyFromModule(`zygisk/${name}`);
    }
  }
  // ZN Module 辅路径：禁止空壳。仅当 PACK_ZN_MODULE=1 且 zn_modules.txt 非空、so 存在时打入
  if (process.env.PACK_ZN_MODULE === "1") {
    const znTxt = join(moduleRoot, "zn_modules.txt");
    const znSo = join(moduleRoot, "libcb_zn_hide.so");
    if (
      existsSync(znTxt) &&
      statSync(znTxt).size > 0 &&
      existsSync(znSo) &&
      statSync(znSo).size > 1000
    ) {
      copyFromModule("zn_modules.txt");
      copyFromModule("libcb_zn_hide.so");
      log("packaged ZN module track (zn_modules.txt + libcb_zn_hide.so)");
    } else {
      log(
        "PACK_ZN_MODULE=1 but missing non-empty zn_modules.txt or libcb_zn_hide.so — skipped",
      );
    }
  }
  applyEdition(edition, { keepBinaries, abi });

  if (!existsSync(builtWebDir)) {
    throw new Error("missing .build/webroot — run npm run build:web first");
  }
  cpSync(builtWebDir, join(staging, "webroot"), { recursive: true });

  if (existsSync(zipPath)) rmSync(zipPath);
  log(`packaging ${zipName}...`);
  await createZipFromDir(staging, zipPath);
  log(`created ${zipPath} (${(statSync(zipPath).size / 1024).toFixed(1)} KB)`);
  rmSync(staging, { recursive: true, force: true });
}

const version = readVersion();
const editions = resolvePackageEditions();
const fat = wantFatPackage();
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
    `openssl ABIs: ${PACKAGE_ABIS.join(", ")} → ${OPENSSL_BINARIES.join(", ")} (OPENSSL_ABIS=${process.env.OPENSSL_ABIS || "all"}; PACKAGE_FAT=${fat ? "1" : "0"})`,
  );
  validateOpensslBinaries();
}

validateSources();

for (const edition of editions) {
  if (edition === "lite") {
    await packageOne("lite", version);
    continue;
  }
  if (fat) {
    await packageOne("full", version, null);
  } else {
    for (const abi of PACKAGE_ABIS) {
      await packageOne("full", version, abi);
    }
  }
}
log(
  `done (${editions.join(", ")}; full=${fat ? "fat" : `split:${PACKAGE_ABIS.join("+")}`})`,
);
