import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { sessionCalendar } from "./generated/calendar.mjs";

export function createCalendarExports(secret) {
  const key = createHash("sha256").update(`skills-ring-calendar:${secret}`).digest();
  return {
    issue(event, now = Date.now()) {
      if (!event || typeof event.id !== "string" || event.id.length > 240 || typeof event.title !== "string" || event.title.length > 300 || typeof event.place !== "string" || event.place.length > 300 || typeof event.start !== "string" || !Number.isInteger(event.minutes) || event.minutes < 1 || event.minutes > 1440) throw new Error("Invalid calendar event.");
      sessionCalendar(event.id, event.start, event.minutes, event.title, event.place);
      const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
      const payload = JSON.stringify({ event, expires: now + 5 * 60_000 });
      const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
    },
    download(ticket, now = Date.now()) {
      if (!ticket || ticket.length > 12000) throw new Error("Invalid download.");
      const bytes = Buffer.from(ticket, "base64url"), decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
      decipher.setAuthTag(bytes.subarray(12, 28));
      const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
      if (payload.expires <= now) throw new Error("Download expired. Export the calendar again.");
      const e = payload.event;
      return sessionCalendar(e.id, e.start, e.minutes, e.title, e.place);
    },
  };
}
