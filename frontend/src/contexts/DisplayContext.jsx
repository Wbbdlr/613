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

export const READER_LANGUAGES = [
  { id: 'english', label: 'English only' },
  { id: 'hebrew', label: 'Hebrew only' },
  { id: 'bilingual', label: 'Bilingual' },
];

export function DisplayProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('613_theme') || 'light'
  );
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem('613_fontsize') || 'md'
  );
  const [readerLanguage, setReaderLanguageState] = useState(
    () => localStorage.getItem('613_reader_language') || 'bilingual'
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

  useEffect(() => {
    localStorage.setItem('613_reader_language', readerLanguage);
  }, [readerLanguage]);

  const setTheme = (t) => setThemeState(t);
  const setFontSize = (s) => setFontSizeState(s);
  const setReaderLanguage = (value) => setReaderLanguageState(value);

  return (
    <DisplayContext.Provider value={{ theme, setTheme, fontSize, setFontSize, readerLanguage, setReaderLanguage }}>
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplay() {
  return useContext(DisplayContext);
}
