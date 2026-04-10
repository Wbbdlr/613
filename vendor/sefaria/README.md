# Vendored Sefaria Data

This app no longer downloads Sefaria content from GitHub at runtime.

Place the local Sefaria export snapshot under this directory using the structure below:

```text
vendor/sefaria/
  texts/
    Tanakh/
      English/
        Genesis/
          1.json
      Hebrew/
        Genesis/
          1.json
```

The unified app imports from `vendor/sefaria/texts` into `/data/sefaria/texts` and then rebuilds the local SQLite search index.

If you vendor a different upstream layout, make sure it still contains `English/*.json` and matching `Hebrew/*.json` chapter files so the indexer can read it.