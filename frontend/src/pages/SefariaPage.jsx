import React, { useState, useEffect, useCallback } from 'react';
import styles from './SefariaPage.module.css';

const API = '/api/sefaria';

export default function SefariaPage() {
  const [view, setView] = useState('search'); // 'search' | 'browse' | 'read'
  const [currentRef, setCurrentRef] = useState(null);

  const openRef = useCallback((ref) => {
    setCurrentRef(ref);
    setView('read');
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>📖 Sefaria Reader</h1>
      <div className={styles.tabs}>
        <button className={view === 'search' ? styles.tabActive : styles.tab} onClick={() => setView('search')}>🔍 Search</button>
        <button className={view === 'browse' ? styles.tabActive : styles.tab} onClick={() => setView('browse')}>📚 Browse</button>
        {currentRef && (
          <button className={view === 'read' ? styles.tabActive : styles.tab} onClick={() => setView('read')}>
            📄 {currentRef}
          </button>
        )}
      </div>
      <div className={styles.panel}>
        {view === 'search' && <SearchPanel onOpen={openRef} />}
        {view === 'browse' && <BrowsePanel onOpen={openRef} />}
        {view === 'read' && currentRef && <ReadPanel ref_={currentRef} />}
      </div>
    </div>
  );
}

/* ---- Search ---- */
function SearchPanel({ onOpen }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const r = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    setResults(d);
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={search} className={styles.searchForm}>
        <input
          className={styles.searchInput}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search texts… (requires indexed data)"
        />
        <button type="submit" disabled={loading}>{loading ? '…' : 'Search'}</button>
      </form>
      {results && (
        <div>
          <p className={styles.resultCount}>{results.total ?? 0} results for "{results.query}"</p>
          {results.hits?.map((hit, i) => (
            <div key={i} className={styles.hit} onClick={() => onOpen(hit.ref)}>
              <strong>{hit.ref}</strong>
              <p dangerouslySetInnerHTML={{ __html: hit._formatted?.text || hit.text || '' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Browse ---- */
function BrowsePanel({ onOpen }) {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookMeta, setBookMeta] = useState(null);

  useEffect(() => {
    fetch(`${API}/texts/books`).then(r => r.json()).then(d => setBooks(d.books || []));
  }, []);

  const selectBook = async (book) => {
    setSelectedBook(book);
    const r = await fetch(`${API}/texts/${encodeURIComponent(book)}`);
    setBookMeta(await r.json());
  };

  return (
    <div className={styles.browseLayout}>
      <div className={styles.bookList}>
        <h3>Books</h3>
        {books.length === 0 && <p className={styles.hint}>No books found. Run seed-sefaria.sh to import data.</p>}
        {books.map(b => (
          <div
            key={b}
            className={selectedBook === b ? styles.bookItemActive : styles.bookItem}
            onClick={() => selectBook(b)}
          >{b}</div>
        ))}
      </div>
      <div className={styles.chapterList}>
        {bookMeta && (
          <>
            <h3>{selectedBook}</h3>
            <p>{bookMeta.chapters} chapters</p>
            <div className={styles.chapterGrid}>
              {Array.from({ length: bookMeta.chapters }, (_, i) => (
                <button
                  key={i}
                  className={styles.chapterBtn}
                  onClick={() => onOpen(`${selectedBook} ${i + 1}`)}
                >{i + 1}</button>
              ))}
            </div>
          </>
        )}
        {!bookMeta && <p className={styles.hint}>Select a book →</p>}
      </div>
    </div>
  );
}

/* ---- Read ---- */
function ReadPanel({ ref_ }) {
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [selectedVerse, setSelectedVerse] = useState(null);

  // Parse "Book Chapter" → book + chapter
  const parts = ref_.match(/^(.+)\s+(\d+)$/);
  const book = parts?.[1];
  const chapter = parts?.[2];

  useEffect(() => {
    if (!book || !chapter) return;
    fetch(`${API}/texts/${encodeURIComponent(book)}/${chapter}`)
      .then(r => r.json()).then(setData);
  }, [ref_, book, chapter]);

  const loadNotes = useCallback(() => {
    if (!selectedVerse) return;
    fetch(`${API}/notes?ref=${encodeURIComponent(selectedVerse)}`)
      .then(r => r.json()).then(setNotes);
  }, [selectedVerse]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const saveNote = async () => {
    if (!newNote.trim() || !selectedVerse) return;
    await fetch(`${API}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: selectedVerse, text: newNote }),
    });
    setNewNote('');
    loadNotes();
  };

  const deleteNote = async (id) => {
    await fetch(`${API}/notes/${id}`, { method: 'DELETE' });
    loadNotes();
  };

  if (!parts) return <p className={styles.error}>Invalid reference: {ref_}</p>;
  if (!data) return <p>Loading {ref_}…</p>;
  if (data.error) return <p className={styles.error}>{data.error}</p>;

  return (
    <div className={styles.readLayout}>
      <div className={styles.textArea}>
        <h2>{data.ref}</h2>
        {data.en.map((verse, i) => {
          const verseRef = `${book} ${chapter}:${i + 1}`;
          return (
            <div
              key={i}
              className={`${styles.verse} ${selectedVerse === verseRef ? styles.verseSelected : ''}`}
              onClick={() => setSelectedVerse(verseRef)}
            >
              <span className={styles.verseNum}>{i + 1}</span>
              <div>
                <div className={styles.enText}>{verse}</div>
                {data.he[i] && <div className={styles.heText} dir="rtl">{data.he[i]}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.notesPanel}>
        <h3>Notes</h3>
        {selectedVerse ? (
          <>
            <p className={styles.noteRef}>{selectedVerse}</p>
            {notes.map(n => (
              <div key={n.id} className={styles.noteItem}>
                <p>{n.text}</p>
                <button onClick={() => deleteNote(n.id)}>✕</button>
              </div>
            ))}
            <textarea
              className={styles.noteInput}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note…"
              rows={3}
            />
            <button className={styles.saveBtn} onClick={saveNote}>Save Note</button>
          </>
        ) : (
          <p className={styles.hint}>Click a verse to add notes</p>
        )}
      </div>
    </div>
  );
}
