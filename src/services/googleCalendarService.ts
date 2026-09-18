import { getAccessToken } from './googleAuthService';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export const createCalendarEvent = async (token: string, event: CalendarEvent): Promise<any> => {
  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to create calendar event');
  }
  return await res.json();
};
