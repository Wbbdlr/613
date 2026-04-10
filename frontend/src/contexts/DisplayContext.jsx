import React, { createContext, useContext, useState, useEffect } from 'react';

const DisplayContext = createContext(null);

export const THEMES = [
  { id: 'light', label: 'Light',  icon: '☀️' },
  { id: 'dark',  label: 'Dark',   icon: '🌙' },
  { id: 'sepia', label: 'Sepia',  icon: '📜' },
];

export const FONT_SIZES = [
  { id: 'sm', label: 'A',  title: 'Small'  },
  { id: 'md', label: 'A',  title: 'Medium' },
  { id: 'lg', label: 'A',  title: 'Large'  },
  { id: 'xl', label: 'A',  title: 'X-Large'},
];

export function DisplayProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('613_theme') || 'light'
  );
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem('613_fontsize') || 'md'
  );

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'light') {
      delete el.dataset.theme;
    } else {
      el.dataset.theme = theme;
    }
    localStorage.setItem('613_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.fontsize = fontSize;
    localStorage.setItem('613_fontsize', fontSize);
  }, [fontSize]);

  const setTheme = (t) => setThemeState(t);
  const setFontSize = (s) => setFontSizeState(s);

  return (
    <DisplayContext.Provider value={{ theme, setTheme, fontSize, setFontSize }}>
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay() {
  return useContext(DisplayContext);
}
