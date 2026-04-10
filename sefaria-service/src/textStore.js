import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const DATA_DIR = process.env.SEFARIA_DATA_DIR || path.join(process.cwd(), 'data', 'sefaria');

// Returns list of book names based on available JSON files
export async function listBooks() {
  const pattern = path.join(DATA_DIR, '**', 'English', '*.json').replace(/\\/g, '/');
  const files = await glob(pattern);
  const books = files.map(f => {
    const parts = f.split(path.sep);
    // Take the parent directory name as book name
    return parts[parts.length - 3] || path.basename(f, '.json');
  });
  return [...new Set(books)].sort();
}

// Returns basic metadata for a book
export async function getBook(bookName) {
  const bookDir = path.join(DATA_DIR, bookName);
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
  return { book: bookName, chapters };
}

// Read a specific chapter – returns { ref, he: [...], en: [...] }
export async function readTextFile(bookName, chapter) {
  const chapterStr = String(chapter);

  // Try English
  const enPath = path.join(DATA_DIR, bookName, 'English', `${chapterStr}.json`);
  const hePath = path.join(DATA_DIR, bookName, 'Hebrew', `${chapterStr}.json`);

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
    ref: `${bookName} ${chapter}`,
    book: bookName,
    chapter,
    en: Array.isArray(en) ? en : (en?.text || []),
    he: Array.isArray(he) ? he : (he?.text || []),
  };
}
