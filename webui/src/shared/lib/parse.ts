export function parseKv(stdout: string): Record<string, string> {
  const record: Record<string, string> = {};
  for (const line of String(stdout || "").split("\n")) {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex > 0) {
      record[line.slice(0, separatorIndex).trim()] = line
        .slice(separatorIndex + 1)
        .trim();
    }
  }
  return record;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
