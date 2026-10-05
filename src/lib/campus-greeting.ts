/** Use program time (WIB), independent of the campus browser's timezone. */
export function campusGreeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return hour < 4 || hour >= 18 ? 'Selamat malam' : hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : 'Selamat sore';
}
