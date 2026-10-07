# YAARO Android and iOS preparation

Status: native projects and push integration are prepared. No signed APK/AAB/IPA or physical-device verification has been produced yet. Provider configuration and signing are required before release.

## Architecture

- Capacitor 8 projects: `android/` and `ios/`.
- Initial package and bundle identifier: `com.yaaro.app`. Confirm ownership before registering with Google/Apple; update Capacitor, Gradle and Xcode together if it changes.
- The shell loads the existing HTTPS production `/community` page so authentication, uploads, messages and calls use the same server and UI. It requires an internet connection. `native/web/index.html` is the packaged recovery page; it is not an offline copy of the app.
- Navigation is restricted to the configured origin. No mixed-content or cleartext access is enabled. Camera/microphone access still requires user consent.
- Native notifications are explicitly enabled in Profile → Settings & privacy → App notifications. Browser notification settings continue to work separately.
- Android uses FCM data messages and a custom native messaging service. Ordinary chat messages support conversation shortcuts and OS bubbles. A bubble opens the authenticated conversation, never push-supplied HTML. Profile photos are cached locally from permitted conversations, with an initial fallback. Cached avatars and shortcuts are cleared on account changes/disable.
- iOS uses APNs alerts with sound. Tapping an alert opens the existing chat/call screen. iOS does not have Android conversation bubbles.
- Calls receive ordinary incoming-call alerts. Native CallKit/ConnectionService, continuous ringing while terminated, ongoing background audio/video and native call controls are **not implemented** in this preparation. Answering continues through the existing foreground WebRTC flow.

## Android configuration and build

1. Install Node 22+, pnpm, JDK 21+, and Android Studio with Android SDK 36 and platform/build tools.
2. Create/register a Firebase Android app with package `com.yaaro.app`. Put its downloaded configuration at `android/app/google-services.json` (ignored by Git).
3. Enable Firebase Cloud Messaging HTTP v1. Create a service account permitted to send FCM messages. Store its JSON as the Cloudflare Worker secret `FCM_SERVICE_ACCOUNT`. Never put the service-account private key in the mobile app or repository.
4. `pnpm install --frozen-lockfile`
5. `pnpm native:doctor android` then `pnpm native:android` to build a debug APK. The output is `android/app/build/outputs/apk/debug/app-debug.apk`.
6. On the phone, sign in, enable app notifications, and allow Android notification permission. Choose conversations to bubble in Android notification settings; the OS/user controls bubble availability.
7. For a release AAB, set `YAARO_ANDROID_KEYSTORE` (absolute file path), `YAARO_ANDROID_STORE_PASSWORD`, `YAARO_ANDROID_KEY_ALIAS`, and `YAARO_ANDROID_KEY_PASSWORD` securely in the build environment, then run `pnpm native:android:release`. Output: `android/app/build/outputs/bundle/release/app-release.aab`.

A release key must be backed up securely. The scripts deliberately stop when required build dependencies/credentials are missing.

## iOS configuration and build

1. Use a Mac with a Capacitor 8 compatible Xcode installation, Node 22+ and pnpm. Run `pnpm install --frozen-lockfile` and `pnpm native:sync`.
2. Open `ios/App/App.xcodeproj` in Xcode. Select your Apple Developer team, register `com.yaaro.app`, and enable Push Notifications. Confirm the signing profile includes the APNs entitlement. The Debug target uses a development APNs entitlement and Release uses production. The server environment must match.
3. Create an APNs token signing key. Add these Worker secrets/configuration values: `APNS_PRIVATE_KEY` (the .p8 contents), `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID=com.yaaro.app`. Set `APNS_ENVIRONMENT=sandbox` for local development builds; use `production` for TestFlight/App Store. Mixing environments rejects tokens. This initial setup selects one environment for this deployment; use a separate staging Worker for development and adjust the native URL there.
4. `pnpm native:doctor ios`, then `pnpm native:ios` for an unsigned simulator build.
5. Set `YAARO_APPLE_TEAM_ID`, then `pnpm native:ios:release` to archive a signed device build. The archive is `ios/App/output/YAARO.xcarchive`. Export/upload it using Xcode Organizer and the correct distribution profile. No signing keys or provisioning profiles belong in Git.
6. Use a real iPhone to verify APNs, camera/photo-picker formats and voice/video calls. A simulator-only test is insufficient.

## Server delivery

Migration `0012_native_push.sql` creates device registration and an atomic delivery outbox. Existing message inserts and call-offer writes enqueue targeted alerts without waiting on the provider. Worker `waitUntil` delivers after successful mutations; the cron retries pending jobs. Alerts contain sender name and routing IDs, never message text, SDP or media. Delivery rechecks account status, conversation access, blocks and recipient privacy, and drops read/deleted messages and ended calls. Invalid tokens are removed; jobs have expiry and bounded attempts.

`/api/native-devices` is authenticated and uses the existing same-origin write guard. Token registration is tied to the signed-in member. A device hash cookie enables server-side removal during sign-out without exposing the token. Account switching purges stale jobs. Provider secrets are never returned to clients.

## Release verification checklist

- Android/iOS: allow/deny permission, token rotation, app in foreground/background, app terminated, tap-to-chat and tap-to-answer, notification sounds, disable and sign-out.
- Android: bubble enabled/disabled, two conversations, cached photo/initial, resize and keyboard, blocked/removed connection, account switch with an open bubble.
- iOS: development and production APNs on separate deployment configuration; TestFlight token; camera/microphone denial; photo/video upload regressions.
- Calls: Android↔Android, iOS↔iOS, Android↔iOS; voice/video; Wi-Fi/mobile; incoming call after app is backgrounded. Tap to answer opens the app; do not assume background WebRTC continues.
- Store preparation: final app ID, owner accounts, signing, privacy disclosures, screenshots, support URL, content-rating answers, and review of social-app safety/report/block/account-deletion requirements before submission.

## References

- https://capacitorjs.com/docs/apis/push-notifications
- https://capacitorjs.com/docs/getting-started/environment-setup
- https://developer.android.com/develop/ui/compose/notifications/bubbles
- https://firebase.google.com/docs/cloud-messaging/send/v1-api
- https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns
