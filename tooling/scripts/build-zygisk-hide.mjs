/**
 * 使用 Android NDK 构建 CertBridge Zygisk 挂载痕迹过滤 so，
 * 输出到 module/zygisk/{arm64-v8a,armeabi-v7a,x86_64,x86}.so
 *
 * 环境变量：
 *   ANDROID_NDK_HOME / ANDROID_NDK_ROOT / NDK_HOME — NDK 根目录
 *   ZYGISK_ABIS — 逗号分隔 ABI，默认 arm64-v8a,armeabi-v7a
 *   SKIP_ZYGISK_HIDE=1 — 跳过（无 NDK 时本地打包用）
 *   REQUIRE_ZYGISK_HIDE=1 — 无 NDK 时失败（CI）
 *   BUILD_ZN_MODULE=1 — 额外构建 libcb_zn_hide（默认关闭；须另备非空 zn_modules.txt）
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** tooling/scripts → 仓库根 */
const repoRoot = join(__dirname, "../..");
const srcDir = join(repoRoot, "native", "zygisk_hide");
const outDir = join(repoRoot, "module", "zygisk");
const buildRoot = join(repoRoot, ".build", "zygisk_hide");

function log(msg) {
  console.log(`[build-zygisk-hide] ${msg}`);
}

function resolveNdk() {
  const candidates = [
    process.env.ANDROID_NDK_HOME,
    process.env.ANDROID_NDK_ROOT,
    process.env.NDK_HOME,
    process.env.ANDROID_HOME && join(process.env.ANDROID_HOME, "ndk-bundle"),
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(join(c, "build", "cmake", "android.toolchain.cmake"))) return c;
    // NDK r21+ layout
    if (existsSync(join(c, "build.gradle"))) {
      /* continue */
    }
    if (existsSync(join(c, "source.properties"))) return c;
  }
  // ANDROID_SDK_ROOT/ndk/<version>
  const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
  if (sdk) {
    const ndkRoot = join(sdk, "ndk");
    if (existsSync(ndkRoot)) {
      const vers = readdirSync(ndkRoot)
        .filter((d) => existsSync(join(ndkRoot, d, "source.properties")))
        .sort()
        .reverse();
      if (vers.length) return join(ndkRoot, vers[0]);
    }
  }
  return null;
}

function resolveAbis() {
  const raw = (process.env.ZYGISK_ABIS || "arm64-v8a,armeabi-v7a").trim();
  return raw.split(/[,+\s]+/).filter(Boolean);
}

function toolchainFile(ndk) {
  const p = join(ndk, "build", "cmake", "android.toolchain.cmake");
  if (!existsSync(p)) {
    throw new Error(`NDK toolchain missing: ${p}`);
  }
  return p;
}

function buildAbi(ndk, abi) {
  const buildDir = join(buildRoot, abi);
  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });
  const tc = toolchainFile(ndk);
  const cmakeArgs = [
    `-DCMAKE_TOOLCHAIN_FILE=${tc}`,
    `-DANDROID_ABI=${abi}`,
    `-DANDROID_PLATFORM=android-24`,
    `-DANDROID_STL=c++_static`,
    `-DCMAKE_BUILD_TYPE=Release`,
    `-DBUILD_ZN_MODULE=${process.env.BUILD_ZN_MODULE === "1" ? "ON" : "OFF"}`,
    `-S`,
    srcDir,
    `-B`,
    buildDir,
  ];
  log(`cmake configure ${abi}`);
  execSync(`cmake ${cmakeArgs.map((a) => `"${a}"`).join(" ")}`, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });
  log(`cmake build ${abi}`);
  execSync(`cmake --build "${buildDir}" --config Release -j`, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

  const soName = `${abi}.so`;
  const candidates = [
    join(buildDir, soName),
    join(buildDir, "lib" + soName),
    join(buildDir, "Release", soName),
  ];
  // CMake 输出名设为 ABI，PREFIX 为空 → arm64-v8a.so
  let found = candidates.find((p) => existsSync(p));
  if (!found) {
    // 扫一遍
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          const r = walk(p);
          if (r) return r;
        } else if (e.name === soName || e.name === `lib${soName}`) {
          return p;
        }
      }
      return null;
    };
    found = walk(buildDir);
  }
  if (!found) throw new Error(`built so not found for ${abi}`);
  mkdirSync(outDir, { recursive: true });
  const dest = join(outDir, soName);
  cpSync(found, dest);
  log(`wrote ${dest} (${(statSync(dest).size / 1024).toFixed(1)} KB)`);
}

if (process.env.SKIP_ZYGISK_HIDE === "1") {
  log("SKIP_ZYGISK_HIDE=1 — skip native build");
  process.exit(0);
}

const ndk = resolveNdk();
if (!ndk) {
  if (process.env.REQUIRE_ZYGISK_HIDE === "1") {
    console.error("[build-zygisk-hide] NDK not found and REQUIRE_ZYGISK_HIDE=1");
    process.exit(1);
  }
  log("NDK not found — skip (set ANDROID_NDK_HOME or REQUIRE_ZYGISK_HIDE=1)");
  // 写占位说明，避免误以为目录应为空却被安装选项误判
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "README.txt"),
    [
      "# Zygisk 挂载痕迹过滤 so",
      "# 由 npm run build:zygisk-hide 生成（需 Android NDK）。",
      "# CI 打包会带上各 ABI 的 .so；本地无 NDK 时可 SKIP_ZYGISK_HIDE=1。",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

log(`NDK=${ndk}`);
const abis = resolveAbis();
for (const abi of abis) {
  buildAbi(ndk, abi);
}
log("done");
