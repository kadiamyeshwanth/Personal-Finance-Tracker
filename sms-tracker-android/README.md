# UPI SMS Tracker — Android Companion App

A minimal native Android app that runs silently in the background, detects UPI/bank SMS messages, and auto-sends them to your Personal Finance Tracker.

## How to build the APK

### Prerequisites (one-time setup)
1. Install **Android Studio**: https://developer.android.com/studio
2. Open Android Studio → Open project → select this `sms-tracker-android/` folder
3. Wait for Gradle sync to complete (~2 min first time)

### Build APK
1. In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
2. APK will be at: `app/build/outputs/apk/release/app-release.apk`

### Install on your phone
1. Copy APK to your phone via USB or WhatsApp/email
2. On phone: Settings → Security → **Enable "Install unknown apps"**
3. Tap the APK file → Install
4. Open the app once → enter your webhook URL → tap **Activate**
5. App runs silently in background forever 🎉

## Testing
After installing, send yourself a test UPI payment via GPay/PhonePe — transaction should appear in your dashboard within seconds!
