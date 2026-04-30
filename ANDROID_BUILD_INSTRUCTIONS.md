# Flavor AI - Android APK Build Instructions

This document provides step-by-step instructions to rebuild the Android APK for the Flavor AI application.

## APK Files Generated

| File | Location | Size | Description |
|------|----------|------|-------------|
| Debug APK | `android/app/build/outputs/apk/debug/app-debug.apk` | ~12 MB | Unsigned debug build |
| Release APK | `android/FlavorAI-release.apk` | ~11 MB | **Signed release APK ready for installation** |

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Android SDK** - Already configured at `C:\Users\umang\AppData\Local\Android\Sdk`
3. **Java JDK** - Required for Gradle builds

## Quick Start - Install the APK

The signed release APK is ready at:
```
android/FlavorAI-release.apk
```

Transfer this file to your Android device and install it. The APK is already signed and ready for installation.

## Step-by-Step Rebuild Instructions

### Step 1: Navigate to Project Directory

```powershell
cd "u:\My Files\Flavor AI"
```

### Step 2: Install Dependencies (if needed)

```powershell
npm install
```

### Step 3: Build the Web App

```powershell
npm run build
```

This creates the production build in the `dist` folder.

### Step 4: Sync Web Assets to Android

```powershell
npx cap sync
```

This copies the web build to the Android project.

### Step 5: Build Debug APK

```powershell
cd android
.\gradlew.bat assembleDebug
```

The debug APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 6: Build Release APK

```powershell
cd android
.\gradlew.bat assembleRelease
```

This creates an unsigned release APK at: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Step 7: Sign the Release APK

If you need to re-sign the APK:

```powershell
# Generate keystore (only needed once)
keytool -genkeypair -v -storetype PKCS12 -keystore "android\flavorai.keystore" -alias flavorai -keyalg RSA -keysize 2048 -validity 10000 -storepass flavorai123 -keypass flavorai123 -dname "CN=Flavor AI, OU=Development, O=Flavor AI, L=City, ST=State, C=US"

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "android\flavorai.keystore" -storepass flavorai123 -keypass flavorai123 "android\app\build\outputs\apk\release\app-release-unsigned.apk" flavorai
```

### Step 8: Copy Signed APK

```powershell
Copy-Item "android\app\build\outputs\apk\release\app-release-unsigned.apk" "android\FlavorAI-release.apk"
```

## Project Structure

```
Flavor AI/
├── android/                    # Android native project
│   ├── app/                   # Main Android app module
│   │   ├── src/main/         # Android source
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── assets/       # Web app assets
│   │   │   └── res/           # Resources (icons, splash, etc.)
│   │   └── build.gradle      # App build configuration
│   ├── build.gradle          # Root build file
│   ├── gradle.properties     # Gradle settings
│   ├── variables.gradle      # Version variables
│   └── local.properties      # SDK location
├── src/                       # React web app source
├── dist/                     # Production web build
├── capacitor.config.ts       # Capacitor configuration
└── package.json              # Node.js dependencies
```

## App Configuration

- **App Name**: Flavor AI
- **Package ID**: com.flavorai.app
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 36 (Android 16)

## Features Included

✅ User authentication (login/signup) via Supabase/Firebase  
✅ AI-based recipe suggestions  
✅ Ingredient-based search  
✅ Clean modern UI with Tailwind CSS  
✅ API integration (NVIDIA AI, Pollinations)  
✅ Splash screen with app logo  
✅ Internet permissions enabled  
✅ Back button support  
✅ Mobile responsive design  
✅ App icon and proper app name  

## Troubleshooting

### SDK Location Error
If you get "SDK location not found", ensure `android/local.properties` contains:
```
sdk.dir=C:/Users/umang/AppData/Local/Android/Sdk
```

### Build Errors
Clean and rebuild:
```powershell
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

### Gradle Memory Issues
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

## Development Workflow

For ongoing development:

1. Make changes to web app in `src/`
2. Run `npm run build` to build web assets
3. Run `npx cap sync` to sync to Android
4. Run `npx cap run android` to build and install on device

Or use Android Studio:
1. Open `android/` folder in Android Studio
2. Make changes to web app
3. Run build from Android Studio (it will auto-sync)

## Notes

- The keystore password is `flavorai123` - change this for production!
- Keep the keystore file safe - you'll need it to sign updates
- The release APK is already signed and ready for installation