import React, { useState, useEffect, useCallback } from 'react';
import styles from './SefariaPage.module.css';

const API = '/api/sefaria';

function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />;
}

export default function SefariaPage() {
  const [view, setView] = useState('search');
  const [currentRef, setCurrentRef] = useState(null);

  const openRef = useCallback((ref) => {
    setCurrentRef(ref);
    setView('read');
  }, []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Sefaria Reader</h1>
      <div className={styles.tabs} role="tablist">
        <button
          role="tab" aria-selected={view === 'search'}
          className={view === 'search' ? styles.tabActive : styles.tab}
          onClick={() => setView('search')}
        >🔍 Search</button>
        <button
          role="tab" aria-selected={view === 'browse'}
          className={view === 'browse' ? styles.tabActive : styles.tab}
          onClick={() => setView('browse')}
        >📚 Browse</button>
        {currentRef && (
          <button
            role="tab" aria-selected={view === 'read'}
            className={view === 'read' ? styles.tabActive : styles.tab}
            onClick={() => setView('read')}
            title={currentRef}
          >
            📄 <span className={styles.refLabel}>{currentRef}</span>
          </button>
        )}
      </div>
      <div className={styles.panel} role="tabpanel">
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
    try {
      const r = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
      setResults(await r.json());
    } finally { setLoading(false); }
  };

  return (
    <div>
      <form onSubmit={search} className={styles.searchForm}>
        <input
          className={styles.searchInput}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search texts… (requires indexed data)"
          autoFocus
        />
        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? <Spinner /> : 'Search'}
        </button>
      </form>
      {results && (
        <div>
          <p className={styles.resultCount}>{results.total ?? 0} result{results.total !== 1 ? 's' : ''} for "{results.query}"</p>
          {(results.hits?.length === 0) && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>No results found. Make sure you've run <code>seed-sefaria.sh</code> to import text data.</p>
            </div>
          )}
          {results.hits?.map((hit, i) => (
            <div key={i} className={styles.hit} onClick={() => onOpen(hit.ref)}>
              <div className={styles.hitRef}>{hit.ref}</div>
              <p
                className={styles.hitSnippet}
                dangerouslySetInnerHTML={{ __html: hit._formatted?.text || hit.text || '' }}
              />
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
  const [booksLoading, setBooksLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/texts/books`)
      .then(r => r.json())
      .then(d => setBooks(d.books || []))
      .finally(() => setBooksLoading(false));
  }, []);

  const selectBook = async (book) => {
    setSelectedBook(book);
    setBookMeta(null);
    const r = await fetch(`${API}/texts/${encodeURIComponent(book)}`);
    setBookMeta(await r.json());
  };

  return (
    <div className={styles.browseLayout}>
      <div className={styles.bookList}>
        <div className={styles.bookListHeader}>Books</div>
        {booksLoading && <div className={styles.loadingRow}><Spinner /></div>}
        {!booksLoading && books.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📂</span>
            <p>No books found.<br />Run <code>seed-sefaria.sh</code> to import data.</p>
          </div>
        )}
        {books.map(b => (
          <div
            key={b}
            className={selectedBook === b ? styles.bookItemActive : styles.bookItem}
            onClick={() => selectBook(b)}
          >{b}</div>
        ))}
      </div>
      <div className={styles.chapterArea}>
        {!bookMeta && !selectedBook && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>👈</span>
            <p>Select a book to begin</p>
          </div>
        )}
        {selectedBook && !bookMeta && <div className={styles.loadingRow}><Spinner /></div>}
        {bookMeta && (
          <>
            <div className={styles.chapterHeader}>
              <span className={styles.chapterBookName}>{selectedBook}</span>
              <span className={styles.chapterCount}>{bookMeta.chapters} chapters</span>
            </div>
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
  const [loading, setLoading] = useState(true);

  const parts = ref_.match(/^(.+)\s+(\d+)$/);
  const book = parts?.[1];
  const chapter = parts?.[2];

  useEffect(() => {
    if (!book || !chapter) return;
    setLoading(true);
    setData(null);
    fetch(`${API}/texts/${encodeURIComponent(book)}/${chapter}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
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
  if (loading) return (
    <div className={styles.loadingRow} style={{padding:'3rem'}}>
      <Spinner /><span style={{marginLeft:'0.5rem',color:'#777'}}>Loading {ref_}…</span>
    </div>
  );
  if (!data) return null;
  if (data.error) return <p className={styles.error}>{data.error}</p>;

  return (
    <div className={styles.readLayout}>
      <div className={styles.textArea}>
        <div className={styles.textHeader}>
          <h2 className={styles.textTitle}>{data.ref}</h2>
          <span className={styles.chapterBadge}>Chapter {chapter}</span>
        </div>
        {data.en.map((verse, i) => {
          const verseRef = `${book} ${chapter}:${i + 1}`;
          return (
            <div
              key={i}
              className={`${styles.verse} ${selectedVerse === verseRef ? styles.verseSelected : ''}`}
              onClick={() => setSelectedVerse(verseRef)}
              title="Click to add a note"
            >
              <span className={styles.verseNum}>{i + 1}</span>
              <div className={styles.verseContent}>
                <div className={styles.enText}>{verse}</div>
                {data.he[i] && <div className={styles.heTextVerse} dir="rtl">{data.he[i]}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <aside className={styles.notesPanel}>
        <div className={styles.notesPanelHeader}>
          <span>📝</span> Notes
        </div>
        {selectedVerse ? (
          <>
            <div className={styles.noteRef}>{selectedVerse}</div>
            <div className={styles.notesList}>
              {notes.length === 0 && <p className={styles.hint}>No notes yet for this verse.</p>}
              {notes.map(n => (
                <div key={n.id} className={styles.noteItem}>
                  <p>{n.text}</p>
                  <button className={styles.noteDelete} onClick={() => deleteNote(n.id)} title="Delete note">✕</button>
                </div>
              ))}
            </div>
            <textarea
              className={styles.noteInput}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); }}
            />
            <button className={styles.saveBtn} onClick={saveNote} disabled={!newNote.trim()}>
              Save Note
            </button>
          </>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>✏️</span>
            <p>Click any verse to annotate it</p>
          </div>
        )}
      </aside>
    </div>
  );
}


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
