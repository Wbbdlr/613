import { Router } from 'express';
import {
  HDate,
  HebrewCalendar,
  flags,
} from '@hebcal/core';
import '@hebcal/learning'; // register DafYomi / NachYomi daily-learning handlers

export const router = Router();

function parseYear(query) {
  const y = parseInt(query.year, 10);
  return isNaN(y) ? new Date().getFullYear() : y;
}
function parseMonth(query) {
  const m = parseInt(query.month, 10);
  return isNaN(m) ? new Date().getMonth() + 1 : m;
}

// GET /calendar/events?year=2024&month=3&il=false
router.get('/events', (req, res) => {
  const year = parseYear(req.query);
  const month = parseMonth(req.query);
  const il = req.query.il === 'true';

  const options = {
    year,
    month,
    isHebrewYear: false,
    candlelighting: true,
    il,
    mask: flags.HOLIDAYS | flags.MINOR_FAST | flags.ROSH_CHODESH |
          flags.PARSHA_HASHAVUA | flags.LIGHT_CANDLES | flags.YOM_TOV_ENDS,
  };

  const events = HebrewCalendar.calendar(options).map(ev => ({
    date: ev.getDate().greg().toISOString().slice(0, 10),
    hdate: ev.getDate().toString(),
    title: ev.render('en'),
    titleHe: ev.render('he'),
    category: ev.getCategories()[0] || '',
    url: ev.url ? ev.url() : null,
  }));

  res.json({ year, month, il, events });
});

// GET /calendar/parsha?date=2024-03-15&il=false
router.get('/parsha', (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const il = req.query.il === 'true';
  const date = new Date(dateStr);
  const hdate = new HDate(date);

  const events = HebrewCalendar.calendar({
    start: hdate,
    end: hdate,
    isHebrewYear: false,
    il,
    mask: flags.PARSHA_HASHAVUA,
  });

  const parsha = events[0] || null;
  res.json({
    date: dateStr,
    parsha: parsha ? parsha.render('en') : null,
    parshaHe: parsha ? parsha.render('he') : null,
  });
});

// GET /calendar/holidays?year=2024&il=false
router.get('/holidays', (req, res) => {
  const year = parseYear(req.query);
  const il = req.query.il === 'true';

  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il,
    mask: flags.HOLIDAYS | flags.MINOR_FAST,
  }).map(ev => ({
    date: ev.getDate().greg().toISOString().slice(0, 10),
    title: ev.render('en'),
    titleHe: ev.render('he'),
    category: ev.getCategories()[0] || '',
  }));

  res.json({ year, il, events });
});

// GET /calendar/dafyomi?date=2024-03-15
router.get('/dafyomi', (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const hdate = new HDate(new Date(dateStr));
  const events = HebrewCalendar.calendar({
    start: hdate, end: hdate, dailyLearning: { dafYomi: true },
  });
  const ev = events[0] || null;
  res.json({
    date: dateStr,
    tractate: ev?.daf?.name ?? null,
    daf: ev?.daf?.blatt ?? null,
    display: ev ? ev.render('en') : null,
    displayHe: ev ? ev.render('he') : null,
  });
});

// GET /calendar/nach?date=2024-03-15
router.get('/nach', (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const hdate = new HDate(new Date(dateStr));
  const events = HebrewCalendar.calendar({
    start: hdate, end: hdate, dailyLearning: { nachYomi: true },
  });
  const ev = events[0] || null;
  res.json({
    date: dateStr,
    display: ev ? ev.render('en') : null,
    displayHe: ev ? ev.render('he') : null,
  });
});
