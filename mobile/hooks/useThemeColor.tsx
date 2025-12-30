import {
  useThemeColor,
  ThemeColorProvider,
} from "@/contexts/ThemeColorContext";
import type { ThemeColor } from "@/contexts/ThemeColorContext";

export { useThemeColor, ThemeColorProvider };
export type { ThemeColor };

export const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace("#", "");
  const hexValue =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => char + char)
          .join("")
      : sanitized;

  const int = Number.parseInt(hexValue, 16);
  if (Number.isNaN(int)) {
    return hex;
  }

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
