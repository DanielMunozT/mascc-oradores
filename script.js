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

function formatLanguages(languages) {
  if (!languages || !languages.length) return '';
  try {
    const lang = typeof i18next !== 'undefined' && i18next.language ? i18next.language : 'en';
    const display = new Intl.DisplayNames([lang], { type: 'language' });
    return languages.map(code => display.of(code) || code).join(', ');
  } catch (e) {
    return languages.join(', ');
  }
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
  const noteEl = document.getElementById('regionalNote');
  if (noteEl) noteEl.style.display = 'none';
  let regionalOnly = false;
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
            ? `<br/>🗣️ ${formatLanguages(languages)}`
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
                results.push({
                  code: normalizedCountryCode || '',
                  name,
                  html: `<p><strong>${name}</strong>${loc}${langs}<br/><span style="color:orange">${msg}</span></p>`
                });
              } else {
                let hasRegional = false;
                let hasOther = false;
                (data.items || []).forEach(e => {
                  const firstWord = ((e.summary || '')
                    .trim()
                    .split(/\s+/)[0] || '')
                    .toLowerCase();
                  if (firstWord === 'regional') hasRegional = true;
                  else hasOther = true;
                });
                if (!hasOther) {
                  const request = formUrl
                    ? `<br/><a href="${formUrl}" target="_blank">${T.request_speaker}</a>`
                    : '';
                  const status = hasRegional
                    ? T.available_only_in_region
                    : T.available;
                  if (hasRegional) regionalOnly = true;
                  results.push({
                    code: normalizedCountryCode || '',
                    name,
                    html: `<p><strong>${name}</strong>${loc}${langs}<br/><span style="color:green">${status}</span>${request}</p>`
                  });
                }
                // Speaker is teaching in this range if there are other events
              }
            })
            .catch(err => {
              const msg = err && err.message ? err.message : T.calendar_private;
              results.push({
                code: normalizedCountryCode || '',
                name,
                html: `<p><strong>${name}</strong>${loc}${langs}<br/><span style="color:orange">${msg}</span></p>`
              });
            });
        }
      )
    );

    results.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
    resultsDiv.innerHTML = results.map(r => r.html).join('');
    if (noteEl && regionalOnly) noteEl.style.display = 'block';
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
          ? `<br/>🗣️ ${formatLanguages(languages)}`
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
            errors.push(`<p><strong>${name}</strong>${loc}${langs}<br/><span style="color:orange">${msg}</span></p>`);
          } else {
            weeks.forEach(w => {
              let hasRegional = false;
              let hasOther = false;
              (data.items || []).forEach(e => {
                const firstWord = ((e.summary || '')
                  .trim()
                  .split(/\s+/)[0] || '')
                  .toLowerCase();
                const s = new Date(e.start.dateTime || e.start.date);
                const t = new Date(e.end.dateTime || e.end.date);
                if (s <= w.rangeEnd && t >= w.rangeStart) {
                  if (firstWord === 'regional') hasRegional = true;
                  else hasOther = true;
                }
              });
              if (!hasOther) {
                const request = formUrl
                  ? `<br/><a href="${formUrl}" target="_blank">${T.request_speaker}</a>`
                  : '';
                const status = hasRegional
                  ? T.available_only_in_region
                  : T.available;
                if (hasRegional) regionalOnly = true;
                w.available.push({
                  code: normalizedCountryCode || '',
                  name,
                  html: `<p><strong>${name}</strong>${loc}${langs}<br/><span style="color:green">${status}</span>${request}</p>`
                });
              }
            });
          }
        })
      .catch(err => {
        const msg = err && err.message ? err.message : T.calendar_private;
        errors.push(`<p><strong>${name}</strong>${loc}${langs}<br/><span style="color:orange">${msg}</span></p>`);
      });
    }));

    weeks.forEach(w => {
      w.available.sort((a, b) => a.code.localeCompare(b.code) || a.name.localeCompare(b.name));
    });

    const html = [];
    weeks.forEach(w => {
      html.push(`<h3>${formatDisplayDate(w.weekStart)} - ${formatDisplayDate(w.weekEnd)}</h3>`);
      if (w.available.length) {
        html.push(w.available.map(a => a.html).join(''));
      } else {
        html.push(`<p>${T.none_available}</p>`);
      }
    });
    html.push(errors.join(''));
    resultsDiv.innerHTML = html.join('');
    if (noteEl && regionalOnly) noteEl.style.display = 'block';
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
              if (firstWord === 'ocupado' || firstWord === 'regional') return;

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
    const rangeText = `${formatDisplayDate(w.weekStart)} - ${formatDisplayDate(
      w.weekEnd
    )}`;
    const lines = [`*${rangeText}*`];
    const itemsHtml = [];
    w.events.forEach((e, i) => {
      const country = ((e.event || '').trim().split(/[^A-Za-zÀ-ÿ]+/)[0]) || '';
      const flag = flagEmoji(getCountryCode(country));
      const eventName = (e.event || '').trim();
      const eventDisplay =
        eventName && !eventName.endsWith('.') ? eventName + '.' : eventName;
      itemsHtml.push(
        `<li>${flag ? flag + ' ' : ''}${eventDisplay} ${e.speaker} (${formatShortRange(
          e.start,
          e.end
        )})</li>`
      );
      lines.push(
        `${i + 1}. ${flag ? flag + ' ' : ''}${eventDisplay} ${e.speaker} (${formatShortRange(
          e.start,
          e.end
        )})`
      );
    });
    const copyText = encodeURIComponent(lines.join('\n'));
    html.push(
      `<h3>${rangeText} <a href="#" onclick="copyWeek('${copyText}', this); return false;" title="${T.copy_week}" style="font-size:0.75em;margin-left:0.5em;">📋 ${T.copy_week}</a></h3>`
    );
    html.push('<ol>');
    html.push(...itemsHtml);
    html.push('</ol>');
  });
  return html.join('');
}

