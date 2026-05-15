# Android Development Build — OAuth Setup Guide

## Prerequisites

Install Android Studio: https://developer.android.com/studio
During setup, install:
- Android SDK (API 34 or higher)
- Android Emulator

---

## Option A: Physical Android Device

1. On the device: Settings → About Phone → tap "Build Number" 7 times → Developer Options unlocked
2. Settings → Developer Options → enable "USB Debugging"
3. Connect USB cable to Windows PC
4. Run on device: `adb devices` — confirm device appears
5. Run: `npx expo run:android`

---

## Option B: Android Studio Emulator

1. Open Android Studio → More Actions → Virtual Device Manager
2. Create a device (e.g., Pixel 8, API 34)
3. Start the emulator
4. Run: `npx expo run:android`

---

## First Run (builds native APK — takes ~5 min)

```powershell
npx expo run:android
```

This compiles the native Android project and installs the dev client APK on your device/emulator.
Subsequent runs are faster (only JS bundle reloads).

---

## Test Google OAuth

1. Open the app on device/emulator
2. Tap "Google로 계속하기"
3. Chrome Custom Tabs opens Google login
4. After login, Google redirects → Supabase → `manybe://auth/callback`
5. Android intent fires, app returns to foreground
6. Session is set automatically via the Linking deep link handler

---

## Supabase Redirect URL (Dashboard → Auth → URL Configuration)

Make sure these are in "Redirect URLs":
```
manybe://auth/callback
```

The `exp://` Expo Go URL can be removed — we no longer use Expo Go for auth testing.

---

## Deep Link Verification

Test that the intent filter works:
```powershell
adb shell am start -W -a android.intent.action.VIEW -d "manybe://auth/callback" io.manybe.app
```

The app should open. If it does, the intent filter is correctly registered.

---

## EAS Cloud Build (optional, for distributing APK without Android Studio)

```powershell
eas build --profile development --platform android
```

Download the APK from the EAS dashboard and install it manually on the device.
