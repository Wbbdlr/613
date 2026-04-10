-- User notes on Sefaria passages
CREATE TABLE IF NOT EXISTS notes (
    id          SERIAL PRIMARY KEY,
    ref         TEXT NOT NULL,          -- e.g. "Genesis 1:1"
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Highlights on Sefaria passages
CREATE TABLE IF NOT EXISTS highlights (
    id          SERIAL PRIMARY KEY,
    ref         TEXT NOT NULL,
    start_word  INT  NOT NULL,
    end_word    INT  NOT NULL,
    color       TEXT NOT NULL DEFAULT 'yellow',
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id          SERIAL PRIMARY KEY,
    ref         TEXT NOT NULL UNIQUE,
    label       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Reading history
CREATE TABLE IF NOT EXISTS reading_history (
    id          SERIAL PRIMARY KEY,
    ref         TEXT NOT NULL,
    visited_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_ref_idx       ON notes(ref);
CREATE INDEX IF NOT EXISTS highlights_ref_idx  ON highlights(ref);
CREATE INDEX IF NOT EXISTS history_ref_idx     ON reading_history(ref);
