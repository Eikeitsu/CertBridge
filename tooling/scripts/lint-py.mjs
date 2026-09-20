#!/usr/bin/env node
/**
 * Format / check Python under tooling/scripts with ruff when available.
 * Prefers `python -m ruff`, then `ruff` on PATH.
 * CI: REQUIRE_RUFF=1 fails if ruff missing.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const fix = process.argv.includes("--fix");
const requireRuff = process.env.CI === "true" || process.env.REQUIRE_RUFF === "1";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".py")) out.push(p);
  }
  return out;
}

function runRuff(args) {
  const viaPy = spawnSync("python3", ["-m", "ruff", ...args], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (viaPy.status === 0 || viaPy.status === 1) return viaPy.status;
  const viaPyWin = spawnSync("python", ["-m", "ruff", ...args], {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (viaPyWin.status === 0 || viaPyWin.status === 1) return viaPyWin.status;
  const viaBin = spawnSync("ruff", args, { encoding: "utf8", stdio: "inherit" });
  if (viaBin.error && viaBin.error.code === "ENOENT") return null;
  return viaBin.status ?? 1;
}

const files = walk("tooling/scripts").filter((f) => f.endsWith(".py"));
if (!files.length) {
  console.log("[lint:py] no python files");
  process.exit(0);
}

const probe = runRuff(["--version"]);
if (probe === null) {
  const msg = "[lint:py] ruff not installed";
  if (requireRuff) {
    console.error(msg);
    process.exit(1);
  }
  console.log(`${msg} — skip (pip install ruff)`);
  process.exit(0);
}

const checkArgs = fix ? ["check", "--fix", ...files] : ["check", ...files];
const checkStatus = runRuff(checkArgs);
if (checkStatus !== 0) process.exit(checkStatus ?? 1);

const fmtArgs = fix ? ["format", ...files] : ["format", "--check", ...files];
process.exit(runRuff(fmtArgs) ?? 1);
