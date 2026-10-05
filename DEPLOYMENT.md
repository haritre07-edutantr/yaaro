# Deploy YAARO outside ChatGPT Sites

This edition keeps YAARO's design, animations, demo, D1-backed connections/messages, validated R2 profile photos, reports, privacy controls and call signaling. Supabase verifies consumer identity. It is prepared for Cloudflare Workers with the existing pinned Vinext/Cloudflare Vite stack; it is not a static HTML export or a Vercel-ready Next.js port.

## Source and hosting

Source is published in `haritre07-edutantr/yaaro` on `main`. The configured Worker is `autumn-lake-80feyaaro` and its public origin is `https://autumn-lake-80feyaaro.haritre07.workers.dev`. D1 is named `yaaro`; the private R2 bucket is `yaaro-profile-photos`. These configuration values identify resources; they do not prove a successful deployment. Keep secrets out of GitHub.

Use a Cloudflare account you control. Choose its free Workers plan; do not enable a paid plan automatically. R2 account activation may require billing details; complete that yourself and review charges/limits. Nothing here purchases a plan or creates paid resources.

Install the pinned pnpm version listed in package.json, then run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Local development uses `pnpm dev`; copy `.dev.vars.example` to the ignored `.dev.vars` and fill its public configuration.

Authenticate the official Wrangler CLI, create a D1 database named `yaaro` and a private R2 bucket named `yaaro-profile-photos` using the documented CLI/dashboard workflow. Run `wrangler --help` and the chosen subcommand's `--help` before entering commands. Set the returned D1 ID in `wrangler.jsonc`. Apply the immutable migrations from `drizzle/` using `pnpm db:migrate:remote`.

Set `SUPABASE_PUBLISHABLE_KEY` to the modern publishable key for project `zpxfagfrkqbnwgdbygep`. This is intentionally public; never use service_role, sb_secret, a database password or a Supabase management token. Set `PUBLIC_APP_ORIGIN` to the exact new HTTPS origin with no trailing slash. Set any TURN secret via Wrangler secrets, never in config. Run `pnpm deploy` only after these steps. The preflight rejects placeholder configuration.

In the existing Worker's Settings > Builds, connect this repository on `main`, with root directory `/`, build command `pnpm install --frozen-lockfile && pnpm build`, and deploy command `pnpm db:migrate:remote && pnpm deploy`. The build creates the generated configuration in `dist/server/wrangler.json`. The build token must permit the configured D1 migrations and Worker deployment; never paste it in chat or commit it. A push after connection should trigger a new build. Inspect the build log and verify a successful active deployment before treating the public site as live. Keep source binding configuration synchronized with account resources. Consult current Cloudflare documentation before enabling a build pipeline. The current ChatGPT Sites deployment is untouched, and its D1/R2 data is not copied by this source export. New hosting starts with a new database; migration of real member identities/content requires a separate verified process.

## Supabase login configuration

In YAARO's Supabase project, set Site URL to the new HTTPS origin and allow **only** that origin's `/auth/callback` URL (plus the same localhost callback for local testing). Redirect destinations within YAARO are validated; external redirects are rejected. Email uses PKCE magic links, phone uses verified SMS codes, and Google uses Supabase OAuth.

Connect a verified SMTP sender for email delivery. The default Supabase mail service is limited to project-team recipients and is not public email delivery. New free projects using default SMTP cannot customize templates. Keep `AUTH_EMAIL_DELIVERY_READY=false` until delivery is configured and an actual sign-in link is tested, then set it to `true`. No password flow or fake OTP bypass exists.

Google requires a Google Cloud OAuth web application, its client ID and client secret saved in Supabase's Google provider settings. The callback Google must allow is the exact Supabase callback shown by that dashboard, not YAARO's callback. Phone requires an actual SMS provider and approved delivery settings; SMS may be billed. Google and phone buttons reflect Supabase's live provider settings and remain disabled while their provider is disabled.

Admin is fail-closed. After the owner signs in as `haritre07@gmail.com` and that email is verified, get that user's UUID from Supabase Auth administration and set server-only `SUPER_ADMIN_USER_ID` to it. Both verified email and this server-controlled identity must match on every admin API request. Client metadata/roles and request headers grant no access. No password, secret or service-role key is in this source.

## Calls, launch and verification

Calls still require `TURN_URLS` and a private coturn REST `TURN_SHARED_SECRET` configured securely on the Worker. The UI reports unavailable calls until configured; media starts only on an explicit start/accept action. Live rooms, payments, ads and games remain clearly labeled future/demo features.

Before public release, test real email and Google login, sign-out, expiry/refresh, two-person connection/message flow, cross-account denial, block/privacy revocation, photo upload/read authorization and two-device calls with your actual relay. Complete legal review, a real moderation response process, abuse protection for provider signups, deletion/export and operational monitoring. Source tests and local build do not prove these external integrations work.
