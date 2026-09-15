/** 校验 string enum（以及值均为 string 的对象） */
export function isEnumValue<T extends Record<string, string | number>>(
  table: T,
  value: unknown,
): value is T[keyof T] {
  return (Object.values(table) as Array<string | number>).includes(
    value as string | number,
  );
}

export function parseEnum<T extends Record<string, string | number>>(
  table: T,
  value: unknown,
  fallback: T[keyof T],
): T[keyof T] {
  return isEnumValue(table, value) ? (value as T[keyof T]) : fallback;
}
