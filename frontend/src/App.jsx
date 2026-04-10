import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import HebcalPage from './pages/HebcalPage.jsx';
import SefariaPage from './pages/SefariaPage.jsx';
import styles from './App.module.css';

export default function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.logo}>✡ 613</span>
        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : ''}>
            📅 Hebcal
          </NavLink>
          <NavLink to="/sefaria" className={({ isActive }) => isActive ? styles.active : ''}>
            📖 Sefaria
          </NavLink>
        </nav>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HebcalPage />} />
          <Route path="/sefaria/*" element={<SefariaPage />} />
        </Routes>
      </main>
    </div>
  );
}
