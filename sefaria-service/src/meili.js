import { MeiliSearch } from 'meilisearch';

export const meili = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || 'masterKey',
});

export const TEXTS_INDEX = 'sefaria_texts';

export async function ensureIndex() {
  try {
    await meili.getIndex(TEXTS_INDEX);
  } catch {
    await meili.createIndex(TEXTS_INDEX, { primaryKey: 'id' });
  }
  const index = meili.index(TEXTS_INDEX);
  await index.updateSearchableAttributes(['ref', 'text', 'he']);
  await index.updateFilterableAttributes(['book', 'chapter']);
  return index;
}
