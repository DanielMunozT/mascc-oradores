import { getCountryCode } from './countryCodeLookup.js';

const API_KEY = 'AIzaSyAJnbGfYLHm4ZcMmyCp3-vyH8BLMEK2lI4';
const AVAILABILITY_BUFFER_DAYS = 0; // Change this if you want more/less buffer

let speakersCache = null;

function getCalendarUrl(calendarId) {
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;
}

function getFollowUrl(calendarId) {
  return `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
}

async function speakers() {
  if (!speakersCache) {
    const res = await fetch('speakers.json');
    speakersCache = await res.json();
    speakersCache.sort(
      (a, b) =>
        (a.normalizedCountryCode || '').localeCompare(b.normalizedCountryCode || '') ||
        (a.name || '').localeCompare(b.name || '')
    );
  }
  return speakersCache;
}

async function checkAvailability() {
  const startDateInput = document.getElementById('startDate').value;
  const endDateInput = document.getElementById('endDate').value;
  const mustBeEntireRange = document.getElementById('entireRange')?.checked;
  if (!startDateInput || !endDateInput) return;

  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);

  // Apply buffer
  const bufferedStart = new Date(startDate);
  bufferedStart.setDate(bufferedStart.getDate() - AVAILABILITY_BUFFER_DAYS);
  const bufferedEnd = new Date(endDate);
  bufferedEnd.setDate(bufferedEnd.getDate() + AVAILABILITY_BUFFER_DAYS);

  const timeMin = bufferedStart.toISOString();
  const timeMax = bufferedEnd.toISOString();

  const sp = await speakers();

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = T.loading;

  if (mustBeEntireRange) {
    const results = [];

    await Promise.all(
      sp.map(
        ({ name, calendarId, formUrl, location, normalizedCountryCode, languages }) => {
          const { city, state, country } = parseLocation(location || '');
          const parts = [city, state, country].filter(Boolean).join(', ');
          const loc = parts
            ? `<br/>${flagEmoji(normalizedCountryCode)} ${parts}`
            : '';
          const langs = languages && languages.length
            ? `<br/>🗣️ ${languages.join(', ')}`
            : '';
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

        return fetch(url)
          .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, statusText: res.statusText, data })))
          .then(({ ok, status, statusText, data }) => {
            if (!ok || data.error) {
              let msg = data && data.error && data.error.message;
              if (!msg) {
                const statusMsg = `${status} ${statusText}`.trim();
                msg = statusMsg || T.calendar_private;
              }
              results.push(`<p><strong>${name}</strong>${loc}${langs}: <span style="color:orange">${msg}</span></p>`);
            } else if (!data.items || data.items.length === 0) {
              const request = formUrl
                ? `<br/><a href="${formUrl}" target="_blank">${T.request_speaker}</a>`
                : '';
              results.push(`<p><strong>${name}</strong>${loc}${langs}: <span style="color:green">${T.available}</span>${request}</p>`);
            } else {
              // Speaker is teaching in this range; do not include in results
            }
          })
        .catch(err => {
          const msg = err && err.message ? err.message : T.calendar_private;
          results.push(`<p><strong>${name}</strong>${loc}${langs}: <span style="color:orange">${msg}</span></p>`);
        });
    }));

    resultsDiv.innerHTML = results.join('');
    return;
  }

  const weeks = [];
  let current = startOfWeek(startDate);
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekStart.getDate() + 6);
    const rangeStart = weekStart < startDate ? startDate : weekStart;
    const rangeEnd = weekEnd > endDate ? endDate : weekEnd;
    weeks.push({ weekStart, weekEnd, rangeStart, rangeEnd, available: [] });
    current.setDate(current.getDate() + 7);
  }

  const errors = [];

  await Promise.all(
    sp.map(
      ({ name, calendarId, formUrl, location, normalizedCountryCode, languages }) => {
        const { city, state, country } = parseLocation(location || '');
        const parts = [city, state, country].filter(Boolean).join(', ');
        const loc = parts
          ? `<br/>${flagEmoji(normalizedCountryCode)} ${parts}`
          : '';
        const langs = languages && languages.length
          ? `<br/>🗣️ ${languages.join(', ')}`
          : '';
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

      return fetch(url)
        .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, statusText: res.statusText, data })))
        .then(({ ok, status, statusText, data }) => {
          if (!ok || data.error) {
            let msg = data && data.error && data.error.message;
            if (!msg) {
              const statusMsg = `${status} ${statusText}`.trim();
              msg = statusMsg || T.calendar_private;
            }
            errors.push(`<p><strong>${name}</strong>${loc}${langs}: <span style="color:orange">${msg}</span></p>`);
          } else {
            weeks.forEach(w => {
              if (!hasEventInRange(data.items, w.rangeStart, w.rangeEnd)) {
                const request = formUrl
                  ? `<br/><a href="${formUrl}" target="_blank">${T.request_speaker}</a>`
                  : '';
                w.available.push(`<p><strong>${name}</strong>${loc}${langs}: <span style=\"color:green\">${T.available}</span>${request}</p>`);
              }
            });
          }
        })
      .catch(err => {
        const msg = err && err.message ? err.message : T.calendar_private;
        errors.push(`<p><strong>${name}</strong>${loc}${langs}: <span style="color:orange">${msg}</span></p>`);
      });
  }));

  const html = [];
  weeks.forEach(w => {
    html.push(`<h3>${formatDisplayDate(w.weekStart)} - ${formatDisplayDate(w.weekEnd)}</h3>`);
    if (w.available.length) {
      html.push(w.available.join(''));
    } else {
      html.push(`<p>${T.none_available}</p>`);
    }
  });
  html.push(errors.join(''));
  resultsDiv.innerHTML = html.join('');
}

