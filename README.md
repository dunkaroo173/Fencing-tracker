# UFL Fencing Android

Native Android rebuild of the UFL fencing scorer originally hosted as a browser app.

## What it includes

- Landscape scoring screen for left and right fencers
- Hit, off-target, priority, simultaneous action, reset, and end-match controls
- Weapon, period, and duration selectors
- Countdown match timer with start, pause, and resume
- Event log and text summary sharing

## Build

Open this project in Android Studio, let Gradle sync, then build the debug APK:

```powershell
gradle :app:assembleDebug
```

The debug APK will be generated at:

```text
app/build/outputs/apk/debug/app-debug.apk
```