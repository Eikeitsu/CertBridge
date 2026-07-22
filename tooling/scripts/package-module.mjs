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
  "bin/lib/verify.sh",
  "bin/lib/generation.sh",
  "bin/lib/status.sh",
];

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
    "certs/builtin/reqable/833e2479.0",
    "certs/builtin/proxypin/243f0bfb.0",
  ];
  for (const relPath of required) {
    if (!existsSync(join(moduleRoot, relPath))) {
      throw new Error(`missing required module file: ${relPath}`);
    }
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

  for (const relPath of [
    "certs/builtin/reqable/833e2479.0",
    "certs/builtin/proxypin/243f0bfb.0",
  ]) {
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

const version = readVersion();
const zipName = `CertBridge_${version}.zip`;
const zipPath = join(releaseDir, zipName);

validateSources();
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
mkdirSync(releaseDir, { recursive: true });
mkdirSync(join(staging, "data"), { recursive: true });
writeFileSync(join(staging, "data", ".keep"), "");

for (const file of ROOT_FILES) copyFromModule(file);
copyDirFromModule("META-INF");
copyDirFromModule("config");
copyDirFromModule("bin");
copyDirFromModule("certs");

if (!existsSync(builtWebDir)) {
  throw new Error("missing .build/webroot — run npm run build:web first");
}
cpSync(builtWebDir, join(staging, "webroot"), { recursive: true });

if (existsSync(zipPath)) rmSync(zipPath);
log(`packaging ${zipName}...`);
createZip(zipPath);
log(`created ${zipPath} (${(statSync(zipPath).size / 1024).toFixed(1)} KB)`);
rmSync(staging, { recursive: true, force: true });
log("done");
