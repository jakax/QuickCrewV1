export const getFirebaseAuthErrorMessage = (e) => {
  // Most common: Firebase JS SDK error codes
  const code = e?.code;
  console.log("Firebase error code:", code);

  if (code === "INVALID_CREDENTIALS" || code === "auth/wrong-password") {
    return "Wrong email or password.";
  }
  if (code === "auth/user-not-found") {
    return "No account found for this email.";
  }
  if (code === "RATE_LIMIT") {
    return "Too many attempts. Try again later.";
  }
  if (code === "UNKNOWN") {
    return "Valid password or email is required.";
  }

  // Sometimes Expo surfaces REST error payloads like:
  // { error: { message: "INVALID_LOGIN_CREDENTIALS" } }
  const restMessage = e?.error?.message || e?.error?.errors?.[0]?.message;

  if (restMessage === "INVALID_CREDENTIALS") {
    return "Wrong email or password.";
  }
  if (restMessage === "EMAIL_NOT_FOUND") {
    return "No account found for this email.";
  }
  if (restMessage === "USER_DISABLED") {
    return "This account is disabled.";
  }

  // Fallback to whatever we have
  return e?.message || "Login failed. Please try again.";
};