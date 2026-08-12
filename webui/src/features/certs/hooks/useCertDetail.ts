import { useCallback, useState } from "react";
import { parseKv } from "@/shared/lib/parse";
import { certInfo } from "@/shared/api/cli";
import { friendlyError } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";

export function useCertDetail() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const openDetail = useCallback(async (target: string, detailTitle: string) => {
    const result = await certInfo(target);
    if (result.errno !== 0 && !result.stdout) {
      toast(friendlyError(result.stderr));
      return;
    }
    setTitle(detailTitle);
    setFields(parseKv(result.stdout));
    setIsOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, title, fields, openDetail, closeDetail };
}
