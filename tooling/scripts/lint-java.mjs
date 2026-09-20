#!/usr/bin/env node
/**
 * Format / check Java under tooling/cbx509 with google-java-format (all-deps jar).
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { get } from "node:https";

const fix = process.argv.includes("--fix");
const requireFmt = process.env.CI === "true" || process.env.REQUIRE_JAVA_FORMAT === "1";

const GJF_VER = "1.22.0";
const GJF_URL = `https://github.com/google/google-java-format/releases/download/v${GJF_VER}/google-java-format-${GJF_VER}-all-deps.jar`;

function walk(dir, out = []) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".java")) out.push(p);
  }
  return out;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = get(url, (res) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      pipeline(res, createWriteStream(dest)).then(resolve, reject);
    });
    req.on("error", reject);
  });
}

function resolveJavaBin() {
  const fromPath = spawnSync("java", ["-version"], { encoding: "utf8" });
  if (fromPath.status === 0) return "java";

  const cacheRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../.build/cbx509-cache/jdk",
  );
  if (!existsSync(cacheRoot)) return null;
  const walkJava = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        const found = walkJava(p);
        if (found) return found;
      } else if (name === "java" || name === "java.exe") {
        return p;
      }
    }
    return null;
  };
  return walkJava(cacheRoot);
}

const files = walk("tooling/cbx509");
if (!files.length) {
  console.log("[lint:java] no java files");
  process.exit(0);
}

const javaBin = resolveJavaBin();
if (!javaBin) {
  const msg = "[lint:java] java not found (PATH or .build/cbx509-cache/jdk)";
  if (requireFmt) {
    console.error(msg);
    process.exit(1);
  }
  console.log(`${msg} — skip`);
  process.exit(0);
}

const cacheDir = join(dirname(fileURLToPath(import.meta.url)), "../../.build/tools");
mkdirSync(cacheDir, { recursive: true });
const jar = join(cacheDir, `google-java-format-${GJF_VER}-all-deps.jar`);

try {
  if (!existsSync(jar)) {
    console.log(`[lint:java] downloading google-java-format ${GJF_VER}…`);
    await download(GJF_URL, jar);
  }
} catch (e) {
  console.error("[lint:java] download failed:", e instanceof Error ? e.message : e);
  process.exit(requireFmt ? 1 : 0);
}

const args = [
  "-jar",
  jar,
  ...(fix ? ["-i", ...files] : ["--dry-run", "--set-exit-if-changed", ...files]),
];
const r = spawnSync(javaBin, args, { encoding: "utf8", stdio: "inherit" });
process.exit(r.status ?? 1);
