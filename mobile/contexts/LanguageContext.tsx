import React, { createContext, useState, useEffect, ReactNode } from 'react';
import i18n from 'i18next';

export type Language = 'en' | 'vi';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<Language>((i18n.language as Language) || 'en');

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguageState(lng as Language);
    };
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const setLanguage = (language: Language) => {
    i18n.changeLanguage(language);
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};