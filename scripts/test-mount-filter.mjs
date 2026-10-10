/**
 * 主机侧编译并运行 mount_filter 单测（不需要 NDK）。
 * 需要本机 C++20 编译器（g++ / clang++ / c++）。
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "native", "zygisk_hide");
const outDir = join(root, ".build", "host_tests");
const isWin = process.platform === "win32";
const exe = join(outDir, isWin ? "mount_filter_test.exe" : "mount_filter_test");

function resolveCompiler() {
  if (process.env.CXX && process.env.CXX.trim()) return process.env.CXX.trim();
  const candidates = isWin
    ? ["clang++.exe", "g++.exe", "c++.exe", "clang++", "g++", "c++"]
    : ["c++", "g++", "clang++"];
  for (const name of candidates) {
    try {
      execFileSync(name, ["--version"], { stdio: "ignore" });
      return name;
    } catch {
      /* try next */
    }
  }
  return null;
}

mkdirSync(outDir, { recursive: true });

const cxx = resolveCompiler();
if (!cxx) {
  const msg =
    "[test-mount-filter] no C++ compiler found (install g++/clang++ or set CXX). Skipping host unit test.";
  if (process.env.REQUIRE_ZYGISK_FILTER_TEST === "1") {
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg);
  process.exit(0);
}

const args = [
  "-std=c++20",
  "-O0",
  "-g",
  "-DCERTBRIDGE_HOST_TEST=1",
  `-I${src}`,
  join(src, "mount_filter.cpp"),
  join(src, "mount_filter_test.cpp"),
  "-o",
  exe,
];

console.log(`[test-mount-filter] ${cxx} ${args.join(" ")}`);
execFileSync(cxx, args, { stdio: "inherit", cwd: root });
if (!existsSync(exe)) {
  console.error("binary missing");
  process.exit(1);
}
execSync(`"${exe}"`, { stdio: "inherit", shell: true, cwd: root });
