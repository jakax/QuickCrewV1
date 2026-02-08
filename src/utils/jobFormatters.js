// Created within last N days => "New shift"
export function isNewShift(createdAt, days = 3) {
  if (!createdAt) return false;

  // createdAt might be Firestore Timestamp or Date or ms
  const createdMs =
    typeof createdAt === "number"
      ? createdAt
      : createdAt?.toMillis
      ? createdAt.toMillis()
      : createdAt instanceof Date
      ? createdAt.getTime()
      : null;

  if (!createdMs) return false;

  const now = Date.now();
  const diffDays = (now - createdMs) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

export function formatShiftDate(isoDate) {
  // isoDate: "YYYY-MM-DD" -> "dd/mm/yyyy"
  if (!isoDate || typeof isoDate !== "string") return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function formatPostedAgo(createdAt) {
  if (!createdAt) return "";

  const createdMs =
    typeof createdAt === "number"
      ? createdAt
      : createdAt?.toMillis
      ? createdAt.toMillis()
      : createdAt instanceof Date
      ? createdAt.getTime()
      : null;

  if (!createdMs) return "";

  const diffSec = Math.floor((Date.now() - createdMs) / 1000);
  if (diffSec < 60) return `Posted ${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Posted ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Posted ${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `Posted ${diffDay}d ago`;
}

export function getShiftStartMs(job) {
  try {
    const sd = job?.shiftDate;
    const st = (job?.shiftTime || "").trim();

    // Firestore Timestamp
    if (sd && typeof sd.toDate === "function") {
      return sd.toDate().getTime();
    }

    // JS Date
    if (sd instanceof Date) return sd.getTime();

    // String date: YYYY-MM-DD
    if (typeof sd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sd)) {
      const firstTime = st.split("-")[0].trim(); // "09:00 - 17:00" → "09:00"

      if (/^\d{1,2}:\d{2}$/.test(firstTime)) {
        const hhmm = firstTime.padStart(5, "0");
        return new Date(`${sd}T${hhmm}:00`).getTime();
      }

      // Fallback: date only
      return new Date(`${sd}T00:00:00`).getTime();
    }

    // Other parseable formats
    if (typeof sd === "string") {
      const dt = new Date(sd);
      if (!Number.isNaN(dt.getTime())) return dt.getTime();
    }

    return Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function canCancelApplication(job, hoursBefore = 4) {
  const startMs = getShiftStartMs(job);
  if (!Number.isFinite(startMs)) return false;

  return startMs - Date.now() >= hoursBefore * 60 * 60 * 1000;
}