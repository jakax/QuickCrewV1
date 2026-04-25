import { Timestamp } from "firebase/firestore";

export function asDateMaybe(tsOrDate) {
  if (!tsOrDate) return null;
  if (tsOrDate instanceof Date) return tsOrDate;
  if (tsOrDate instanceof Timestamp) return tsOrDate.toDate();
  if (typeof tsOrDate?.seconds === "number") return new Date(tsOrDate.seconds * 1000);
  return null;
}