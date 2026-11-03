import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME_ID, ThemeConfig } from './themes';

interface ThemeContextType {
  theme: ThemeConfig;
  themeId: string;
  setThemeId: (id: string) => void;
  themes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<string>(() => {
    return localStorage.getItem('ecc_theme') || DEFAULT_THEME_ID;
  });

  const activeTheme = THEMES.find(t => t.id === themeId) || THEMES[0];

  const applyThemeVariables = (t: ThemeConfig) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', t.id);

    root.style.setProperty('--color-primary', t.primary);
    root.style.setProperty('--color-primary-dark', t.primaryDark);
    root.style.setProperty('--color-primary-light', t.primaryLight);
    root.style.setProperty('--color-primary-container', t.primaryContainer);
    root.style.setProperty('--color-on-primary-container', t.onPrimaryContainer);

    root.style.setProperty('--color-secondary', t.secondary);
    root.style.setProperty('--color-secondary-hover', t.secondaryHover);
    root.style.setProperty('--color-secondary-container', t.secondaryContainer);
    root.style.setProperty('--color-on-secondary-container', t.onSecondaryContainer);

    root.style.setProperty('--color-tertiary', t.tertiary);
    root.style.setProperty('--color-tertiary-container', t.tertiaryContainer);
    root.style.setProperty('--color-on-tertiary-container', t.onTertiaryContainer);

    root.style.setProperty('--color-surface-canvas', t.surfaceCanvas);
  };

  useEffect(() => {
    applyThemeVariables(activeTheme);
  }, [themeId]);

  const setThemeId = (newId: string) => {
    const found = THEMES.find(t => t.id === newId);
    if (found) {
      setThemeIdState(newId);
      localStorage.setItem('ecc_theme', newId);
      applyThemeVariables(found);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, themeId, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
