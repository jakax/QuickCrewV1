# QuickCrew — project notes

## Versioning

`package.json`'s `version` and `app.config.js`'s `expo.version` must always be kept identical
— one semantic version, tracked in two files. Convention (`X.Y.Z`):

- **X** — `0` while the app is not yet live in the App Store / Play Store (internal /
  pre-production). Bumped to `1` once it's an actual production release candidate.
  Increment again only for a ground-up rebuild of the app, not for normal growth.
- **Y** — bumped for large features or changes that meaningfully affect the app, but
  aren't structural enough to warrant an X bump.
- **Z** — small stuff: bug fixes, minor additions, style tweaks.

The app went to `1.0.0` as its first production release candidate (bumped from the
pre-production `0.x` line at that point, rather than continuing X=0).

**Do NOT manually bump `ios.buildNumber` / `android.versionCode` in `app.config.js`.**
`eas.json` has `"appVersionSource": "remote"` — EAS owns and auto-increments the native
build number on its own servers on every `eas build`, and ignores whatever is in
`app.config.js` for that field. Only the `version` (X.Y.Z) fields above are manually managed.

## Dev / production Firebase environments

There are **two separate Firebase projects** — never one shared database:

- `quickcrew-2c10c` (alias `dev` in `.firebaserc`) — used for all local development,
  manual QA, and any non-`production` EAS build profile. Region: `asia-east2`.
- `quickcrew-prod` (alias `prod`) — the real production project, created 2026-07-26.
  Region: `australia-southeast1` (Sydney), chosen deliberately for latency to
  QuickCrew's NZ/Australia user base — this differs from `dev`'s region on purpose and
  is fine; the two databases are otherwise fully independent, so region mismatch causes
  no issues.

**Why:** before this split, dev/QA data and real user data would have lived in the same
project — meaning either you can never safely test again after launch, or you have to
periodically wipe real user data to do so. Splitting now (before any store submission or
real users existed) was far cheaper than migrating later.

**How the app picks a project at runtime:** `src/services/firebase/config.js` selects a
`firebaseConfig` object keyed by `process.env.EXPO_PUBLIC_APP_ENV` (`"development"` or
`"production"`). `app.config.js` similarly picks the right `GoogleService-Info.plist`
(`google-firebase/dev/` vs `google-firebase/prod/`) and the Google Sign-In
`iosUrlScheme` (via `GOOGLE_IOS_URL_SCHEME` env var) based on the same variable.

- **Local (`npx expo start`):** always dev — `EXPO_PUBLIC_APP_ENV=development` is set in
  `.env` as the default.
- **EAS builds:** each profile in `eas.json` (`development`, `preview`, `preview-ios`,
  `production`) sets its own `env` block. Only the `production` profile points at
  `quickcrew-prod` — every other profile (including `preview`, used for internal/tester
  builds) intentionally still points at dev, so no build other than an actual store
  submission can touch real user data.
- **Deploying rules/indexes:** `npm run deploy:rules:dev` / `npm run deploy:rules:prod`
  (wraps `firebase deploy --only firestore:rules,firestore:indexes,storage --project
  <dev|prod>`). `.firebaserc`'s bare `"default"` alias points at `dev` on purpose, so a
  plain `firebase deploy` without `--project`/`-P` can never accidentally hit production.
- **`npm run test:rules`** is unaffected — it always runs against the local emulator, not
  either real project.

**Setup completed 2026-07-27:** `quickcrew-prod` has Email/Password, Google, and Apple
enabled as Auth sign-in providers; both the local debug keystore's SHA-1 and the EAS
release keystore's SHA-1 are registered against its Android app; `eas.json`'s
`production` profile has real (non-placeholder) values for
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `GOOGLE_IOS_URL_SCHEME`. Both Firebase projects'
billing is on Blaze — `quickcrew-2c10c` (dev) is on an orphaned, org-unlinked billing
account with no reachable Administrator (works fine as-is; don't try to change its
billing without reading this note first); `quickcrew-prod` is on a fresh billing account
properly linked to the `quickcrewnz-org` Cloud org.

**If you ever add a new Android build profile or rotate the EAS keystore**, its new
SHA-1 needs to be registered against `quickcrew-prod` too:
`firebase apps:android:sha:create <androidAppId> "<SHA1>" --project quickcrew-prod`
(get `<androidAppId>` via `firebase apps:list --project quickcrew-prod`, the SHA-1 via
`eas credentials` → Android → Keystore).

## Firestore / Storage security rules

`firestore.rules` and `storage.rules` are the only thing standing between the internet
and the database — there is no other access-control layer (all business logic, incl.
approvals and shift assignment, is done via direct client Firestore writes, not Cloud
Functions). Before changing either file, run the test suite:

```
npm run test:rules
```

This spins up the Firebase emulator (Firestore + Storage) and runs
`security-rules-tests/run.js` — a set of assertions that specific access patterns must
succeed or fail (e.g. "employer from another org cannot read this application", "worker
cannot self-approve"). Two storage checks are marked `skip` due to a known local-emulator
limitation with cross-service `firestore.get()`/`exists()` calls from Storage rules —
see the comments next to them in `run.js` for what to verify manually instead.
