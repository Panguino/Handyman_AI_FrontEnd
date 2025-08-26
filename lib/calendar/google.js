import { google } from 'googleapis';

function getJwtClient() {
  // Prefer new naming (account creds for updating calendar), fallback to legacy service account vars
  const email = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const key = rawKey?.replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Missing calendar account credentials: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
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
