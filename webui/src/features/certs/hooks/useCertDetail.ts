import { useCallback, useState } from "react";
import { parseKv } from "@/shared/lib/parse";
import { certInfo } from "@/shared/api/cli";
import { friendlyError } from "@/shared/api/errors";
import { toast } from "@/shared/api/ksu";

export function useCertDetail() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const openDetail = useCallback(async (target: string, detailTitle: string) => {
    setTitle(detailTitle);
    setFields({});
    setIsOpen(true);
    setLoading(true);
    const result = await certInfo(target);
    setLoading(false);
    if (result.errno !== 0 && !result.stdout) {
      toast(friendlyError(result.stderr));
      setIsOpen(false);
      return;
    }
    setFields(parseKv(result.stdout));
  }, []);

  const closeDetail = useCallback(() => {
    setIsOpen(false);
    setLoading(false);
  }, []);

  return { isOpen, loading, title, fields, openDetail, closeDetail };
}
