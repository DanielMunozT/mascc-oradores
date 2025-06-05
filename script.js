const API_KEY = 'AIzaSyAJnbGfYLHm4ZcMmyCp3-vyH8BLMEK2lI4';
let speakers = [];

async function loadSpeakers() {
  const res = await fetch('speakers.json');
  speakers = await res.json();
}

function isoRange(date) {
  const start = new Date(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString()
  };
}

async function checkAvailability() {
  const startInput = document.getElementById('startTime').value;
  const endInput = document.getElementById('endTime').value;
  if (!startInput || !endInput) return;

  const timeMin = new Date(startInput).toISOString();
  const timeMax = new Date(endInput).toISOString();

  if (speakers.length === 0) await loadSpeakers();

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = T.loading;

  const results = [];

  await Promise.all(speakers.map(({ name, calendarId }) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    return fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.items || data.items.length === 0) {
          results.push(`<p><strong>${name}</strong> is <span style="color:green">${T.available}</span></p>`);
        } else {
          results.push(`<p><strong>${name}</strong> ${T.is_teaching}</p><ul>` +
            data.items.map(e => `<li>${e.summary} (${e.start.dateTime || e.start.date})</li>`).join('') + '</ul>');
        }
      });
  }));

  resultsDiv.innerHTML = results.join('');
}


async function checkAtTime() {
  const dateTime = document.getElementById('timePicker').value;
  if (!dateTime) return;
  if (speakers.length === 0) await loadSpeakers();
  const time = new Date(dateTime);
  const timeMin = new Date(time.getTime() - 15 * 60 * 1000).toISOString();
  const timeMax = new Date(time.getTime() + 15 * 60 * 1000).toISOString();
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = T.loading;
  const results = [];

  await Promise.all(speakers.map(({ name, calendarId }) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    return fetch(url).then(res => res.json()).then(data => {
      const eventNow = data.items?.find(e => {
        const start = new Date(e.start.dateTime || e.start.date);
        const end = new Date(e.end.dateTime || e.end.date);
        return time >= start && time <= end;
      });
      if (eventNow) {
        results.push(`<p><strong>${name}</strong> <span style="color:red">${T.teaching_now}</span>: ${eventNow.summary}</p>`);
      } else {
        results.push(`<p><strong>${name}</strong> is <span style="color:green">${T.not_teaching}</span>.</p>`);
      }
    });
  }));

  resultsDiv.innerHTML = results.join('');
}

async function checkTeaching() {
  const startInput = document.getElementById('startDate').value;
  const endInput = document.getElementById('endDate').value;
  if (!startInput || !endInput) return;

  const timeMin = new Date(startInput).toISOString();
  const timeMax = new Date(new Date(endInput).setDate(new Date(endInput).getDate() + 1)).toISOString();

  if (typeof loadSpeakers === 'function' && (!window.speakers || speakers.length === 0)) {
    await loadSpeakers();
  }

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = T.loading;

  const results = [];

  await Promise.all(speakers.map(({ name, calendarId }) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    return fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.items || data.items.length === 0) {
          results.push(`<p><strong>${name}</strong>: <span style="color:green">${T.not_teaching}</span></p>`);
        } else {
          results.push(`<p><strong>${name}</strong> ${T.is_teaching}</p><ul>` +
            data.items.map(e => {
              const time = e.start.dateTime || e.start.date;
              return `<li>${e.summary} – ${time}</li>`;
            }).join('') + '</ul>');
        }
      });
  }));

  resultsDiv.innerHTML = results.join('');
}
