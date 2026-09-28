// Environment-aware Expo config. Replaces the old static app.json.
//
// APP_ENV controls which Firebase project (dev vs prod) the app is wired to.
// It's set per EAS build profile in eas.json, and defaults to "development"
// locally (see .env). See CLAUDE.md for the full dev/prod split explanation.
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || "development";
const isProd = APP_ENV === "production";

// Falls back to the dev value so tooling that evaluates this config without the
// full EAS build-profile env (e.g. `eas credentials`, `npx expo config`) doesn't
// crash. Real builds always get the correct per-profile value from eas.json.
const GOOGLE_IOS_URL_SCHEME =
  process.env.GOOGLE_IOS_URL_SCHEME ||
  "com.googleusercontent.apps.222676842218-t9o4l55u6mrl63qr6ts88dmqo2qdhuhe";

module.exports = {
  expo: {
    name: "QuickCrew",
    slug: "quick-crew-app-2",
    owner: "jacob.quickcrewdev",
    version: "1.1.1",
    // Ties OTA-update compatibility to the marketing version (X.Y.Z): an
    // update pushed via `eas update` only reaches devices running a build
    // with the SAME version. Bumping version (as we already do for any
    // meaningful change, per CLAUDE.md's convention) requires a new native
    // build+submit as before — OTA only covers same-version JS/asset fixes.
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/956fafe2-f1b2-4b1e-87ac-0cc81a39f606",
    },
    orientation: "portrait",
    icon: "./assets/icon-new.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon-new.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      buildNumber: "18",
      supportsTablet: false,
      googleServicesFile: isProd
        ? "./google-firebase/prod/GoogleService-Info.plist"
        : "./google-firebase/dev/GoogleService-Info.plist",
      bundleIdentifier: "com.jacob.baron.quickcrewapp2",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon-new.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.jacob.baron.quickcrewapp2",
      softwareKeyboardLayoutMode: "resize",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "@react-native-google-signin/google-signin",
        {
          // Reversed iOS OAuth client ID for this environment's Firebase project.
          // See CLAUDE.md: the prod value gets filled in once Google Sign-In is
          // enabled in the quickcrew-prod Firebase Auth console.
          iosUrlScheme: GOOGLE_IOS_URL_SCHEME,
        },
      ],
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          // Apple rejected build 1.1.0 (30) under Guideline 5.1.1(ii) — the
          // default photo-library purpose string didn't explain the actual
          // use or give an example. This is the ONLY place the app touches
          // the photo library: Profile.jsx's "Add photo" button, to set a
          // profile picture. No camera usage anywhere in the app.
          photosPermission:
            "QuickCrew uses your photo library so you can choose a picture from it to set as your profile photo, which is then shown to the businesses or workers you're matched with on shifts.",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "956fafe2-f1b2-4b1e-87ac-0cc81a39f606",
      },
    },
  },
};
