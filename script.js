const API_KEY = 'AIzaSyAJnbGfYLHm4ZcMmyCp3-vyH8BLMEK2lI4';
const AVAILABILITY_BUFFER_DAYS = 1; // Change this if you want more/less buffer

let speakers = [];

async function loadSpeakers() {
  const res = await fetch('speakers.json');
  speakers = await res.json();
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

  if (speakers.length === 0) await loadSpeakers();

  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = T.loading;

  const results = [];

  await Promise.all(speakers.map(({ name, calendarId, formUrl }) => {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    return fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.items || data.items.length === 0) {
          const request = formUrl ? ` <a href="${formUrl}" target="_blank">${T.request_speaker}</a>` : '';
          results.push(`<p><strong>${name}</strong>: <span style="color:green">${T.available}</span>${request}</p>`);
        } else {
          results.push(`<p><strong>${name}</strong>: <span style="color:red">${T.teaching_now}</span></p><ul>` +
            data.items.map(e => {
              const time = e.start.dateTime || e.start.date;
              return `<li>${e.summary} – ${time}</li>`;
            }).join('') + '</ul>');
        }
      });
  }));

  resultsDiv.innerHTML = results.join('');
}

async function checkTeaching() {
  const startDateInput = document.getElementById('startDate').value;
  const endDateInput = document.getElementById('endDate').value;
  if (!startDateInput || !endDateInput) return;

  const timeMin = new Date(startDateInput).toISOString();
  const endDate = new Date(endDateInput);
  endDate.setDate(endDate.getDate() + 1);
  const timeMax = endDate.toISOString();

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
          results.push(`<p><strong>${name}</strong>: <span style="color:green">${T.not_teaching}</span></p>`);
        } else {
          results.push(`<p><strong>${name}</strong>: <span style="color:red">${T.is_teaching}</span></p><ul>` +
            data.items.map(e => {
              const time = e.start.dateTime || e.start.date;
              return `<li>${e.summary} – ${time}</li>`;
            }).join('') + '</ul>');
        }
      });
  }));

  resultsDiv.innerHTML = results.join('');
}