async function checkTeaching() {
  const startDateInput = document.getElementById('startDate').value;
  const endDateInput = document.getElementById('endDate').value;
  if (!startDateInput || !endDateInput) return;

  await showEventsRange(startDateInput, endDateInput);
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);

function parseLocation(loc) {
  if (!loc) return { city: '', state: '', country: '' };
  const commaParts = loc.split(',');
  if (commaParts.length >= 3) {
    const country = commaParts.pop().trim();
    const state = commaParts.pop().trim();
    const city = commaParts.pop().trim();
    return { city, state, country };
  }

  const tokens = loc.trim().split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i].replace(/[^A-Za-z]/g, '');
    if (US_STATES.has(t)) {
      const city = tokens[i - 1] || '';
      const country = tokens.slice(i + 1).filter(tok => isNaN(tok)).join(' ').trim();
      return { city, state: t, country };
    }
  }

  if (commaParts.length === 2) {
    return { city: commaParts[0].trim(), state: '', country: commaParts[1].trim() };
  }

  return { city: '', state: '', country: loc.trim() };
}

function hasEventInRange(items, start, end) {
  if (!items || !items.length) return false;
  return items.some(e => {
    const s = new Date(e.start.dateTime || e.start.date);
    const t = new Date(e.end.dateTime || e.end.date);
    return s <= end && t >= start;
  });
}

