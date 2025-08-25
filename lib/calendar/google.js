import { google } from 'googleapis';

function getJwtClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY');
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

export async function createCalendarEvent({ summary, description, start, end, location, attendees = [] }) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) throw new Error('Missing GOOGLE_CALENDAR_ID');

  const auth = getJwtClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary,
    description,
    location,
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: new Date(end).toISOString() },
    attendees,
  };

  const res = await calendar.events.insert({ calendarId, requestBody: event });
  return res.data; // includes id, htmlLink, etc.
}

