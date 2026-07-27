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
    name: "quick-crew-app-2",
    slug: "quick-crew-app-2",
    version: "1.0.0",
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
      supportsTablet: true,
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
        projectId: "dbd5bca0-b8e6-4936-8a53-f7ac0058578b",
      },
    },
  },
};
