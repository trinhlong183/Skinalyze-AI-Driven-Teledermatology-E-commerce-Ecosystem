import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColor } from '@/constants/Colors';

export type ThemeColor = "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "custom";

interface ThemeColorContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  primaryColor: string;
  isDarkMode: boolean;
  customColor: string | null;
  setCustomColor: (color: string) => void;
}

const ThemeColorContext = createContext<ThemeColorContextType>({
  themeColor: 'blue',
  setThemeColor: () => {},
  primaryColor: '#007AFF',
  isDarkMode: false,
  customColor: null,
  setCustomColor: () => {},
});

export const useThemeColor = () => {
  const context = useContext(ThemeColorContext);
  if (!context) {
    throw new Error('useThemeColor must be used within ThemeColorProvider');
  }
  return context;
};

interface ThemeColorProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@app_theme_color';
const CUSTOM_COLOR_STORAGE_KEY = '@app_custom_color';

export const ThemeColorProvider = ({ children }: ThemeColorProviderProps) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>('blue');
  const [customColor, setCustomColorState] = useState<string | null>(null);
  const deviceColorScheme = useDeviceColorScheme();
  const isDarkMode = deviceColorScheme === 'dark';

  useEffect(() => {
    loadThemeColor();
  }, []);

  const loadThemeColor = async () => {
    try {
      const savedColor = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const savedCustomColor = await AsyncStorage.getItem(CUSTOM_COLOR_STORAGE_KEY);
      
      if (savedCustomColor) {
        setCustomColorState(savedCustomColor);
      }
      
      if (savedColor && isValidThemeColor(savedColor)) {
        setThemeColorState(savedColor as ThemeColor);
      }
    } catch (error) {
      console.error('Error loading theme color:', error);
    }
  };

  const setThemeColor = async (color: ThemeColor) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, color);
      setThemeColorState(color);
    } catch (error) {
      console.error('Error saving theme color:', error);
    }
  };

  const setCustomColor = async (color: string) => {
    try {
      await AsyncStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, color);
      setCustomColorState(color);
    } catch (error) {
      console.error('Error saving custom color:', error);
    }
  };

  const isValidThemeColor = (color: string): boolean => {
    return ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'custom'].includes(color);
  };

  const primaryColor = themeColor === 'custom' && customColor 
    ? customColor 
    : getThemeColor(themeColor as Exclude<ThemeColor, 'custom'>);

  return (
    <ThemeColorContext.Provider value={{ 
      themeColor, 
      setThemeColor, 
      primaryColor, 
      isDarkMode,
      customColor,
      setCustomColor,
    }}>
      {children}
    </ThemeColorContext.Provider>
  );
};