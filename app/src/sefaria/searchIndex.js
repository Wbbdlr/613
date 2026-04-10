import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { rebuildTextIndex } from './storage.js';

const dataDir = process.env.SEFARIA_DATA_DIR || '/data/sefaria';

export async function indexAllTexts() {
  const enFiles = await glob(path.join(dataDir, '**', 'English', '*.json').replace(/\\/g, '/'));
  const records = [];

  for (const enFile of enFiles) {
    try {
      const raw = await fs.readFile(enFile, 'utf8');
      const data = JSON.parse(raw);
      const parts = enFile.split(path.sep);
      const chapterStr = path.basename(enFile, '.json');
      const book = parts[parts.length - 3] || 'Unknown';
      const chapter = parseInt(chapterStr, 10) || 0;

      const hePath = enFile.replace(`${path.sep}English${path.sep}`, `${path.sep}Hebrew${path.sep}`);
      let heData = null;
      try {
        heData = JSON.parse(await fs.readFile(hePath, 'utf8'));
      } catch {
        heData = null;
      }

      const verses = Array.isArray(data) ? data : (data?.text || []);
      const heVerses = heData ? (Array.isArray(heData) ? heData : (heData?.text || [])) : [];

      for (const [index, verse] of verses.entries()) {
        const verseNum = index + 1;
        const ref = `${book} ${chapter}:${verseNum}`;
        records.push({
          id: ref.replace(/[^a-zA-Z0-9]/g, '_'),
          ref,
          book,
          chapter,
          verse: verseNum,
          text: typeof verse === 'string' ? verse : JSON.stringify(verse),
          he: typeof heVerses[index] === 'string' ? heVerses[index] : '',
        });
      }
    } catch (error) {
      console.warn(`Failed to process ${enFile}: ${error.message}`);
    }
  }

  rebuildTextIndex(records);
  return { indexed: records.length };
}