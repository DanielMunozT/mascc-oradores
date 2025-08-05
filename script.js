const API_KEY = 'AIzaSyAJnbGfYLHm4ZcMmyCp3-vyH8BLMEK2lI4';
const AVAILABILITY_BUFFER_DAYS = 0; // Change this if you want more/less buffer

let speakersCache = null;

function getCalendarUrl(calendarId) {
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`;
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
            const request = formUrl ? ` <a href="${formUrl}" target="_blank">${T.request_speaker}</a>` : '';
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

async function getEventsInRange(startDateInput, endDateInput) {
  const timeMin = new Date(startDateInput).toISOString();
  const endDate = new Date(endDateInput);
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
              const start = e.start.dateTime || e.start.date;
              const end = e.end.dateTime || e.end.date;
              events.push({
                speaker: name,
                event: e.summary,
                start,
                end,
                calendarUrl: getCalendarUrl(calendarId)
              });
            });
          }
        })
        .catch(() => {});
    })
  );

  return events.sort((a, b) => new Date(a.start) - new Date(b.start));
}

function toDateString(val) {
  return (val || '').split('T')[0];
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
    el.textContent = `${formatDate(start)} - ${formatDate(end)}`;
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


function renderEventsTable(events) {
  let html =
    '<table border="1" cellpadding="4" cellspacing="0"><thead><tr>' +
    `<th>${T.speaker}</th>` +
    `<th>${T.event}</th>` +
    `<th>${T.start}</th>` +
    `<th>${T.end}</th>` +
    `<th>${T.calendar}</th>` +
    '</tr></thead><tbody>';
  if (events.length) {
    events.forEach(e => {
      html +=
        '<tr>' +
        `<td>${e.speaker}</td>` +
        `<td>${e.event}</td>` +
        `<td>${toDateString(e.start)}</td>` +
        `<td>${toDateString(e.end)}</td>` +
        `<td><a href="${e.calendarUrl}" target="_blank">${T.view_calendar}</a></td>` +
        '</tr>';
    });
  } else {
    html += `<tr><td colspan="5">${T.not_teaching}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

async function showEventsRange(startDateInput, endDateInput, divId = 'results') {
  const resultsDiv = document.getElementById(divId);
  resultsDiv.innerHTML = T.loading;
  const events = await getEventsInRange(startDateInput, endDateInput);
  resultsDiv.innerHTML = renderEventsTable(events);
}

if (typeof window !== 'undefined') {
  window.showEventsRange = showEventsRange;
  window.flagEmoji = flagEmoji;
  window.startOfWeek = startOfWeek;
  window.endOfWeek = endOfWeek;
  window.formatDate = formatDate;
  window.setRangeText = setRangeText;
  window.getCalendarUrl = getCalendarUrl;
  window.speakers = speakers;
}
