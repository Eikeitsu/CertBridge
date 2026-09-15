import { FLAG_ON } from "@/shared/config/constants";

export function isFlagOn(value?: string): boolean {
  return value === FLAG_ON;
}
