import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, OAuthProvider } from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from 'expo-apple-authentication';

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
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export const loginAndLoadProfile = async (email, password) => {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;

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

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const result = await GoogleSignin.signIn();
    const idToken = result?.data?.idToken;

    if (!idToken) {
      throw new AuthError("MISSING_ID_TOKEN", "Google sign-in did not return an ID token.");
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const uid = cred.user.uid;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const profile = { id: snap.id, ...snap.data() };

      if (profile.isActive === false) {
        throw new AuthError("ACCOUNT_DISABLED", "This account is disabled.");
      }

      // If photo is missing, sync it from Google
      const googleUser = result?.data?.user;
      console.log("Google user info:", googleUser);
      if (!profile.photo?.url && googleUser?.photo) {
        await setDoc(ref, { photo: { url: googleUser.photo } }, { merge: true });
        return { ...profile, photo: { url: googleUser.photo } };
      }

      return profile;
    }

    // New Google user — create basic worker profile
    const googleUser = result?.data?.user;
    console.log("Google user info:", googleUser);
    const newProfile = {
      role: "worker",
      isActive: true,
      email: googleUser?.email ?? cred.user.email ?? null,
      firstName: googleUser?.givenName ?? null,
      lastName: googleUser?.familyName ?? null,
      photo: googleUser?.photo ? { url: googleUser.photo } : null,
      authProvider: "google",
      createdAt: serverTimestamp(),
    };

    await setDoc(ref, newProfile);
    return { id: uid, ...newProfile };

  } catch (err) {
    if (err instanceof AuthError) throw err;

    const message = err?.message || "Google login failed.";
    if (String(message).toLowerCase().includes("cancel")) {
      throw new AuthError("CANCELLED", "Google sign-in was cancelled.");
    }

    throw new AuthError("UNKNOWN", message);
  }
};

export const loginWithAppleAndLoadProfile = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken, email, fullName } = credential;

    if (!identityToken) {
      throw new AuthError("MISSING_ID_TOKEN", "Apple sign-in did not return an identity token.");
    }

    const provider = new OAuthProvider("apple.com");
    const firebaseCredential = provider.credential({ idToken: identityToken });

    const cred = await signInWithCredential(auth, firebaseCredential);
    const uid = cred.user.uid;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      // Returning user
      const profile = { id: snap.id, ...snap.data() };
      if (profile.isActive === false) {
        throw new AuthError("ACCOUNT_DISABLED", "This account is disabled.");
      }
      return profile;
    }

    // New Apple user — Apple only returns email and name on the first sign in ever
    const newProfile = {
      role: "worker",
      isActive: true,
      email: email ?? cred.user.email ?? null,
      firstName: fullName?.givenName ?? null,
      lastName: fullName?.familyName ?? null,
      photo: null, // Apple does not provide a profile photo
      authProvider: "apple",
      createdAt: serverTimestamp(),
    };

    await setDoc(ref, newProfile);
    return { id: uid, ...newProfile };

  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err?.code === "ERR_REQUEST_CANCELED") {
      throw new AuthError("CANCELLED", "Apple sign-in was cancelled.");
    }
    throw new AuthError("UNKNOWN", err?.message || "Apple login failed.");
  }
};