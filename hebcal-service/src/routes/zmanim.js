import { Router } from 'express';
import { HDate, Zmanim, GeoLocation, Location } from '@hebcal/core';

export const router = Router();

function buildZmanim(lat, lon, tzid, date) {
  const hdate = new HDate(date);
  const gloc = new GeoLocation('', lat, lon, 0, tzid);
  const zmanim = new Zmanim(gloc, hdate, false);
  const fmt = (d) => (d ? d.toISOString() : null);
  return {
    date: date.toISOString().slice(0, 10),
    lat,
    lon,
    tzid,
    alotHaShachar: fmt(zmanim.alotHaShachar()),
    misheyakir: fmt(zmanim.misheyakir()),
    dawn: fmt(zmanim.dawn()),
    sunrise: fmt(zmanim.sunrise()),
    sofZmanShmaMGA: fmt(zmanim.sofZmanShmaMGA()),
    sofZmanShma: fmt(zmanim.sofZmanShma()),
    sofZmanTfillaMGA: fmt(zmanim.sofZmanTfillaMGA()),
    sofZmanTfilla: fmt(zmanim.sofZmanTfilla()),
    chatzot: fmt(zmanim.chatzot()),
    minchaGedola: fmt(zmanim.minchaGedola()),
    minchaKetana: fmt(zmanim.minchaKetana()),
    plagHaMincha: fmt(zmanim.plagHaMincha()),
    sunset: fmt(zmanim.sunset()),
    beinHaShmashos: fmt(zmanim.beinHaShmashos()),
    tzeit: fmt(zmanim.tzeit()),
  };
}

// GET /zmanim?lat=40.67&lon=-73.94&tzid=America/New_York&date=2024-03-15
router.get('/', (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const tzid = req.query.tzid || 'UTC';

  if (req.query.lat && req.query.lon) {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    return res.json(buildZmanim(lat, lon, tzid, date));
  }

  if (req.query.city) {
    const city = Location.lookup(req.query.city);
    if (!city) return res.status(404).json({ error: 'City not found' });
    return res.json(buildZmanim(city.latitude, city.longitude, city.timeZoneId, date));
  }

  res.status(400).json({ error: 'Provide lat+lon or city parameter' });
});
