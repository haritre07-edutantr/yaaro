# Email/password access and deletion

Deploy with `pnpm build` and `pnpm deploy`. The deployment script applies D1 migrations, including `0013_account_deletion.sql`, before publishing. Do not publish this code without the migration.

## Server secret

In Cloudflare Workers → autumn-lake-80feyaaro → Settings → Variables and Secrets, add **Secret** `SUPABASE_SECRET_KEY`. Its value must be the Supabase server secret key for project `zpxfagfrkqbnwgdbygep` (Supabase → Project Settings → API Keys → Secret keys). A legacy service-role key also works with the SDK. Never use the publishable key here. Never put this key in GitHub, a NEXT_PUBLIC variable, screenshots, or the Android app. Save/deploy the secret.

## Reviewer account

Create a separate ordinary YAARO account using an email address you control. Sign in with the existing email link or Google, then Profile → Settings & privacy → Account & sign-in → Set password (at least 12 characters). Complete its display profile. Sign out and test Email & password in both the Android app and an incognito browser. Enter that account's email and password in Play Console App access. Do not use the administrator account. New password signups may need email confirmation once; the reviewer account must already be confirmed. No reviewer account or credentials are created automatically.

## Deletion

Public URL after deployment:
https://autumn-lake-80feyaaro.haritre07.workers.dev/delete-account

This page is accessible without signing in and provides sign-in and email support instructions. Deletion itself requires authenticated identity, same-origin JSON, and explicit `DELETE` confirmation. Owners must transfer or delete communities first. Admin credentials are verified before erasure. Other sessions are revoked, D1 data is erased/anonymized atomically, Supabase authentication is deleted, and the local session is cleared. D1 access is disabled by a deletion record even if Supabase deletion temporarily fails; retry the form while its authenticated session remains open.

Uploaded objects are queued in `media_cleanup` before their references are removed. Existing scheduled cleanup retries storage failures. Anonymous member/thread references and safety investigation records remain as disclosed on the public deletion page. No blanket promise that safety records are erased is made.

Verify using disposable accounts: deletion with no profile; deletion with media/connections; owner blocked until transfer; retry after transient failure; old sessions cannot restore profiles; unauthenticated and cross-origin requests rejected. Check the live deletion URL before submitting it in Play Console. Physical-device and live-secret verification remain manual.
