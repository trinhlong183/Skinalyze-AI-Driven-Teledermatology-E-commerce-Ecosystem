"use client";

import { useState, useEffect } from "react";

/**
 * Hook debounce a value after a specified delay
 * Beneficial for optimizing performance of operations like search bars
 * @param value The value to debounce (e.g., `filters.search`)
 * @param delay Delay time (ms)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timeout if 'value' or 'delay' changes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
