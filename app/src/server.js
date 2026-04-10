import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import hebcalApp from '../hebcal-service/src/app.js';
import sefariaApp from '../sefaria-service/src/app.js';

const app = express();

app.set('trust proxy', 1);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/hebcal', hebcalApp);
app.use('/api/sefaria', sefariaApp);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('/sw.js') || filePath.endsWith('\\sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 8613;

app.listen(port, () => {
  console.log(`613 app listening on port ${port}`);
});