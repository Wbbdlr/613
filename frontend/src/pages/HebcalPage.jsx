import React, { useState } from 'react';
import { HDate, HebrewCalendar, flags, Zmanim, GeoLocation, Location } from '@hebcal/core';
import '@hebcal/learning'; // registers dafYomi / nachYomi handlers
import styles from './HebcalPage.module.css';

// All computation runs locally in the browser — no server calls for calendar or zmanim.
// PDF / print is handled by window.print() with print.css.

const TABS = [
  { id: 'Daily',     label: 'Daily',     icon: '✨' },
  { id: 'Calendar',  label: 'Calendar',  icon: '📅' },
  { id: 'Zmanim',   label: 'Zmanim',    icon: '🕰️' },
  { id: 'Convert',  label: 'Convert',   icon: '🔁' },
  { id: 'Parsha',   label: 'Parsha',    icon: '📜' },
  { id: 'Daf Yomi', label: 'Daf Yomi',  icon: '📗' },
  { id: 'Nach Yomi',label: 'Nach Yomi', icon: '📘' },
  { id: 'Holidays', label: 'Holidays',  icon: '🕍' },
];

const HEBREW_MONTH_OPTIONS = [
  { value: 1, label: 'Nisan (1)' },
  { value: 2, label: 'Iyyar (2)' },
  { value: 3, label: 'Sivan (3)' },
  { value: 4, label: 'Tammuz (4)' },
  { value: 5, label: 'Av (5)' },
  { value: 6, label: 'Elul (6)' },
  { value: 7, label: 'Tishrei (7)' },
  { value: 8, label: 'Cheshvan (8)' },
  { value: 9, label: 'Kislev (9)' },
  { value: 10, label: 'Tevet (10)' },
  { value: 11, label: 'Shevat (11)' },
  { value: 12, label: 'Adar / Adar I (12)' },
  { value: 13, label: 'Adar II (13)' },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function thisYear()  { return new Date().getFullYear(); }
function thisMonth() { return new Date().getMonth() + 1; }

// Computed synchronously at module load — zero network cost
function buildTodayInfo() {
  try {
    const hdate = new HDate(new Date());
    const [parshaEv] = HebrewCalendar.calendar({
      start: hdate, end: hdate, isHebrewYear: false, il: false,
      mask: flags.PARSHA_HASHAVUA,
    });
    const [dafEv] = HebrewCalendar.calendar({
      start: hdate, end: hdate, dailyLearning: { dafYomi: true },
    });
    return {
      parsha:   parshaEv?.render('en')  ?? null,
      parshaHe: parshaEv?.render('he')  ?? null,
      daf:      dafEv?.render('en')     ?? null,
      dafHe:    dafEv?.render('he')     ?? null,
    };
  } catch { return null; }
}
const TODAY_INFO = buildTodayInfo();

export default function HebcalPage() {
  const [tab, setTab] = useState('Calendar');
  return (
    <div className={styles.page}>
      {TODAY_INFO && (
        <div className={styles.todayBanner}>
          <div className={styles.todayItem}>
            <span className={styles.todayLabel}>Parshas HaShavua</span>
            <span className={styles.todayValue}>{TODAY_INFO.parsha || '—'}</span>
            {TODAY_INFO.parshaHe && <span className={styles.todayHe} dir="rtl">{TODAY_INFO.parshaHe}</span>}
          </div>
          <div className={styles.todayDivider} />
          <div className={styles.todayItem}>
            <span className={styles.todayLabel}>Daf Yomi</span>
            <span className={styles.todayValue}>{TODAY_INFO.daf || '—'}</span>
            {TODAY_INFO.dafHe && <span className={styles.todayHe} dir="rtl">{TODAY_INFO.dafHe}</span>}
          </div>
        </div>
      )}

      <h1 className={styles.title}>Luach — Jewish Calendar</h1>

      <div className={styles.tabs} role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.id)}>
            <span className={styles.tabIcon}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.panel} role="tabpanel">
        {tab === 'Daily'     && <DailyPanel />}
        {tab === 'Calendar'  && <CalendarPanel />}
        {tab === 'Zmanim'    && <ZmanimPanel />}
        {tab === 'Convert'   && <ConvertPanel />}
        {tab === 'Parsha'    && <ParshaPanel />}
        {tab === 'Daf Yomi'  && <DafPanel />}
        {tab === 'Nach Yomi' && <NachPanel />}
        {tab === 'Holidays'  && <HolidaysPanel />}
      </div>
    </div>
  );

  /* ─── Daily Summary ────────────────────────────────────────────────────────── */
  function DailyPanel() {
    const [city, setCity]         = useState('Jerusalem');
    const [latInput, setLatInput] = useState('');
    const [lonInput, setLonInput] = useState('');
    const [tzid, setTzid]         = useState('Asia/Jerusalem');
    const [date, setDate]         = useState(todayStr());
    const [il, setIl]             = useState(true);
    const [data, setData]         = useState(null);
    const [error, setError]       = useState(null);

    const load = () => {
      setError(null);
      try {
        const gregorianDate = new Date(date);
        if (Number.isNaN(gregorianDate.getTime())) {
          setError('Invalid date.');
          return;
        }

        let lat;
        let lon;
        let resolvedTzid;
        let resolvedCity = city.trim();

        if (resolvedCity) {
          const loc = Location.lookup(resolvedCity);
          if (!loc) {
            setError(`City "${resolvedCity}" not found. Try a major city like "Jerusalem", "New York", or "London".`);
            return;
          }
          lat = loc.latitude;
          lon = loc.longitude;
          resolvedTzid = loc.timeZoneId;
          resolvedCity = loc.getName ? loc.getName() : resolvedCity;
        } else if (latInput && lonInput) {
          lat = parseFloat(latInput);
          lon = parseFloat(lonInput);
          resolvedTzid = tzid;
          if (Number.isNaN(lat) || Number.isNaN(lon)) {
            setError('Invalid coordinates.');
            return;
          }
          resolvedCity = 'Custom coordinates';
        } else {
          setError('Enter a city name or lat/lon coordinates.');
          return;
        }

        const hdate = new HDate(gregorianDate);
        const parshaEvents = HebrewCalendar.calendar({
          start: hdate,
          end: hdate,
          isHebrewYear: false,
          il,
          mask: flags.PARSHA_HASHAVUA,
        });
        const holidayEvents = HebrewCalendar.calendar({
          start: hdate,
          end: hdate,
          isHebrewYear: false,
          il,
          mask: flags.HOLIDAYS | flags.MINOR_FAST | flags.ROSH_CHODESH,
        });
        const candleEvents = HebrewCalendar.calendar({
          start: hdate,
          end: hdate,
          isHebrewYear: false,
          il,
          mask: flags.LIGHT_CANDLES | flags.YOM_TOV_ENDS,
        });
        const [dafEvent] = HebrewCalendar.calendar({ start: hdate, end: hdate, dailyLearning: { dafYomi: true } });
        const [nachEvent] = HebrewCalendar.calendar({ start: hdate, end: hdate, dailyLearning: { nachYomi: true } });
        const zmanim = new Zmanim(new GeoLocation(resolvedCity, lat, lon, 0, resolvedTzid), hdate, false);
        const formatTime = (value) => value ? value.toISOString() : null;
        const candleLighting = zmanim.sunset() ? new Date(zmanim.sunset().getTime() - (18 * 60 * 1000)) : null;
        const havdalah = zmanim.tzeit();

        setData({
          date,
          city: resolvedCity,
          lat,
          lon,
          tzid: resolvedTzid,
          hebrewDate: hdate.toString(),
          parsha: parshaEvents[0] ? { en: parshaEvents[0].render('en'), he: parshaEvents[0].render('he') } : null,
          holidays: holidayEvents.map((event) => ({ en: event.render('en'), he: event.render('he') })),
          candleEvents: candleEvents.map((event) => ({ en: event.render('en'), he: event.render('he') })),
          daf: dafEvent ? { en: dafEvent.render('en'), he: dafEvent.render('he') } : null,
          nach: nachEvent ? { en: nachEvent.render('en'), he: nachEvent.render('he') } : null,
          candleLighting: formatTime(candleLighting),
          havdalah: formatTime(havdalah),
          zmanim: {
            alotHaShachar: formatTime(zmanim.alotHaShachar()),
            misheyakir: formatTime(zmanim.misheyakir()),
            dawn: formatTime(zmanim.dawn()),
            sunrise: formatTime(zmanim.sunrise()),
            sofZmanShmaMGA: formatTime(zmanim.sofZmanShmaMGA()),
            sofZmanShma: formatTime(zmanim.sofZmanShma()),
            sofZmanTfillaMGA: formatTime(zmanim.sofZmanTfillaMGA()),
            sofZmanTfilla: formatTime(zmanim.sofZmanTfilla()),
            chatzot: formatTime(zmanim.chatzot()),
            minchaGedola: formatTime(zmanim.minchaGedola()),
            minchaKetana: formatTime(zmanim.minchaKetana()),
            plagHaMincha: formatTime(zmanim.plagHaMincha()),
            sunset: formatTime(zmanim.sunset()),
            beinHaShmashos: formatTime(zmanim.beinHaShmashos()),
            tzeit: formatTime(zmanim.tzeit()),
          },
        });
      } catch (err) {
        setError(err.message || 'Could not calculate daily summary.');
      }
    };

    return (
      <div>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Date</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>City</span>
            <input placeholder="Jerusalem" value={city} onChange={e => setCity(e.target.value)} />
          </label>
          <span className={styles.orDivider}>or</span>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Lat</span>
            <input placeholder="31.78" value={latInput} onChange={e => setLatInput(e.target.value)} style={{width:80}} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Lon</span>
            <input placeholder="35.23" value={lonInput} onChange={e => setLonInput(e.target.value)} style={{width:90}} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Timezone</span>
            <input placeholder="Asia/Jerusalem" value={tzid} onChange={e => setTzid(e.target.value)} style={{width:170}} />
          </label>
          <label className={styles.checkField}>
            <input type="checkbox" checked={il} onChange={e => setIl(e.target.checked)} />
            <span>Israel mode</span>
          </label>
          <button className={styles.btn} onClick={load}>Calculate</button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {data && (
          <div className={styles.summaryLayout}>
            <div className={styles.summaryCard}>
              <div className={styles.cardTitle}>Date</div>
              <p className={styles.summaryPrimary}>{data.date}</p>
              <p className={styles.summarySecondary}>{data.hebrewDate}</p>
              <p className={styles.summaryMeta}>{data.city} · {data.tzid}</p>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardTitle}>Parsha</div>
              <p className={styles.summaryPrimary}>{data.parsha?.en || 'No parsha reading'}</p>
              {data.parsha?.he && <p dir="rtl" className={styles.heText}>{data.parsha.he}</p>}
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardTitle}>Learning</div>
              <p className={styles.summaryPrimary}>{data.daf?.en || 'No Daf Yomi result'}</p>
              {data.daf?.he && <p dir="rtl" className={styles.heText}>{data.daf.he}</p>}
              <p className={styles.summarySecondary}>{data.nach?.en || 'No Nach Yomi result'}</p>
              {data.nach?.he && <p dir="rtl" className={styles.heText}>{data.nach.he}</p>}
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardTitle}>Yomim Tovim / Rosh Chodesh</div>
              {data.holidays.length === 0 && <p className={styles.summaryPrimary}>No special events</p>}
              {data.holidays.map((event, index) => (
                <div key={`${event.en}-${index}`} className={styles.summaryListItem}>
                  <span>{event.en}</span>
                  {event.he && <span dir="rtl" className={styles.heText}>{event.he}</span>}
                </div>
              ))}
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.cardTitle}>Candle Lighting / Havdalah</div>
              <p className={styles.summaryPrimary}>
                Candle lighting: {data.candleLighting
                  ? new Date(data.candleLighting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
              <p className={styles.summarySecondary}>
                Havdalah / tzeit: {data.havdalah
                  ? new Date(data.havdalah).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </p>
              {data.candleEvents.length === 0 && <p className={styles.summaryPrimary}>No candle-lighting or havdalah event</p>}
              {data.candleEvents.map((event, index) => (
                <div key={`${event.en}-${index}`} className={styles.summaryListItem}>
                  <span>{event.en}</span>
                  {event.he && <span dir="rtl" className={styles.heText}>{event.he}</span>}
                </div>
              ))}
            </div>
            <div className={styles.summaryTableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Zman</th><th>Time</th></tr></thead>
                <tbody>
                  {Object.entries(ZMANIM_LABELS).map(([key, label]) => (
                    <tr key={key}>
                      <td>{label}</td>
                      <td className={styles.timeCell}>
                        {data.zmanim[key]
                          ? new Date(data.zmanim[key]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }
}

/* ─── Calendar ──────────────────────────────────────────────────────────────── */
function CalendarPanel() {
  const [year, setYear]   = useState(thisYear());
    dawn:             'Dawn',
  const [month, setMonth] = useState(thisMonth());
  const [il, setIl]       = useState(false);
  const [events, setEvents] = useState(null);

  const load = () => {
    try {
      setEvents(
        HebrewCalendar.calendar({
          year, month, isHebrewYear: false, il,
          mask: flags.HOLIDAYS | flags.MINOR_FAST | flags.ROSH_CHODESH | flags.PARSHA_HASHAVUA,
        }).map(ev => ({
          date:     ev.getDate().greg().toISOString().slice(0, 10),
          hdate:    ev.getDate().toString(),
          title:    ev.render('en'),
          titleHe:  ev.render('he'),
          category: ev.getCategories()[0] || '',
        }))
      );
    } catch { setEvents([]); }
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
            {Array.from({length:12},(_,i) => (
              <option key={i+1} value={i+1}>{new Date(2000,i,1).toLocaleString('en',{month:'long'})}</option>
            ))}
          </select>
        </label>
        <label className={styles.checkField}>
          <input type="checkbox" checked={il} onChange={e => setIl(e.target.checked)} />
          <span>Israel mode</span>
        </label>
        <button className={styles.btn} onClick={load}>Show</button>
        {events?.length > 0 && (
          <button onClick={() => window.print()} className={`${styles.btn} ${styles.btnSecondary}`}
            aria-label="Print or save as PDF">🖨️ Print / PDF</button>
        )}
      </div>
      {events && (
        events.length === 0
          ? <p className={styles.empty}>No events found for this month.</p>
          : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Date</th><th>Hebrew Date</th><th>Event</th><th>עברית</th></tr>
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

/* ─── Zmanim ────────────────────────────────────────────────────────────────── */
const ZMANIM_LABELS = {
  alotHaShachar:    'Alos HaShachar',
  misheyakir:       'Misheyakir',
  sunrise:          'Netz HaChama',
  sofZmanShmaMGA:   'Sof Zman Krias Shma (MGA)',
  sofZmanShma:      'Sof Zman Krias Shma (GRA)',
  sofZmanTfillaMGA: 'Sof Zman Tefila (MGA)',
  sofZmanTfilla:    'Sof Zman Tefila (GRA)',
  chatzot:          'Chatzos',
  minchaGedola:     'Mincha Gedolah',
  minchaKetana:     'Mincha Ketanah',
  plagHaMincha:     'Plag HaMincha',
  sunset:           'Shkias HaChama',
  beinHaShmashos:   'Bein HaShmashos',
  tzeit:            'Tzeis HaKochavim',
};

function ZmanimPanel() {
  const [city, setCity]         = useState('');
  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const [tzid, setTzid]         = useState('America/New_York');
  const [date, setDate]         = useState(todayStr());
  const [days, setDays]         = useState(1);
  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);

  const load = () => {
    setError(null);
    try {
      let lat, lon, tz;
      if (city.trim()) {
        const loc = Location.lookup(city.trim());
        if (!loc) {
          setError(`City "${city}" not found. Try a major city like "New York", "Jerusalem", or "London".`);
          return;
        }
        lat = loc.latitude; lon = loc.longitude; tz = loc.timeZoneId;
      } else if (latInput && lonInput) {
        lat = parseFloat(latInput); lon = parseFloat(lonInput); tz = tzid;
        if (isNaN(lat) || isNaN(lon)) { setError('Invalid coordinates.'); return; }
      } else {
        setError('Enter a city name or lat/lon coordinates.'); return;
      }

      const totalDays = Math.min(Math.max(Number(days) || 1, 1), 31);
      const fmt  = t => t ? t.toISOString() : null;
      const rows = [];

      for (let index = 0; index < totalDays; index += 1) {
        const currentDate = new Date(date);
        currentDate.setDate(currentDate.getDate() + index);
        const gloc = new GeoLocation('', lat, lon, 0, tz);
        const z = new Zmanim(gloc, new HDate(currentDate), false);
        rows.push({
          date: currentDate.toISOString().slice(0, 10),
          alotHaShachar: fmt(z.alotHaShachar()),
          misheyakir: fmt(z.misheyakir()),
          dawn: fmt(z.dawn()),
          sunrise: fmt(z.sunrise()),
          sofZmanShmaMGA: fmt(z.sofZmanShmaMGA()),
          sofZmanShma: fmt(z.sofZmanShma()),
          sofZmanTfillaMGA: fmt(z.sofZmanTfillaMGA()),
          sofZmanTfilla: fmt(z.sofZmanTfilla()),
          chatzot: fmt(z.chatzot()),
          minchaGedola: fmt(z.minchaGedola()),
          minchaKetana: fmt(z.minchaKetana()),
          plagHaMincha: fmt(z.plagHaMincha()),
          sunset: fmt(z.sunset()),
          beinHaShmashos: fmt(z.beinHaShmashos()),
          tzeit: fmt(z.tzeit()),
        });
      }

      setData({
        date,
        lat,
        lon,
        tzid: tz,
        days: totalDays,
        rows,
        ...rows[0],
      });
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>City</span>
          <input placeholder="New York" value={city} onChange={e => setCity(e.target.value)} />
        </label>
        <span className={styles.orDivider}>or</span>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Lat</span>
          <input placeholder="40.67" value={latInput} onChange={e => setLatInput(e.target.value)} style={{width:80}} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Lon</span>
          <input placeholder="-73.94" value={lonInput} onChange={e => setLonInput(e.target.value)} style={{width:90}} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Timezone</span>
          <input placeholder="America/New_York" value={tzid} onChange={e => setTzid(e.target.value)} style={{width:170}} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Days</span>
          <input type="number" min="1" max="31" value={days} onChange={e => setDays(Number(e.target.value))} style={{width:80}} />
        </label>
        <button className={styles.btn} onClick={load}>Show</button>
        {data && (
          <button onClick={() => window.print()} className={`${styles.btn} ${styles.btnSecondary}`}
            aria-label="Print or save Zmanim as PDF">🖨️ Print / PDF</button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {data && data.days === 1 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Zman</th><th>Time</th></tr></thead>
            <tbody>
              {Object.entries(ZMANIM_LABELS).map(([key, label]) => (
                <tr key={key}>
                  <td>{label}</td>
                  <td className={styles.timeCell}>
                    {data[key]
                      ? new Date(data[key]).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.days > 1 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                {Object.values(ZMANIM_LABELS).map((label) => <th key={label}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  {Object.keys(ZMANIM_LABELS).map((key) => (
                    <td key={`${row.date}-${key}`} className={styles.timeCell}>
                      {row[key]
                        ? new Date(row[key]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Date Conversion ─────────────────────────────────────────────────────── */
function ConvertPanel() {
  const [gregDate, setGregDate] = useState(todayStr());
  const [gregResult, setGregResult] = useState(null);
  const [hebrewDay, setHebrewDay] = useState(1);
  const [hebrewMonth, setHebrewMonth] = useState(1);
  const [hebrewYear, setHebrewYear] = useState(5786);
  const [hebrewResult, setHebrewResult] = useState(null);
  const [error, setError] = useState(null);

  const convertGregorian = () => {
    setError(null);
    try {
      const converted = new HDate(new Date(gregDate));
      setGregResult({ hebrewDate: converted.toString() });
    } catch (err) {
      setError(err.message || 'Could not convert Gregorian date.');
    }
  };

  const convertHebrew = () => {
    setError(null);
    try {
      const converted = new HDate(Number(hebrewDay), Number(hebrewMonth), Number(hebrewYear));
      setHebrewResult({ gregorianDate: converted.greg().toISOString().slice(0, 10) });
    } catch (err) {
      setError(err.message || 'Could not convert Hebrew date. Use the month number expected by Hebcal.');
    }
  };

  return (
    <div className={styles.convertLayout}>
      <div className={styles.summaryCard}>
        <div className={styles.cardTitle}>Gregorian to Hebrew</div>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Gregorian Date</span>
            <input type="date" value={gregDate} onChange={e => setGregDate(e.target.value)} />
          </label>
          <button className={styles.btn} onClick={convertGregorian}>Convert</button>
        </div>
        {gregResult && <p className={styles.summaryPrimary}>{gregResult.hebrewDate}</p>}
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.cardTitle}>Hebrew to Gregorian</div>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Day</span>
            <input type="number" min="1" max="30" value={hebrewDay} onChange={e => setHebrewDay(Number(e.target.value))} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Hebrew Month</span>
            <select value={hebrewMonth} onChange={e => setHebrewMonth(Number(e.target.value))}>
              {HEBREW_MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Hebrew Year</span>
            <input type="number" min="5000" max="7000" value={hebrewYear} onChange={e => setHebrewYear(Number(e.target.value))} />
          </label>
          <button className={styles.btn} onClick={convertHebrew}>Convert</button>
        </div>
        <p className={styles.summaryMeta}>Month names map to the numbering expected by the local Hebcal library. In leap years, use Adar II for month 13.</p>
        {hebrewResult && <p className={styles.summaryPrimary}>{hebrewResult.gregorianDate}</p>}
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

/* ─── Parsha ────────────────────────────────────────────────────────────────── */
function ParshaPanel() {
  const [date, setDate] = useState(todayStr());
  const [il, setIl]     = useState(false);
  const [data, setData] = useState(null);

  const load = () => {
    try {
      const hdate = new HDate(new Date(date));
      const [ev]  = HebrewCalendar.calendar({
        start: hdate, end: hdate, isHebrewYear: false, il, mask: flags.PARSHA_HASHAVUA,
      });
      setData({ parsha: ev?.render('en') ?? null, parshaHe: ev?.render('he') ?? null });
    } catch { setData({ parsha: null, parshaHe: null }); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className={styles.checkField}>
          <input type="checkbox" checked={il} onChange={e => setIl(e.target.checked)} />
          <span>Israel mode</span>
        </label>
        <button className={styles.btn} onClick={load}>Show</button>
      </div>
      {data && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>📜</div>
          <div className={styles.cardTitle}>Parshas HaShavua</div>
          <div className={styles.cardBody}>
            <p>{data.parsha || 'No parsha reading for this date'}</p>
            {data.parshaHe && <p dir="rtl" className={styles.heText}>{data.parshaHe}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Daf Yomi ──────────────────────────────────────────────────────────────── */
function DafPanel() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);

  const load = () => {
    try {
      const hdate = new HDate(new Date(date));
      const [ev]  = HebrewCalendar.calendar({ start: hdate, end: hdate, dailyLearning: { dafYomi: true } });
      setData({
        tractate:  ev?.daf?.name  ?? null,
        daf:       ev?.daf?.blatt ?? null,
        display:   ev?.render('en')  ?? null,
        displayHe: ev?.render('he')  ?? null,
      });
    } catch { setData({ tractate: null, daf: null, display: null, displayHe: null }); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <button className={styles.btn} onClick={load}>Show</button>
      </div>
      {data && (
        <div className={styles.card}>
          <div className={styles.cardIcon}>📗</div>
          <div className={styles.cardTitle}>Daf Yomi</div>
          <div className={styles.cardBody}>
            <p>{data.display || '—'}</p>
            {data.displayHe && <p dir="rtl" className={styles.heText}>{data.displayHe}</p>}
            {data.tractate   && <p className={styles.cardMeta}>Masechta {data.tractate} · Daf {data.daf}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Nach Yomi ─────────────────────────────────────────────────────────────── */
function NachPanel() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState(null);

  const load = () => {
    try {
      const hdate = new HDate(new Date(date));
      const [ev]  = HebrewCalendar.calendar({ start: hdate, end: hdate, dailyLearning: { nachYomi: true } });
      setData({ display: ev?.render('en') ?? null, displayHe: ev?.render('he') ?? null });
    } catch { setData({ display: null, displayHe: null }); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <button className={styles.btn} onClick={load}>Show</button>
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

/* ─── Holidays ──────────────────────────────────────────────────────────────── */
function HolidaysPanel() {
  const [year, setYear] = useState(thisYear());
  const [il, setIl]     = useState(false);
  const [data, setData] = useState(null);

  const load = () => {
    try {
      const events = HebrewCalendar.calendar({
        year, isHebrewYear: false, il,
        mask: flags.HOLIDAYS | flags.MINOR_FAST,
      }).map(ev => ({
        date:    ev.getDate().greg().toISOString().slice(0, 10),
        title:   ev.render('en'),
        titleHe: ev.render('he'),
        category: ev.getCategories()[0] || '',
      }));
      setData({ year, il, events });
    } catch { setData({ year, il, events: [] }); }
  };

  return (
    <div>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Year</span>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{width:90}} />
        </label>
        <label className={styles.checkField}>
          <input type="checkbox" checked={il} onChange={e => setIl(e.target.checked)} />
          <span>Israel mode</span>
        </label>
        <button className={styles.btn} onClick={load}>Show</button>
        {data?.events?.length > 0 && (
          <button onClick={() => window.print()} className={`${styles.btn} ${styles.btnSecondary}`}
            aria-label="Print or save Yomim Tovim list as PDF">🖨️ Print / PDF</button>
        )}
      </div>
      {data && (
        data.events.length === 0
          ? <p className={styles.empty}>No holidays found.</p>
          : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Yom Tov / Moed</th><th>עברית</th></tr></thead>
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
