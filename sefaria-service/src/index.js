import app from './app.js';

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`sefaria-service listening on port ${PORT}`);
});
