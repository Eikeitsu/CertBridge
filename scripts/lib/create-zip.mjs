import { createWriteStream, readdirSync } from "node:fs";
import { join } from "node:path";
import { ZipFile } from "yazl";

function walk(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(join(dir, entry.name), rel));
    else files.push(rel);
  }
  return files;
}

function unixMode(rel) {
  const name = rel.split("/").pop() || "";
  if (name === "update-binary") return 0o100755;
  if (rel.endsWith(".sh")) return 0o100755;
  if (rel.startsWith("bin/openssl/") && name.startsWith("openssl-")) return 0o100755;
  // 安装期 volkey：必须可执行，否则 keys.sh 的 -x 检查失败会静默回退 getevent（弹音量条）
  if (name.startsWith("volkey-")) return 0o100755;
  return 0o100644;
}

/** 用 Node 打 zip，Windows / Linux 压缩级别与 Unix 权限一致。 */
export function createZipFromDir(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const zipfile = new ZipFile();
    zipfile.on("error", reject);
    for (const rel of walk(sourceDir)) {
      zipfile.addFile(join(sourceDir, rel), rel, {
        mode: unixMode(rel),
        compressionLevel: 9,
      });
    }
    zipfile.outputStream
      .pipe(createWriteStream(zipPath))
      .on("close", resolve)
      .on("error", reject);
    zipfile.end();
  });
}
