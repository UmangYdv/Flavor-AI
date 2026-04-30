# Running Flavor AI in Android Studio with Virtual Device

This guide explains how to open and run the Android project in Android Studio with an emulator.

## Prerequisites

- **Android Studio** installed (Download from https://developer.android.com/studio)
- **Android SDK** configured in Android Studio

## Step 1: Open Project in Android Studio

1. Open **Android Studio**
2. Click **"Open Project"** or **"Import Project"**
3. Navigate to: `U:\My Files\Flavor AI\android`
4. Click **OK** to open the project

## Step 2: Set Up Android Virtual Device (AVD)

If you don't have a virtual device yet:

1. In Android Studio, go to **Tools → Device Manager**
2. Click **"Create Device"**
3. Select a device (e.g., Pixel 7, Pixel 6)
4. Choose a system image:
   - Recommended: **API 34 (Android 14)** or **API 35**
5. Click **Next**, then **Finish**
6. Wait for the download to complete

## Step 3: Run the App

### Option A: Run from Android Studio UI

1. In Android Studio, ensure the **"app"** module is selected in the dropdown
2. Click the **green "Run"** button (or press `Shift + F10`)
3. Select your virtual device from the device chooser
4. The app will build and launch on the emulator

### Option B: Run from Command Line

1. Start the emulator:
   ```powershell
   cd "C:\Users\umang\AppData\Local\Android\Sdk\emulator"
   .\emulator.exe -avd <your-avd-name>
   ```

2. Install and run the APK:
   ```powershell
   adb install "U:\My Files\Flavor AI\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

## Step 4: Debug & Develop

- **Hot Reload**: Make changes in your React code, then run `npx cap sync` to update the Android app
- **Logcat**: View logs via **View → Tool Windows → Logcat**
- **DevTools**: Access Chrome DevTools in the emulator's WebView for debugging

## Troubleshooting

### Issue: "SDK location not found"
- Ensure `local.properties` contains: `sdk.dir=C:/Users/umang/AppData/Local/Android/Sdk`

### Issue: Emulator won't start
- Check Intel HAXM is installed or use Windows Hypervisor
- Go to **Tools → SDK Manager → SDK Tools** and enable "Intel x86 Emulator Accelerator"

### Issue: App not updating
- Run: `npx cap sync android` in the project root
- Then rebuild in Android Studio

## Quick Reference

| Action | Command |
|--------|---------|
| Sync web assets | `npx cap sync` |
| Build debug APK | `.\gradlew.bat assembleDebug` |
| Build release APK | `.\gradlew.bat assembleRelease` |
| Install on emulator | `adb install app-debug.apk` |