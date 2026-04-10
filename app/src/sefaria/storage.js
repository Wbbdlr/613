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

const statements = {
  createUser: db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id, username'),
  findUserByUsername: db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?'),

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
  return statements.createUser.get(username, passwordHash);
}

export function findUserByUsername(username) {
  return statements.findUserByUsername.get(username);
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