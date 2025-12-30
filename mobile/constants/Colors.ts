const themeColors = {
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  green: '#34C759',
  blue: '#007AFF',
  purple: '#AF52DE',
};

export type ThemeColor = keyof typeof themeColors;

export const getThemeColor = (color: ThemeColor) => themeColors[color]; // Fixed typo

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  themeColors,
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
  },
};