function copyWeek(encoded, linkElement) {
  const text = decodeURIComponent(encoded);
  const originalHtml = linkElement.innerHTML;
  const originalTitle = linkElement.title;
  const showCopied = () => {
    linkElement.innerHTML = `✅ ${T.copied}`;
    linkElement.title = T.copied;
    setTimeout(() => {
      linkElement.innerHTML = originalHtml;
      linkElement.title = originalTitle;
    }, 2000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopied);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showCopied();
  }
}

async function showEventsRange(startDateInput, endDateInput, divId = 'results') {
  const resultsDiv = document.getElementById(divId);
  resultsDiv.innerHTML = T.loading;
  const events = await getEventsInRange(startDateInput, endDateInput);
  resultsDiv.innerHTML = renderEventsList(events, startDateInput, endDateInput);
}

function syncInputsWithUrl() {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  if (!startInput || !endInput) return;

  const entireRangeInput = document.getElementById('entireRange');
  const params = new URLSearchParams(window.location.search);
  const startParam = params.get('from');
  const endParam = params.get('to');
  const entireParam = params.get('entire');

  if (startParam) startInput.value = startParam;
  if (endParam) endInput.value = endParam;
  if (entireRangeInput) entireRangeInput.checked = entireParam === '1';

  function updateUrl() {
    const url = new URL(window.location.href);
    if (startInput.value) url.searchParams.set('from', startInput.value);
    else url.searchParams.delete('from');
    if (endInput.value) url.searchParams.set('to', endInput.value);
    else url.searchParams.delete('to');
    if (entireRangeInput) {
      if (entireRangeInput.checked) url.searchParams.set('entire', '1');
      else url.searchParams.delete('entire');
    }
    history.replaceState(null, '', url);
  }

  startInput.addEventListener('change', updateUrl);
  endInput.addEventListener('change', updateUrl);
  if (entireRangeInput) entireRangeInput.addEventListener('change', updateUrl);

  if (startParam && endParam) {
    updateUrl();
    if (entireRangeInput && typeof checkAvailability === 'function') {
      checkAvailability();
    } else if (!entireRangeInput && typeof checkTeaching === 'function') {
      checkTeaching();
    }
  }
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
  window.addEventListener('DOMContentLoaded', syncInputsWithUrl);
  window.copyWeek = copyWeek;
  window.formatLanguages = formatLanguages;
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
  formatDisplayDate,
  checkAvailability,
  checkTeaching,
  setRangeText,
  copyWeek,
  API_KEY,
  formatLanguages
};
