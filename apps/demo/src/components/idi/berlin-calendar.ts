export const berlinTimeZone = 'Europe/Berlin';

const berlinDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: berlinTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The current Berlin calendar date as YYYY-MM-DD, regardless of browser timezone. */
export function getBerlinToday(now = new Date()) {
  const { year, month, day } = Object.fromEntries(
    berlinDateFormatter.formatToParts(now).map(({ type, value }) => [type, value])
  );
  return `${year}-${month}-${day}`;
}

/** Use UTC only for date-only arithmetic, so daylight saving cannot shift the day. */
export function getCalendarDate(date: string, offset = 0) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result;
}

/** The first weekday strictly after today in Berlin, as YYYY-MM-DD. */
export function getNextBerlinWeekday(now = new Date()) {
  const tomorrow = getCalendarDate(getBerlinToday(now), 1);
  const day = tomorrow.getUTCDay();
  if (day === 6) tomorrow.setUTCDate(tomorrow.getUTCDate() + 2);
  if (day === 0) tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}
