export const normalizeName = (s) => {
  if (!s) return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // collapse multiple spaces
};