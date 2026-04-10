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

// Find the directory for a named book anywhere under DATA_DIR.
// Sefaria-Export organises books in category subdirectories, e.g.
//   DATA_DIR/Tanakh/Genesis/English/  or  DATA_DIR/Mishnah/Mishnah_Berachot/English/
// so we can't assume the book lives directly under DATA_DIR.
async function findBookDir(safeName) {
  const base = path.resolve(DATA_DIR);
  const pattern = path.join(DATA_DIR, '**', safeName, 'English').replace(/\\/g, '/');
  const matches = await glob(pattern, { onlyDirectories: true });
  if (matches.length === 0) return null;
  // The book directory is the parent of the 'English' directory
  const bookDir = path.dirname(matches[0]);
  const resolved = path.resolve(bookDir);
  // Safety check: must stay within DATA_DIR
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return bookDir;
}

// Returns list of book names based on available JSON files
export async function listBooks() {
  const pattern = path.join(DATA_DIR, '**', 'English', '*.json').replace(/\\/g, '/');
  const files = await glob(pattern);
  const books = files.map(f => {
    const parts = f.split(path.sep);
    // Take the grandparent directory name as book name
    // structure: .../English/<chapter>.json  → parts[-3] is the book dir name
    return parts[parts.length - 3] || path.basename(f, '.json');
  });
  return [...new Set(books)].sort();
}

// Returns basic metadata for a book
export async function getBook(bookName) {
  const safeName = sanitizeName(bookName);
  const bookDir = await findBookDir(safeName);
  if (!bookDir) return null;
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

  const bookDir = await findBookDir(safeName);
  if (!bookDir) return null;

  const base = path.resolve(DATA_DIR);
  const enPath = path.join(bookDir, 'English', `${chapterStr}.json`);
  const hePath = path.join(bookDir, 'Hebrew', `${chapterStr}.json`);
  // Ensure resolved paths stay within DATA_DIR
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
