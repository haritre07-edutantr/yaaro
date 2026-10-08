# Password recovery setup

Deploy the code using `pnpm build` and `pnpm deploy` (which applies D1 migration 0014).

In Supabase project `zpxfagfrkqbnwgdbygep`, open Authentication → Email Templates → Reset password. Replace the email body with `docs/auth/reset-password-email.html` and save it. Keep the `{{ .TokenHash }}` template variable exactly as written. This email has a direct YAARO verification link and does not depend on browser/app PKCE storage, so users can open it on another device. No change to the Google or sign-in-link email templates is required.

The reset link opens a browser page on Android, iPhone and desktop. Continue verifies the recovery token server-side as type `recovery`, not a normal sign-in token. Mail scanners opening the URL alone do not consume the link. A random, hashed, single-use grant lasts 15 minutes and is stored in an HttpOnly Secure cookie. It is bound to the verified account. New-password submission requires this grant, current authenticated identity, and matching passwords of 12–128 characters. It consumes the grant before updating; if the provider fails, request a fresh reset link. Requests are limited to five per minute per email/account/token. Responses do not disclose whether an email is registered.

Change password separately verifies the old password in an isolated Supabase client, confirms the authenticated account ID matches, then updates the existing user's password. Verification does not switch the app's account/session. The temporary verification session is revoked. Other sessions are revoked after a successful password update. Account deletion also removes pending recovery grants.

A live email test is still required after saving the template. Test on a disposable account: wrong old password, correct old password, mismatched new passwords, recovery email on a different device, expired/reused links, ordinary signed-in account opening the recovery page without an email token, and Android/iPhone layouts in both themes.

## Return to Android after resetting

Add these two URLs in Supabase Authentication → URL Configuration → Redirect URLs (keep existing URLs):

- `https://autumn-lake-80feyaaro.haritre07.workers.dev/auth/recovery?return_to=android`
- `https://autumn-lake-80feyaaro.haritre07.workers.dev/auth/recovery?return_to=web`

Replace the reset email body with the updated `reset-password-email.html`, which carries `.RedirectTo` alongside `.TokenHash`. The server generates a fixed recovery destination; no caller-supplied URL is accepted. The marker only chooses the sign-in destination, never grants authentication. Existing emails without the marker continue to return to the website. Request a fresh email to test the new behavior.

Rebuild and install the Android app after syncing the updated native files. The new `com.edutantr.yaaro://auth/login` route only opens the app sign-in page and carries no tokens/passwords. Google PKCE `/callback` remains separate and continues validating state. Android requests show “Back to YAARO app”; website requests stay on the website, including Android Chrome. If opened on desktop/iPhone, the browser sign-in link remains available. Chrome's Android intent includes a browser fallback if the app is missing.

Test fresh app-origin and web-origin resets, app running/closed, and app not installed. Native Android compilation and physical-device handoff must be verified in Android Studio.