async function getEventsInRange(startDateInput, endDateInput) {
  const timeMin = new Date(`${startDateInput}T00:00:00`).toISOString();
  const endDate = new Date(`${endDateInput}T00:00:00`);
  endDate.setDate(endDate.getDate() + 1);
  const timeMax = endDate.toISOString();

  const sp = await speakers();

  const events = [];

  await Promise.all(
    sp.map(({ name, calendarId }) => {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

      return fetch(url)
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (ok && data.items) {
            data.items.forEach(e => {
              const firstWord = ((e.summary || '')
                .trim()
                .split(/\s+/)[0] || '')
                .toLowerCase();
              if (firstWord === 'ocupado') return;

              const start = e.start.dateTime || e.start.date;
              const end = e.end.dateTime || e.end.date;
              events.push({
                speaker: name,
                event: e.summary,
                start,
                end,
                calendarUrl: getCalendarUrl(calendarId),
                followUrl: getFollowUrl(calendarId)
              });
            });
          }
        })
        .catch(() => {});
    })
  );

  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function formatDisplayDate(date) {
  const lang =
    typeof i18next !== 'undefined' && i18next.language
      ? i18next.language
      : 'en';
  return new Date(date).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function toDateString(val) {
  if (!val) return '';
  return formatDisplayDate(val);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function setRangeText(start, end, rangeId = 'range') {
  const el = document.getElementById(rangeId);
  if (el) {
    el.textContent = `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
  }
}

const COUNTRY_OVERRIDES = {
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  'U.S.A.': 'US',
  'U.S.A': 'US',
  'USA': 'US',
  'U.S.': 'US',
  'UNITED KINGDOM': 'GB',
  'UK': 'GB',
  'U.K.': 'GB',
  'GREAT BRITAIN': 'GB',
  'BRASIL': 'BR',
  'BRAZIL': 'BR',
  'MEXICO': 'MX',
  'M\u00c9XICO': 'MX',
  'SPAIN': 'ES',
  'ESPA\u00d1A': 'ES',
  'CANADA': 'CA',
  'CANAD\u00c1': 'CA'
};

function flagEmoji(country) {
  if (!country) return '';
  const key = country.trim().toUpperCase();
  const override = COUNTRY_OVERRIDES[key];
  const cc = (override || country.trim().slice(0, 2)).toUpperCase();
  if (cc.length !== 2) return '';
  const base = 0x1f1e6;
  const first = cc.codePointAt(0);
  const second = cc.codePointAt(1);
  if (first < 65 || first > 90 || second < 65 || second > 90) return '';
  return (
    String.fromCodePoint(base + first - 65) +
    String.fromCodePoint(base + second - 65)
  );
}


function formatShortDate(date) {
  const lang =
    typeof i18next !== 'undefined' && i18next.language
      ? i18next.language
      : 'en';
  return new Date(date).toLocaleDateString(lang, {
    month: 'short',
    day: 'numeric'
  });
}

function formatShortRange(start, end) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function renderEventsList(events, startDateInput, endDateInput) {
  const start = new Date(`${startDateInput}T00:00:00`);
  const end = new Date(`${endDateInput}T00:00:00`);
  const weeks = [];
  let current = startOfWeek(start);
  while (current <= end) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekStart.getDate() + 6);
    weeks.push({ weekStart, weekEnd, events: [] });
    current.setDate(current.getDate() + 7);
  }

  events.forEach(e => {
    const s = new Date(e.start);
    const w = weeks.find(
      w => s >= w.weekStart && s <= w.weekEnd
    );
    if (w) w.events.push(e);
  });

  const html = [];
  weeks.forEach(w => {
    if (!w.events.length) return;
    w.events.sort((a, b) => (a.event || '').localeCompare(b.event || ''));
    html.push(
      `<h3>${formatDisplayDate(w.weekStart)} - ${formatDisplayDate(
        w.weekEnd
      )}</h3>`
    );
    html.push('<ol>');
    w.events.forEach(e => {
      const country = ((e.event || '').trim().split(/[^A-Za-zÀ-ÿ]+/)[0]) || '';
      const flag = flagEmoji(getCountryCode(country));
      const eventName = (e.event || '').trim();
      const eventDisplay = eventName && !eventName.endsWith('.') ? eventName + '.' : eventName;
      html.push(
        `<li>${flag ? flag + ' ' : ''}${eventDisplay} ${e.speaker} (${formatShortRange(
          e.start,
          e.end
        )})</li>`
      );
    });
    html.push('</ol>');
  });
  return html.join('');
}

async function showEventsRange(startDateInput, endDateInput, divId = 'results') {
  const resultsDiv = document.getElementById(divId);
  resultsDiv.innerHTML = T.loading;
  const events = await getEventsInRange(startDateInput, endDateInput);
  resultsDiv.innerHTML = renderEventsList(events, startDateInput, endDateInput);
}

if (typeof window !== 'undefined') {
  window.showEventsRange = showEventsRange;
  window.flagEmoji = flagEmoji;
  window.startOfWeek = startOfWeek;
  window.endOfWeek = endOfWeek;
  window.formatDate = formatDate;
  window.setRangeText = setRangeText;
  window.getCalendarUrl = getCalendarUrl;
  window.getFollowUrl = getFollowUrl;
  window.speakers = speakers;
  window.checkAvailability = checkAvailability;
  window.checkTeaching = checkTeaching;
}

export {
  speakers,
  getCalendarUrl,
  getFollowUrl,
  flagEmoji,
  startOfWeek,
  endOfWeek,
  showEventsRange,
  formatDate,
  checkAvailability,
  checkTeaching,
  setRangeText
};
