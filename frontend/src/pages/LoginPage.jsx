import React, { useState } from 'react';
import styles from './LoginPage.module.css';

const API = '/api/sefaria';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        onLogin(data); // { token, username }
      }
    } catch {
      setError('Network error — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.bg}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✡</span>
          <span className={styles.logoText}>613</span>
          <span className={styles.logoSub}>Jewish Suite</span>
        </div>

        <div className={styles.tabs}>
          <button
            className={mode === 'login' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('login'); setError(''); }}
            type="button"
          >Sign In</button>
          <button
            className={mode === 'register' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('register'); setError(''); }}
            type="button"
          >Create Account</button>
        </div>

        <p className={styles.hint}>
          First time here? Choose <strong>Create Account</strong> to register your first user.
        </p>

        <form onSubmit={submit} className={styles.form}>
          <label className={styles.label}>
            <span>Username</span>
            <input
              className={styles.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete={mode === 'login' ? 'username' : 'new-password'}
              autoFocus
              required
            />
          </label>
          <label className={styles.label}>
            <span>Password{mode === 'register' ? ' (min 8 characters)' : ''}</span>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className={styles.hint}>
          {mode === 'login'
            ? 'Your bookmarks, notes, and highlights are saved per account.'
            : 'Create an account to save your study progress privately.'}
        </p>
      </div>
    </div>
  );
}
