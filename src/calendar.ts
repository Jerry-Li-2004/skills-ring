/** RFC 5545 calendar content, with stable event IDs and UTF-8 line folding. */
export function sessionCalendar(id: string, start: string, minutes: number, title: string, place: string, now = new Date()) {
  const began = new Date(start);
  if (!Number.isFinite(began.getTime()) || !Number.isFinite(minutes) || minutes <= 0) throw new Error("Invalid session time.");
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const fold = (line: string) => {
    let result = "", bytes = 0;
    for (const char of line) {
      const length = new TextEncoder().encode(char).length;
      if (bytes + length > 75) { result += "\r\n "; bytes = 1; }
      result += char; bytes += length;
    }
    return result;
  };
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Skills Ring//Sessions//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${encodeURIComponent(id)}@skills-ring`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(began)}`,
    `DTEND:${stamp(new Date(began.getTime() + minutes * 60000))}`, `SUMMARY:${escape(title)}`, `LOCATION:${escape(place)}`,
    "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR", ""].map(fold).join("\r\n");
}
