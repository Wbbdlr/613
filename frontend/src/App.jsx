import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import HebcalPage from './pages/HebcalPage.jsx';
import SefariaPage from './pages/SefariaPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DisplaySettings from './components/DisplaySettings.jsx';
import { useAuth } from './contexts/AuthContext.jsx';
import styles from './App.module.css';

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const { user, login, logout } = useAuth();

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className={styles.shell}>
      {!isOnline && (
        <div className={styles.offlineBanner} data-noprint role="status" aria-live="polite">
          📴 You&rsquo;re offline — Luach and cached seforim are still available
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/" className={styles.logoLink}>
            <span className={styles.logoIcon}>✡</span>
            <span className={styles.logoText}>613</span>
            <span className={styles.logoSub}>Jewish Suite</span>
          </NavLink>
          <nav className={styles.nav}>
            <NavLink to="/" end className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              <span className={styles.navIcon}>📅</span> Luach
            </NavLink>
            <NavLink to="/sefaria" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}>
              <span className={styles.navIcon}>📖</span> Seforim
            </NavLink>
          </nav>
          <div className={styles.headerActions}>
            <DisplaySettings />
            <div className={styles.userMenu}>
              <span className={styles.username} title={`Signed in as ${user.username}`}>
                👤 {user.username}
              </span>
              <button className={styles.logoutBtn} onClick={logout} title="Sign out">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HebcalPage />} />
          <Route path="/sefaria/*" element={<SefariaPage />} />
        </Routes>
      </main>
      <footer className={styles.footer}>
        <span>613 Self-Hosted Jewish Suite · MIT License · Text data: Sefaria CC-BY-NC 4.0</span>
      </footer>
    </div>
  );
}
