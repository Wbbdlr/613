import React, { useState, useCallback, useEffect } from 'react';
import styles from './HebcalPage.module.css';

const API = '/api/hebcal';

const TABS = [
  { id: 'Calendar',  label: 'Calendar',  icon: '📅' },
  { id: 'Zmanim',   label: 'Zmanim',    icon: '🕰️' },
  { id: 'Parsha',   label: 'Parsha',    icon: '📜' },
  { id: 'Daf Yomi', label: 'Daf Yomi',  icon: '📗' },
  { id: 'Nach Yomi',label: 'Nach Yomi', icon: '📘' },
  { id: 'Holidays', label: 'Holidays',  icon: '🕍' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function thisYear()  { return new Date().getFullYear(); }
function thisMonth() { return new Date().getMonth() + 1; }

function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />;
}

export default function HebcalPage() {
  const [tab, setTab] = useState('Calendar');
  const [todayInfo, setTodayInfo] = useState(null);

  useEffect(() => {
    const d = today();
    Promise.all([
      fetch(`${API}/calendar/parsha?date=${d}&il=false`).then(r => r.json()),
      fetch(`${API}/calendar/dafyomi?date=${d}`).then(r => r.json()),
    ]).then(([parsha, daf]) => setTodayInfo({ parsha, daf })).catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      {/* Today banner */}
      {todayInfo && (
        <div className={styles.todayBanner}>
          <div className={styles.todayItem}>
            <span className={styles.todayLabel}>Parashat HaShavua</span>
            <span className={styles.todayValue}>{todayInfo.parsha.parsha || '—'}</span>
            {todayInfo.parsha.parshaHe && (
              <span className={styles.todayHe} dir="rtl">{todayInfo.parsha.parshaHe}</span>
            )}
          </div>
          <div className={styles.todayDivider} />
          <div className={styles.todayItem}>
            <span className={styles.todayLabel}>Daf Yomi</span>
            <span className={styles.todayValue}>{todayInfo.daf.display || '—'}</span>
            {todayInfo.daf.displayHe && (
              <span className={styles.todayHe} dir="rtl">{todayInfo.daf.displayHe}</span>
            )}
          </div>
        </div>
      )}

      <h1 className={styles.title}>Jewish Calendar Tools</h1>

      {/* Tab bar */}
      <div className={styles.tabs} role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.id)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.panel} role="tabpanel">
        {tab === 'Calendar'  && <CalendarPanel />}
        {tab === 'Zmanim'    && <ZmanimPanel />}
        {tab === 'Parsha'    && <ParshaPanel />}
        {tab === 'Daf Yomi'  && <DafPanel />}
        {tab === 'Nach Yomi' && <NachPanel />}
        {tab === 'Holidays'  && <HolidaysPanel />}
      </div>
    </div>
  );
}

