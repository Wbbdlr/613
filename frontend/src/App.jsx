import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import HebcalPage from './pages/HebcalPage.jsx';
import SefariaPage from './pages/SefariaPage.jsx';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.logoLink}>
            <span className={styles.logoIcon}>✡</span>
            <span className={styles.logoText}>613</span>
            <span className={styles.logoSub}>Jewish Suite</span>
          </NavLink>
          <nav className={styles.nav}>
            <NavLink to="/" end className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              <span className={styles.navIcon}>📅</span> Hebcal
            </NavLink>
            <NavLink to="/sefaria" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              <span className={styles.navIcon}>📖</span> Sefaria
            </NavLink>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HebcalPage />} />
          <Route path="/sefaria/*" element={<SefariaPage />} />
        </Routes>
      </main>
      <footer className={styles.footer}>
        <span>613 Self-Hosted Jewish Suite · MIT License · Texts: CC-BY-NC 4.0 Sefaria</span>
      </footer>
    </div>
  );
}
