export const sanitizePhone = (raw = "") => {
  const s = String(raw);
  let cleaned = s.replace(/[^\d+]/g, "");
  if (cleaned.includes("+")) {
    cleaned = (cleaned[0] === "+" ? "+" : "") + cleaned.replace(/\+/g, "");
  }
  return cleaned;
};

export const isValidEmailLoose = (email = "") => {
  return /^\S+@\S+\.\S+$/.test(String(email).trim());
};