/* ---- Calendar ---- */
function CalendarPanel() {
  const [year, setYear] = useState(thisYear());
  const [month, setMonth] = useState(thisMonth());
  const [il, setIl] = useState(false);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/calendar/events?year=${year}&month=${month}&il=${il}`);
      const d = await r.json();
      setEvents(d.events);
    } finally { setLoading(false); }
  }, [year, month, il]);

  const downloadPdf = async () => {
    const r = await fetch(`${API}/pdf/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, il }),
    });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${year}-${String(month).padStart(2,'0')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Year</span>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Month</span>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=>(
              <option key={i+1} value={i+1}>
                {new Date(2000,i,1).toLocaleString('en',{month:'long'})}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.checkField}>
          <input type="checkbox" checked={il} onChange={e=>setIl(e.target.checked)} />
          <span>Israel mode</span>
        </label>
        <button className={styles.btn} onClick={load} disabled={loading}>
          {loading ? <Spinner /> : 'Show'}
        </button>
        <button onClick={downloadPdf} className={`${styles.btn} ${styles.btnSecondary}`}>⬇ PDF</button>
      </div>
      {events && (
        events.length === 0
          ? <p className={styles.empty}>No events found for this month.</p>
          : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hebrew Date</th>
                    <th>Event</th>
                    <th>עברית</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={i}>
                      <td>{ev.date}</td>
                      <td className={styles.heDate}>{ev.hdate}</td>
                      <td>{ev.title}</td>
                      <td dir="rtl" className={styles.heText}>{ev.titleHe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  );
}

/* ---- Zmanim ---- */
function ZmanimPanel() {
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let url = `${API}/zmanim?date=${date}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      else if (lat && lon) url += `&lat=${lat}&lon=${lon}&tzid=UTC`;
      const r = await fetch(url);
      setData(await r.json());
    } finally { setLoading(false); }
  };

  const LABELS = {
    alotHaShachar:    'Alot HaShachar (Dawn)',
    misheyakir:       'Misheyakir',
    dawn:             'Civil Dawn',
    sunrise:          'Sunrise (Netz)',
    sofZmanShmaMGA:   'Sof Zman Shma (MGA)',
    sofZmanShma:      'Sof Zman Shma (GRA)',
    sofZmanTfillaMGA: 'Sof Zman Tfilla (MGA)',
    sofZmanTfilla:    'Sof Zman Tfilla (GRA)',
    chatzot:          'Chatzot',
    minchaGedola:     'Mincha Gedola',
    minchaKetana:     'Mincha Ketana',
    plagHaMincha:     'Plag HaMincha',
    sunset:           'Sunset (Shkia)',
    beinHaShmashos:   'Bein HaShmashos',
    tzeit:            "Tzeit HaKochavim",
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>City</span>
          <input placeholder="New York" value={city} onChange={e=>setCity(e.target.value)} />
        </label>
        <span className={styles.orDivider}>or</span>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Lat</span>
          <input placeholder="40.67" value={lat} onChange={e=>setLat(e.target.value)} style={{width:80}} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Lon</span>
          <input placeholder="-73.94" value={lon} onChange={e=>setLon(e.target.value)} style={{width:90}} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <button className={styles.btn} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Show'}</button>
      </div>
      {data && !data.error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Zman</th><th>Time</th></tr></thead>
            <tbody>
              {Object.entries(LABELS).map(([key, label]) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className={styles.timeCell}>
                    {data[key] ? new Date(data[key]).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.error && <p className={styles.error}>{data.error}</p>}
    </div>
  );
}

/* ---- Parsha ---- */
function ParshaPanel() {
  const [date, setDate] = useState(today());
  const [il, setIl] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/calendar/parsha?date=${date}&il=${il}`);
      setData(await r.json());
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <label className={styles.checkField}>
          <input type="checkbox" checked={il} onChange={e=>setIl(e.target.checked)} />
          <span>Israel mode</span>
        </label>
        <button className={styles.btn} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Show'}</button>
      </div>
      {data && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>📜</div>
          <div className={styles.cardTitle}>Parashat HaShavua</div>
          <div className={styles.cardBody}>
            <p>{data.parsha || 'No parsha reading this date'}</p>
            {data.parshaHe && <p dir="rtl" className={styles.heText}>{data.parshaHe}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Daf Yomi ---- */
function DafPanel() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/calendar/dafyomi?date=${date}`);
      setData(await r.json());
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <button className={styles.btn} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Show'}</button>
      </div>
      {data && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>📗</div>
          <div className={styles.cardTitle}>Daf Yomi</div>
          <div className={styles.cardBody}>
            <p>{data.display || '—'}</p>
            {data.displayHe && <p dir="rtl" className={styles.heText}>{data.displayHe}</p>}
            {data.tractate && <p className={styles.cardMeta}>{data.tractate} · Daf {data.daf}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Nach Yomi ---- */
function NachPanel() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/calendar/nach?date=${date}`);
      setData(await r.json());
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <button className={styles.btn} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Show'}</button>
      </div>
      {data && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>📘</div>
          <div className={styles.cardTitle}>Nach Yomi</div>
          <div className={styles.cardBody}>
            <p>{data.display || '—'}</p>
            {data.displayHe && <p dir="rtl" className={styles.heText}>{data.displayHe}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Holidays ---- */
function HolidaysPanel() {
  const [year, setYear] = useState(thisYear());
  const [il, setIl] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/calendar/holidays?year=${year}&il=${il}`);
      setData(await r.json());
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Year</span>
          <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={{width:90}} />
        </label>
        <label className={styles.checkField}>
          <input type="checkbox" checked={il} onChange={e=>setIl(e.target.checked)} />
          <span>Israel mode</span>
        </label>
        <button className={styles.btn} onClick={load} disabled={loading}>{loading ? <Spinner /> : 'Show'}</button>
      </div>
      {data && (
        data.events.length === 0
          ? <p className={styles.empty}>No holidays found.</p>
          : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Holiday</th><th>עברית</th></tr></thead>
                <tbody>
                  {data.events.map((ev, i) => (
                    <tr key={i}>
                      <td>{ev.date}</td>
                      <td>{ev.title}</td>
                      <td dir="rtl" className={styles.heText}>{ev.titleHe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  );
}


const API = '/api/hebcal';

const TABS = ['Calendar', 'Zmanim', 'Parsha', 'Daf Yomi', 'Nach Yomi', 'Holidays'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function thisYear() {
  return new Date().getFullYear();
}

function thisMonth() {
  return new Date().getMonth() + 1;
}

export default function HebcalPage() {
  const [tab, setTab] = useState('Calendar');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Jewish Calendar Tools</h1>
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t}
            className={tab === t ? styles.tabActive : styles.tab}
            onClick={() => setTab(t)}
          >{t}</button>
        ))}
      </div>
      <div className={styles.panel}>
        {tab === 'Calendar'   && <CalendarPanel />}
        {tab === 'Zmanim'     && <ZmanimPanel />}
        {tab === 'Parsha'     && <ParshaPanel />}
        {tab === 'Daf Yomi'   && <DafPanel />}
        {tab === 'Nach Yomi'  && <NachPanel />}
        {tab === 'Holidays'   && <HolidaysPanel />}
      </div>
    </div>
  );
}

/* ---- Calendar ---- */
function CalendarPanel() {
  const [year, setYear] = useState(thisYear());
  const [month, setMonth] = useState(thisMonth());
  const [il, setIl] = useState(false);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/calendar/events?year=${year}&month=${month}&il=${il}`);
    const d = await r.json();
    setEvents(d.events);
    setLoading(false);
  }, [year, month, il]);

  const downloadPdf = async () => {
    const r = await fetch(`${API}/pdf/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, il }),
    });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${year}-${String(month).padStart(2,'0')}.pdf`;
    a.click();
  };

  return (
    <div>
      <div className={styles.controls}>
        <label>Year <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></label>
        <label>Month
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=>(
              <option key={i+1} value={i+1}>
                {new Date(2000,i,1).toLocaleString('en',{month:'long'})}
              </option>
            ))}
          </select>
        </label>
        <label><input type="checkbox" checked={il} onChange={e=>setIl(e.target.checked)} /> Israel</label>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Show'}</button>
        <button onClick={downloadPdf} className={styles.pdfBtn}>⬇ PDF</button>
      </div>
      {events && (
        <table className={styles.table}>
          <thead><tr><th>Date</th><th>Hebrew Date</th><th>Event</th><th>עברית</th></tr></thead>
          <tbody>
            {events.map((ev, i) => (
              <tr key={i}>
                <td>{ev.date}</td>
                <td>{ev.hdate}</td>
                <td>{ev.title}</td>
                <td dir="rtl">{ev.titleHe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---- Zmanim ---- */
function ZmanimPanel() {
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let url = `${API}/zmanim?date=${date}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    else if (lat && lon) url += `&lat=${lat}&lon=${lon}&tzid=UTC`;
    const r = await fetch(url);
    const d = await r.json();
    setData(d);
    setLoading(false);
  };

  const LABELS = {
    alotHaShachar: 'Alot HaShachar (Dawn)',
    misheyakir: "Misheyakir",
    dawn: 'Civil Dawn',
    sunrise: 'Sunrise (Netz)',
    sofZmanShmaMGA: 'Sof Zman Shma (MGA)',
    sofZmanShma: 'Sof Zman Shma (GRA)',
    sofZmanTfillaMGA: 'Sof Zman Tfilla (MGA)',
    sofZmanTfilla: 'Sof Zman Tfilla (GRA)',
    chatzot: 'Chatzot',
    minchaGedola: 'Mincha Gedola',
    minchaKetana: 'Mincha Ketana',
    plagHaMincha: "Plag HaMincha",
    sunset: 'Sunset (Shkia)',
    beinHaShmashos: 'Bein HaShmashos',
    tzeit: "Tzeit HaKochavim",
  };

  return (
    <div>
      <div className={styles.controls}>
        <label>City <input placeholder="New York" value={city} onChange={e=>setCity(e.target.value)} /></label>
        <span>or</span>
        <label>Lat <input placeholder="40.67" value={lat} onChange={e=>setLat(e.target.value)} /></label>
        <label>Lon <input placeholder="-73.94" value={lon} onChange={e=>setLon(e.target.value)} /></label>
        <label>Date <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <button onClick={load} disabled={loading}>{loading?'Loading…':'Show'}</button>
      </div>
      {data && !data.error && (
        <table className={styles.table}>
          <thead><tr><th>Zman</th><th>Time (UTC)</th></tr></thead>
          <tbody>
            {Object.entries(LABELS).map(([key, label]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{data[key] ? new Date(data[key]).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data?.error && <p className={styles.error}>{data.error}</p>}
    </div>
  );
}

/* ---- Parsha ---- */
function ParshaPanel() {
  const [date, setDate] = useState(today());
  const [il, setIl] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    const r = await fetch(`${API}/calendar/parsha?date=${date}&il=${il}`);
    setData(await r.json());
  };

  return (
    <div>
      <div className={styles.controls}>
        <label>Date <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <label><input type="checkbox" checked={il} onChange={e=>setIl(e.target.checked)} /> Israel</label>
        <button onClick={load}>Show</button>
      </div>
      {data && (
        <div className={styles.card}>
          <h2>Parashat HaShavua</h2>
          <p><strong>English:</strong> {data.parsha || 'No parsha this date'}</p>
          <p dir="rtl"><strong>עברית:</strong> {data.parshaHe || ''}</p>
        </div>
      )}
    </div>
  );
}

/* ---- Daf Yomi ---- */
function DafPanel() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);

  const load = async () => {
    const r = await fetch(`${API}/calendar/dafyomi?date=${date}`);
    setData(await r.json());
  };

  return (
    <div>
      <div className={styles.controls}>
        <label>Date <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <button onClick={load}>Show</button>
      </div>
      {data && (
        <div className={styles.card}>
          <h2>Daf Yomi</h2>
          <p><strong>English:</strong> {data.display}</p>
          {data.displayHe && <p dir="rtl"><strong>עברית:</strong> {data.displayHe}</p>}
        </div>
      )}
    </div>
  );
}

/* ---- Nach Yomi ---- */
function NachPanel() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);

  const load = async () => {
    const r = await fetch(`${API}/calendar/nach?date=${date}`);
    setData(await r.json());
  };

  return (
    <div>
      <div className={styles.controls}>
        <label>Date <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <button onClick={load}>Show</button>
      </div>
      {data && (
        <div className={styles.card}>
          <h2>Nach Yomi</h2>
          <p><strong>English:</strong> {data.display}</p>
          {data.displayHe && <p dir="rtl"><strong>עברית:</strong> {data.displayHe}</p>}
        </div>
      )}
    </div>
  );
}

/* ---- Holidays ---- */
function HolidaysPanel() {
  const [year, setYear] = useState(thisYear());
  const [il, setIl] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    const r = await fetch(`${API}/calendar/holidays?year=${year}&il=${il}`);
    setData(await r.json());
  };

  return (
    <div>
      <div className={styles.controls}>
        <label>Year <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={il} onChange={e=>setIl(e.target.checked)} /> Israel</label>
        <button onClick={load}>Show</button>
      </div>
      {data && (
        <table className={styles.table}>
          <thead><tr><th>Date</th><th>Holiday</th><th>עברית</th></tr></thead>
          <tbody>
            {data.events.map((ev, i) => (
              <tr key={i}>
                <td>{ev.date}</td>
                <td>{ev.title}</td>
                <td dir="rtl">{ev.titleHe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
