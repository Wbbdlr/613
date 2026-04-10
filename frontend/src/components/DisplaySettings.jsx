import React, { useState, useRef, useEffect } from 'react';
import { useDisplay, THEMES, FONT_SIZES } from '../contexts/DisplayContext.jsx';
import styles from './DisplaySettings.module.css';

export default function DisplaySettings() {
  const { theme, setTheme, fontSize, setFontSize } = useDisplay();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fontScaleIndex = FONT_SIZES.findIndex(f => f.id === fontSize);

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-label="Display settings"
        aria-expanded={open}
        title="Display settings"
      >
        Aa
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Display settings">
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Theme</div>
            <div className={styles.row}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={theme === t.id ? styles.themeActive : styles.themeBtn}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  aria-pressed={theme === t.id}
                >
                  <span className={styles.themeIcon}>{t.icon}</span>
                  <span className={styles.themeLabel}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Text Size</div>
            <div className={styles.fontRow}>
              <button
                className={styles.fontStep}
                onClick={() => setFontSize(FONT_SIZES[Math.max(0, fontScaleIndex - 1)].id)}
                disabled={fontScaleIndex === 0}
                aria-label="Decrease font size"
              >A−</button>
              <div className={styles.fontTrack}>
                {FONT_SIZES.map((f, i) => (
                  <button
                    key={f.id}
                    className={fontSize === f.id ? styles.fontDotActive : styles.fontDot}
                    onClick={() => setFontSize(f.id)}
                    title={f.title}
                    aria-label={f.title}
                    aria-pressed={fontSize === f.id}
                  />
                ))}
              </div>
              <button
                className={styles.fontStep}
                onClick={() => setFontSize(FONT_SIZES[Math.min(FONT_SIZES.length - 1, fontScaleIndex + 1)].id)}
                disabled={fontScaleIndex === FONT_SIZES.length - 1}
                aria-label="Increase font size"
              >A+</button>
            </div>
            <div className={styles.fontLabel}>{FONT_SIZES[fontScaleIndex].title}</div>
          </div>
        </div>
      )}
    </div>
  );
}
