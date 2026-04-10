import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const DATA_DIR = process.env.SEFARIA_DATA_DIR || path.join(process.cwd(), 'data', 'sefaria');

// Prevent path traversal: only allow alphanumeric, spaces, hyphens, underscores, and dots (no separators or ..)
function sanitizeName(name) {
  if (typeof name !== 'string') throw new Error('Invalid name');
  const clean = name.replace(/[/\\]/g, '').replace(/\.\./g, '');
  if (clean !== name) throw new Error('Invalid characters in name');
  return clean;
}

function sanitizeChapter(chapter) {
  const n = Number(chapter);
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new Error('Invalid chapter number');
  return n;
}

// Returns list of book names based on available JSON files
export async function listBooks() {
  const pattern = path.join(DATA_DIR, '**', 'English', '*.json').replace(/\\/g, '/');
  const files = await glob(pattern);
  const books = files.map(f => {
    const parts = f.split(path.sep);
    // Take the parent directory name as book name (structure: DATA_DIR/<book>/English/<chapter>.json)
    return parts[parts.length - 3] || path.basename(f, '.json');
  });
  return [...new Set(books)].sort();
}

// Returns basic metadata for a book
export async function getBook(bookName) {
  const safeName = sanitizeName(bookName);
  const bookDir = path.join(DATA_DIR, safeName);
  // Ensure resolved path stays within DATA_DIR
  const resolved = path.resolve(bookDir);
  if (!resolved.startsWith(path.resolve(DATA_DIR) + path.sep)) return null;
  try {
    await fs.access(bookDir);
  } catch {
    return null;
  }
  // Try to find chapter count from English directory
  const enDir = path.join(bookDir, 'English');
  let chapters = 0;
  try {
    const files = await fs.readdir(enDir);
    chapters = files.filter(f => f.endsWith('.json')).length;
  } catch {
    // no English dir
  }
  return { book: safeName, chapters };
}

// Read a specific chapter – returns { ref, he: [...], en: [...] }
export async function readTextFile(bookName, chapter) {
  const safeName = sanitizeName(bookName);
  const safeChapter = sanitizeChapter(chapter);
  const chapterStr = String(safeChapter);

  // Ensure resolved paths stay within DATA_DIR
  const base = path.resolve(DATA_DIR);
  const enPath = path.join(DATA_DIR, safeName, 'English', `${chapterStr}.json`);
  const hePath = path.join(DATA_DIR, safeName, 'Hebrew', `${chapterStr}.json`);
  if (!path.resolve(enPath).startsWith(base + path.sep) ||
      !path.resolve(hePath).startsWith(base + path.sep)) {
    throw new Error('Path traversal detected');
  }

  let en = null;
  let he = null;

  try {
    const raw = await fs.readFile(enPath, 'utf8');
    en = JSON.parse(raw);
  } catch { /* not found */ }

  try {
    const raw = await fs.readFile(hePath, 'utf8');
    he = JSON.parse(raw);
  } catch { /* not found */ }

  if (!en && !he) return null;

  return {
    ref: `${safeName} ${safeChapter}`,
    book: safeName,
    chapter: safeChapter,
    en: Array.isArray(en) ? en : (en?.text || []),
    he: Array.isArray(he) ? he : (he?.text || []),
  };
}
