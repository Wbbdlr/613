import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDisplay, THEMES, FONT_SIZES, READER_LANGUAGES } from '../contexts/DisplayContext.jsx';
import styles from './SettingsPage.module.css';

const API = '/api/sefaria';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme, fontSize, setFontSize, readerLanguage, setReaderLanguage } = useDisplay();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminData, setAdminData] = useState({ users: [], importStatus: null, loading: false });

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user?.token}`,
  }), [user?.token]);

  const saveSettings = async (nextSettings) => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(nextSettings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save settings');
      updateUser({ settings: data.settings, isAdmin: data.isAdmin, username: data.username });
      setMessage('Settings saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const loadAdminData = async () => {
    if (!user?.isAdmin) return;
    setAdminData((current) => ({ ...current, loading: true }));
    try {
      const [usersRes, statusRes] = await Promise.all([
        fetch(`${API}/admin/users`, { headers: authHeaders }),
        fetch(`${API}/admin/import/status`, { headers: authHeaders }),
      ]);
      const usersData = await usersRes.json();
      const statusData = await statusRes.json();
      setAdminData({ users: usersData.users || [], importStatus: statusData, loading: false });
    } catch {
      setAdminData((current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user?.isAdmin]);

  const startImport = async (force = false) => {
    setAdminMessage('');
    const response = await fetch(`${API}/admin/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ force }),
    });
    const data = await response.json();
    if (!response.ok) {
      setAdminMessage(data.error || 'Import could not be started.');
      setAdminData((current) => ({
        ...current,
        importStatus: {
          ...(current.importStatus || {}),
          sourceReady: false,
          sourcePath: data.sourcePath || current.importStatus?.sourcePath,
          error: data.error || current.importStatus?.error,
          phase: 'failed',
        },
      }));
      return;
    }
    setAdminMessage(force ? 'Reimport started.' : 'Import started.');
    loadAdminData();
  };

  const updateRole = async (targetUser, isAdmin) => {
    const response = await fetch(`${API}/admin/users/${targetUser.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ isAdmin }),
    });
    if (response.ok) loadAdminData();
  };

  const deleteUser = async (targetUser) => {
    const response = await fetch(`${API}/admin/users/${targetUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user?.token}` },
    });
    if (response.ok) loadAdminData();
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Reading Preferences</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Theme</span>
            <select value={theme} onChange={(e) => { setTheme(e.target.value); saveSettings({ theme: e.target.value }); }}>
              {THEMES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Text Size</span>
            <select value={fontSize} onChange={(e) => { setFontSize(e.target.value); saveSettings({ fontSize: e.target.value }); }}>
              {FONT_SIZES.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Reader Language</span>
            <select value={readerLanguage} onChange={(e) => { setReaderLanguage(e.target.value); saveSettings({ readerLanguage: e.target.value }); }}>
              {READER_LANGUAGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <p className={styles.helper}>Signed in as <strong>{user?.username}</strong>{user?.isAdmin ? ' · Admin' : ''}</p>
        {(saving || message) && <p className={styles.message}>{saving ? 'Saving…' : message}</p>}
      </section>

      {user?.isAdmin && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Admin</h2>
          <div className={styles.adminCard}>
            <div>
              <div className={styles.adminTitle}>Sefaria Library</div>
              <p className={styles.helper}>
                {adminData.importStatus?.indexed
                  ? `${adminData.importStatus.indexed} verses indexed locally.`
                  : 'No Sefaria texts imported yet.'}
              </p>
              {adminData.importStatus && (
                <>
                  <p className={styles.helper}>Status: {adminData.importStatus.phase || 'idle'}{adminData.importStatus.error ? ` · ${adminData.importStatus.error}` : ''}</p>
                  {adminData.importStatus.sourcePath && (
                    <p className={styles.helper}>Expected vendored path: <strong>{adminData.importStatus.sourcePath}</strong></p>
                  )}
                </>
              )}
            </div>
            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={() => startImport(false)}>Import Library</button>
              <button className={styles.secondaryBtn} onClick={() => startImport(true)}>Reimport</button>
              <button className={styles.secondaryBtn} onClick={loadAdminData} disabled={adminData.loading}>Refresh</button>
            </div>
          </div>
          {adminMessage && <p className={styles.message}>{adminMessage}</p>}

          <div className={styles.userAdmin}>
            <div className={styles.adminTitle}>User Management</div>
            <div className={styles.userList}>
              {adminData.users.map((entry) => (
                <div key={entry.id} className={styles.userRow}>
                  <div>
                    <div className={styles.userName}>{entry.username}</div>
                    <div className={styles.userMeta}>{entry.isAdmin ? 'Admin' : 'User'} · created {new Date(entry.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className={styles.actions}>
                    {entry.id !== user.id && (
                      <button className={styles.secondaryBtn} onClick={() => updateRole(entry, !entry.isAdmin)}>
                        {entry.isAdmin ? 'Make User' : 'Make Admin'}
                      </button>
                    )}
                    {entry.id !== user.id && (
                      <button className={styles.dangerBtn} onClick={() => deleteUser(entry)}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}