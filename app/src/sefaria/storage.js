import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dataRoot = process.env.APP_DATA_DIR || '/data';
const dbPath = process.env.APP_DB_PATH || path.join(dataRoot, '613.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    settings_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref TEXT NOT NULL,
    start_word INTEGER NOT NULL,
    end_word INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT 'yellow',
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref TEXT NOT NULL,
    label TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ref)
  );

  CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref TEXT NOT NULL,
    visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS texts (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    text TEXT NOT NULL,
    he TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS notes_user_idx ON notes(user_id);
  CREATE INDEX IF NOT EXISTS notes_ref_idx ON notes(user_id, ref);
  CREATE INDEX IF NOT EXISTS highlights_user_idx ON highlights(user_id);
  CREATE INDEX IF NOT EXISTS highlights_ref_idx ON highlights(user_id, ref);
  CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON bookmarks(user_id);
  CREATE INDEX IF NOT EXISTS history_user_idx ON reading_history(user_id);

  CREATE VIRTUAL TABLE IF NOT EXISTS texts_fts USING fts5(
    id UNINDEXED,
    ref,
    text,
    he,
    tokenize = 'unicode61'
  );
`);

const userColumns = db.prepare('PRAGMA table_info(users)').all();
const hasColumn = (name) => userColumns.some((column) => column.name === name);
if (!hasColumn('is_admin')) {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
}
if (!hasColumn('settings_json')) {
  db.exec("ALTER TABLE users ADD COLUMN settings_json TEXT NOT NULL DEFAULT '{}'");
}

function mapUser(row) {
  if (!row) return null;
  let settings = {};
  try {
    settings = row.settings_json ? JSON.parse(row.settings_json) : {};
  } catch {
    settings = {};
  }
  return {
    id: row.id,
    username: row.username,
    password_hash: row.password_hash,
    isAdmin: Boolean(row.is_admin),
    settings,
    created_at: row.created_at,
  };
}

const statements = {
  createUser: db.prepare('INSERT INTO users (username, password_hash, is_admin, settings_json) VALUES (?, ?, ?, ?) RETURNING *'),
  findUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  findUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  countUsers: db.prepare('SELECT COUNT(*) AS count FROM users'),
  listUsers: db.prepare('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC, id ASC'),
  updateUserSettings: db.prepare('UPDATE users SET settings_json = ? WHERE id = ? RETURNING *'),
  updateUserAdmin: db.prepare('UPDATE users SET is_admin = ? WHERE id = ? RETURNING id, username, is_admin, created_at'),
  deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),

  getNotes: db.prepare('SELECT * FROM notes WHERE user_id = ? AND ref = ? ORDER BY created_at'),
  createNote: db.prepare('INSERT INTO notes (user_id, ref, text) VALUES (?, ?, ?) RETURNING *'),
  updateNote: db.prepare("UPDATE notes SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *"),
  deleteNote: db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?'),

  getHighlights: db.prepare('SELECT * FROM highlights WHERE user_id = ? AND ref = ? ORDER BY created_at'),
  createHighlight: db.prepare('INSERT INTO highlights (user_id, ref, start_word, end_word, color, note) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'),
  deleteHighlight: db.prepare('DELETE FROM highlights WHERE id = ? AND user_id = ?'),

  getBookmarks: db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC'),
  upsertBookmark: db.prepare(`
    INSERT INTO bookmarks (user_id, ref, label) VALUES (?, ?, ?)
    ON CONFLICT(user_id, ref) DO UPDATE SET label = excluded.label
    RETURNING *
  `),
  deleteBookmark: db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?'),

  clearTexts: db.prepare('DELETE FROM texts'),
  clearTextSearch: db.prepare('DELETE FROM texts_fts'),
  insertText: db.prepare('INSERT OR REPLACE INTO texts (id, ref, book, chapter, verse, text, he) VALUES (@id, @ref, @book, @chapter, @verse, @text, @he)'),
  insertTextSearch: db.prepare('INSERT INTO texts_fts (id, ref, text, he) VALUES (@id, @ref, @text, @he)'),
  textCount: db.prepare('SELECT COUNT(*) AS count FROM texts'),
};

const searchStatement = db.prepare(`
  SELECT t.ref, t.book, t.chapter, t.verse, t.text, t.he,
         snippet(texts_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet_text,
         snippet(texts_fts, 3, '<mark>', '</mark>', '…', 12) AS snippet_he,
         bm25(texts_fts) AS score
  FROM texts_fts
  JOIN texts t ON t.id = texts_fts.id
  WHERE texts_fts MATCH ?
    AND (? IS NULL OR t.book = ?)
  ORDER BY score, t.book, t.chapter, t.verse
  LIMIT ? OFFSET ?
`);

const countSearchStatement = db.prepare(`
  SELECT COUNT(*) AS count
  FROM texts_fts
  JOIN texts t ON t.id = texts_fts.id
  WHERE texts_fts MATCH ?
    AND (? IS NULL OR t.book = ?)
`);

export function createUser(username, passwordHash) {
  const isAdmin = statements.countUsers.get().count === 0 ? 1 : 0;
  const settings = JSON.stringify({
    theme: 'light',
    fontSize: 'md',
    readerLanguage: 'bilingual',
  });
  return mapUser(statements.createUser.get(username, passwordHash, isAdmin, settings));
}

export function findUserByUsername(username) {
  return mapUser(statements.findUserByUsername.get(username));
}

export function findUserById(userId) {
  return mapUser(statements.findUserById.get(userId));
}

export function listUsers() {
  return statements.listUsers.all().map((row) => ({
    id: row.id,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    created_at: row.created_at,
  }));
}

export function updateUserSettings(userId, partialSettings) {
  const current = findUserById(userId);
  if (!current) return null;
  const nextSettings = {
    theme: partialSettings.theme ?? current.settings.theme ?? 'light',
    fontSize: partialSettings.fontSize ?? current.settings.fontSize ?? 'md',
    readerLanguage: partialSettings.readerLanguage ?? current.settings.readerLanguage ?? 'bilingual',
  };
  return mapUser(statements.updateUserSettings.get(JSON.stringify(nextSettings), userId));
}

export function updateUserAdmin(userId, isAdmin) {
  const row = statements.updateUserAdmin.get(isAdmin ? 1 : 0, userId);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    created_at: row.created_at,
  };
}

export function removeUser(userId) {
  statements.deleteUser.run(userId);
}

export function listNotes(userId, ref) {
  return statements.getNotes.all(userId, ref);
}

export function addNote(userId, ref, text) {
  return statements.createNote.get(userId, ref, text);
}

export function editNote(text, id, userId) {
  return statements.updateNote.get(text, id, userId);
}

export function removeNote(id, userId) {
  statements.deleteNote.run(id, userId);
}

export function listHighlights(userId, ref) {
  return statements.getHighlights.all(userId, ref);
}

export function addHighlight(userId, ref, startWord, endWord, color, note) {
  return statements.createHighlight.get(userId, ref, startWord, endWord, color, note);
}

export function removeHighlight(id, userId) {
  statements.deleteHighlight.run(id, userId);
}

export function listBookmarks(userId) {
  return statements.getBookmarks.all(userId);
}

export function saveBookmark(userId, ref, label) {
  return statements.upsertBookmark.get(userId, ref, label);
}

export function removeBookmark(id, userId) {
  statements.deleteBookmark.run(id, userId);
}

export function rebuildTextIndex(records) {
  const tx = db.transaction((items) => {
    statements.clearTexts.run();
    statements.clearTextSearch.run();
    for (const item of items) {
      statements.insertText.run(item);
      statements.insertTextSearch.run(item);
    }
  });
  tx(records);
}

function normalizeQuery(query) {
  const tokens = String(query || '')
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}'_-]+/gu, ''))
    .filter(Boolean);
  if (!tokens.length) return null;
  return tokens.map((token) => `${token}*`).join(' AND ');
}

export function searchTexts(query, { limit, offset, book }) {
  const matchQuery = normalizeQuery(query);
  if (!matchQuery) {
    return { total: 0, hits: [] };
  }
  const total = countSearchStatement.get(matchQuery, book ?? null, book ?? null).count;
  const hits = searchStatement.all(matchQuery, book ?? null, book ?? null, limit, offset).map((row) => ({
    ref: row.ref,
    book: row.book,
    chapter: row.chapter,
    verse: row.verse,
    text: row.text,
    he: row.he,
    _formatted: {
      text: row.snippet_text || row.text,
      he: row.snippet_he || row.he,
    },
  }));
  return { total, hits };
}

export function getTextCount() {
  return statements.textCount.get().count;
}