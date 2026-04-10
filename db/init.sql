-- Registered users
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- User notes on Sefaria passages
CREATE TABLE IF NOT EXISTS notes (
    id          SERIAL PRIMARY KEY,
    user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref         TEXT NOT NULL,          -- e.g. "Genesis 1:1"
    text        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Highlights on Sefaria passages
CREATE TABLE IF NOT EXISTS highlights (
    id          SERIAL PRIMARY KEY,
    user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref         TEXT NOT NULL,
    start_word  INT  NOT NULL,
    end_word    INT  NOT NULL,
    color       TEXT NOT NULL DEFAULT 'yellow',
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Bookmarks (unique per user + ref)
CREATE TABLE IF NOT EXISTS bookmarks (
    id          SERIAL PRIMARY KEY,
    user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref         TEXT NOT NULL,
    label       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, ref)
);

-- Reading history
CREATE TABLE IF NOT EXISTS reading_history (
    id          SERIAL PRIMARY KEY,
    user_id     INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ref         TEXT NOT NULL,
    visited_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_idx      ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_ref_idx       ON notes(user_id, ref);
CREATE INDEX IF NOT EXISTS highlights_user_idx ON highlights(user_id);
CREATE INDEX IF NOT EXISTS highlights_ref_idx  ON highlights(user_id, ref);
CREATE INDEX IF NOT EXISTS bookmarks_user_idx  ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS history_user_idx    ON reading_history(user_id);
