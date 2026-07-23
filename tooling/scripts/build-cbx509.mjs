#!/usr/bin/env node
/**
 * Build module/bin/cbx509/classes.dex using a portable JDK + D8.
 * Cache: .build/cbx509-cache/
 */
import { execFileSync, execSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cacheDir = join(repoRoot, ".build", "cbx509-cache");
const outDir = join(repoRoot, "module", "bin", "cbx509");
const srcMain = join(
  repoRoot,
  "tooling",
  "cbx509",
  "src",
  "com",
  "certbridge",
  "x509",
  "Main.java",
);
const sampleCert = join(
  repoRoot,
  "module",
  "certs",
  "builtin",
  "proxypin",
  "243f0bfb.0",
);

function log(msg) {
  console.log(`[build-cbx509] ${msg}`);
}

async function download(url, dest) {
  if (existsSync(dest) && statSync(dest).size > 1000) {
    log(`cache hit ${dest}`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  log(`downloading ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(res.body, createWriteStream(dest));
  log(`saved ${(statSync(dest).size / 1024 / 1024).toFixed(1)} MB`);
}

function hostJdkAsset() {
  const plat = process.platform;
  const arch = process.arch;
  if (plat === "win32" && arch === "x64") {
    return {
      url: "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.14_7.zip",
      kind: "zip",
      javacRel: ["jdk-17.0.14+7", "bin", "javac.exe"],
      javaRel: ["jdk-17.0.14+7", "bin", "java.exe"],
    };
  }
  if (plat === "linux" && arch === "x64") {
    return {
      url: "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.14_7.tar.gz",
      kind: "targz",
      javacRel: ["jdk-17.0.14+7", "bin", "javac"],
      javaRel: ["jdk-17.0.14+7", "bin", "java"],
    };
  }
  if (plat === "darwin" && arch === "arm64") {
    return {
      url: "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.14_7.tar.gz",
      kind: "targz",
      javacRel: ["jdk-17.0.14+7", "Contents", "Home", "bin", "javac"],
      javaRel: ["jdk-17.0.14+7", "Contents", "Home", "bin", "java"],
    };
  }
  if (plat === "darwin" && arch === "x64") {
    return {
      url: "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_x64_mac_hotspot_17.0.14_7.tar.gz",
      kind: "targz",
      javacRel: ["jdk-17.0.14+7", "Contents", "Home", "bin", "javac"],
      javaRel: ["jdk-17.0.14+7", "Contents", "Home", "bin", "java"],
    };
  }
  throw new Error(`unsupported host for portable JDK: ${plat}/${arch}`);
}

async function ensureJdk() {
  const asset = hostJdkAsset();
  const archive = join(
    cacheDir,
    asset.kind === "zip" ? "jdk17.zip" : "jdk17.tar.gz",
  );
  const home = join(cacheDir, "jdk");
  const javac = join(home, ...asset.javacRel);
  if (existsSync(javac)) return { javac, java: join(home, ...asset.javaRel) };

  await download(asset.url, archive);
  rmSync(home, { recursive: true, force: true });
  mkdirSync(home, { recursive: true });
  if (asset.kind === "zip") {
    const z = archive.replace(/'/g, "''");
    const d = home.replace(/'/g, "''");
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${z}' -DestinationPath '${d}' -Force`,
      ],
      { stdio: "inherit" },
    );
  } else {
    execSync(`tar -xzf "${archive}" -C "${home}"`, { stdio: "inherit" });
  }
  if (!existsSync(javac)) {
    throw new Error(`javac not found after JDK extract: ${javac}`);
  }
  if (process.platform !== "win32") {
    chmodSync(javac, 0o755);
    chmodSync(join(home, ...asset.javaRel), 0o755);
  }
  return { javac, java: join(home, ...asset.javaRel) };
}

async function ensureD8() {
  const dest = join(cacheDir, "r8.jar");
  await download(
    "https://dl.google.com/android/maven2/com/android/tools/r8/8.5.35/r8-8.5.35.jar",
    dest,
  );
  return dest;
}

async function main() {
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  if (!existsSync(sampleCert)) {
    throw new Error(`missing sample cert for sanity path: ${sampleCert}`);
  }
  log(`sample cert present: ${sampleCert}`);

  const { javac, java } = await ensureJdk();
  const r8jar = await ensureD8();

  const classesDir = join(cacheDir, "classes");
  rmSync(classesDir, { recursive: true, force: true });
  mkdirSync(classesDir, { recursive: true });

  log("javac Main.java");
  execFileSync(
    javac,
    [
      "-encoding",
      "UTF-8",
      "-source",
      "8",
      "-target",
      "8",
      "-Xlint:-options",
      "-d",
      classesDir,
      srcMain,
    ],
    { stdio: "inherit" },
  );

  const classFile = join(
    classesDir,
    "com",
    "certbridge",
    "x509",
    "Main.class",
  );
  if (!existsSync(classFile)) throw new Error("Main.class missing");

  // Clear previous dex
  const dexOut = join(outDir, "classes.dex");
  if (existsSync(dexOut)) rmSync(dexOut);

  log("d8 → classes.dex");
  execFileSync(
    java,
    [
      "-cp",
      r8jar,
      "com.android.tools.r8.D8",
      "--min-api",
      "24",
      "--output",
      outDir,
      classFile,
    ],
    { stdio: "inherit" },
  );

  if (!existsSync(dexOut) || statSync(dexOut).size < 200) {
    throw new Error("classes.dex missing or too small");
  }

  writeFileSync(
    join(outDir, "README.txt"),
    [
      "# CertBridge Lite X509 helper (Dalvik dex)",
      "# Replaces bundled OpenSSL for hash / PEM normalize / CA checks.",
      "# Invoked via bin/cbx509.sh → app_process / dalvikvm",
      "",
    ].join("\n"),
  );

  log(`built ${dexOut} (${statSync(dexOut).size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
