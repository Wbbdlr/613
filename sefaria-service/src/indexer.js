import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import { meili, TEXTS_INDEX, ensureIndex } from './meili.js';

const DATA_DIR = process.env.SEFARIA_DATA_DIR || path.join(process.cwd(), 'data', 'sefaria');
const BATCH_SIZE = 500;

export async function indexAllTexts() {
  console.log('Starting Sefaria text indexing from', DATA_DIR);
  const index = await ensureIndex();

  const enFiles = await glob(
    path.join(DATA_DIR, '**', 'English', '*.json').replace(/\\/g, '/')
  );

  console.log(`Found ${enFiles.length} English text files`);

  let batch = [];
  let total = 0;

  for (const enFile of enFiles) {
    try {
      const raw = await fs.readFile(enFile, 'utf8');
      const data = JSON.parse(raw);
      const parts = enFile.split(path.sep);
      const chapterStr = path.basename(enFile, '.json');
      const book = parts[parts.length - 3] || 'Unknown';
      const chapter = parseInt(chapterStr, 10) || chapterStr;

      // Try to load corresponding Hebrew
      const hePath = enFile.replace(`${path.sep}English${path.sep}`, `${path.sep}Hebrew${path.sep}`);
      let heData = null;
      try {
        heData = JSON.parse(await fs.readFile(hePath, 'utf8'));
      } catch { /* no Hebrew */ }

      const verses = Array.isArray(data) ? data : (data?.text || []);
      const heVerses = heData ? (Array.isArray(heData) ? heData : (heData?.text || [])) : [];

      for (const [i, verse] of verses.entries()) {
        const verseNum = i + 1;
        const ref = `${book} ${chapter}:${verseNum}`;
        batch.push({
          id: ref.replace(/[^a-zA-Z0-9]/g, '_'),
          ref,
          book,
          chapter: typeof chapter === 'number' ? chapter : 0,
          verse: verseNum,
          text: typeof verse === 'string' ? verse : JSON.stringify(verse),
          he: typeof heVerses[i] === 'string' ? heVerses[i] : '',
        });

        if (batch.length >= BATCH_SIZE) {
          await index.addDocuments(batch);
          total += batch.length;
          batch = [];
        }
      }
    } catch (err) {
      console.warn(`Failed to process ${enFile}:`, err.message);
    }
  }

  if (batch.length > 0) {
    await index.addDocuments(batch);
    total += batch.length;
  }

  console.log(`Indexed ${total} verses`);
}
