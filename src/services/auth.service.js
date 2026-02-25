import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Custom error codes for cleaner UI handling
export class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

let googleConfigured = false;

function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    // This must be the "Web client ID" from Google Cloud / Firebase
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // offlineAccess true is optional; only needed if you want server auth codes later
    offlineAccess: false,
  });
  googleConfigured = true;
}


/**
 * Logs in via Firebase Auth and loads the Firestore user profile.
 * Does NOT block based on workerStatus (approval) — only checks account existence + isActive.
 */
export const loginAndLoadProfile = async (email, password) => {
  try {
    // 1) Auth sign-in
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;

    // 2) Firestore profile
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Auth account exists but no Firestore profile doc
      throw new AuthError(
        "PROFILE_MISSING",
        "Your account exists but your profile is not set up. Contact support."
      );
    }

    const profile = { id: snap.id, ...snap.data() };

    // 3) Only block if explicitly disabled
    if (profile.isActive === false) {
      throw new AuthError("ACCOUNT_DISABLED", "This account is disabled.");
    }

    // ✅ Do NOT check workerStatus here
    return profile;
  } catch (err) {
    // Firebase auth errors come with err.code (e.g., auth/wrong-password)
    if (err instanceof AuthError) throw err;

    // Map common auth errors to friendly messages
    const code = err?.code || "UNKNOWN";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      throw new AuthError("INVALID_CREDENTIALS", "Wrong email or password.");
    }
    if (code === "auth/user-not-found") {
      throw new AuthError("USER_NOT_FOUND", "No account found for this email.");
    }
    if (code === "auth/too-many-requests") {
      throw new AuthError("RATE_LIMIT", "Too many attempts. Try again later.");
    }

    throw new AuthError("UNKNOWN", err?.message || "Login failed.");
  }
};

export const loginWithGoogleAndLoadProfile = async () => {
  try {
    ensureGoogleConfigured();

    // Trigger native Google Sign-In UI
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const { idToken } = await GoogleSignin.signIn();

    if (!idToken) {
      throw new AuthError("MISSING_ID_TOKEN", "Google sign-in did not return an ID token.");
    }

    // Firebase credential from Google ID token
    const credential = GoogleAuthProvider.credential(idToken);

    // Firebase Auth sign-in
    const cred = await signInWithCredential(auth, credential);
    const uid = cred.user.uid;

    // Firestore profile (same logic as email/password)
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new AuthError(
        "PROFILE_MISSING",
        "Your account exists but your profile is not set up. Contact support."
      );
    }

    const profile = { id: snap.id, ...snap.data() };

    if (profile.isActive === false) {
      throw new AuthError("ACCOUNT_DISABLED", "This account is disabled.");
    }

    return profile;
  } catch (err) {
    if (err instanceof AuthError) throw err;

    // Common native cancellations / availability cases
    const message = err?.message || "Google login failed.";

    // Library-specific errors vary; keep UI clean:
    if (String(message).toLowerCase().includes("cancel")) {
      throw new AuthError("CANCELLED", "Google sign-in was cancelled.");
    }

    throw new AuthError("UNKNOWN", message);
  }
};