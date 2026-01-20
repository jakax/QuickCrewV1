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