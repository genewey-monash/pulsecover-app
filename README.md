# PulseCover mobile app

Native iOS + Android app (React Native, Expo SDK 57, Expo Router). Same product as the PulseCover website: wearable risk rating,
plans, calculator, compare, apply, claims, profile, referral, call back, business enquiry, FAQ. Four languages (EN, CN, MY, TM),
light and dark mode, 30-minute idle logout, optional fingerprint/Face ID unlock.

Group 5, BFM3130 Entrepreneurship in Financial Technology.

## What is in this folder

| Path | What it is |
|---|---|
| `src/app` | Screens (Expo Router). `(tabs)` = Home, Plans, Wearable, Claims, Account. |
| `src/components` | Design system: `ui.tsx` (Button, Card, CardGrid, Tile, Field, Sheet...), `charts.tsx`, `forms.tsx`, `summary.tsx`. |
| `src/lib` | API client, auth, i18n, theme, pricing engine (same file as the server), idle logout, biometric lock. |
| `src/i18n` | `web-dict.json` (shared with the website) and `app-strings.ts` (app-only strings), 4 languages. |
| `plugins/withReleaseSigning.js` | Signs release builds with `private/pulsecover-release.jks` (not in the repo). |
| `.maestro` | Automated user-journey tests (register, apply, claim, profile, language, dark mode). |
| `app.json` | Name, package id `my.group5.pulsecover`, icons, permissions, plugins. |

## Run the app while developing

```bash
npm install
npx expo start            # press a for Android emulator, i for iOS simulator
```

The app talks to the PulseCover server. Default is `https://pulsecover-website.onrender.com`. To use another server at build time:
`EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 npx expo start`. At run time: **Account > Server** inside the app.

## Build the downloadable Android file (APK)

Needs JDK 17 and the Android SDK (platform 36, build-tools 36.0.0). Then:

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# result: android/app/build/outputs/apk/release/app-release.apk  (about 56 MB, arm64 + armv7)
```

Copy it to `server/public/download/pulsecover.apk` and update `server/public/download/version.json`.

Signing: put your key in `private/pulsecover-release.jks` and `private/keystore.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Keep that key safe: phones only accept updates signed with the same key.

## Build for iPhone and iPad

Needs a Mac with Xcode 27.

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios --configuration Release         # simulator
```

To install on a real iPhone or share through TestFlight you need an Apple Developer account (signing); the code is the same.
`app.json` already enables the UIScene lifecycle that iOS 27 requires.

## Tests

`npx tsc --noEmit` type-checks. User journeys run with [Maestro](https://maestro.mobile.dev): `maestro test .maestro/register.yaml`.
