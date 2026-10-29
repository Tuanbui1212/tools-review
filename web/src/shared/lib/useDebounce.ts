import { useEffect, useState } from "react";

/** Trì hoãn cập nhật giá trị sau một khoảng thời gian chờ (mặc định 350ms). */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
