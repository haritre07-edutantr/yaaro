# YAARO child safety operations

Effective 8 October 2026. Owner: Hari Sudhan Chennimalai, haritre07@gmail.com.
Public standards: `/policy/child-safety`.

This is the procedure for the operator, not an automated authority-reporting service.
Publishing a policy does not replace carrying out the procedure.

## Before submitting the Play declaration

1. Open the public standards URL while signed out. It must load without a sign-in wall.
2. Sign in to `/admin` with the verified designated account. `SUPER_ADMIN_USER_ID`
   must be that account's Supabase user ID. Email alone does not grant access.
   Set this value in the deployed Worker configuration if access is denied; do
   not weaken the identity check or use `/demo/admin` to review real reports.
3. Use two disposable adult test accounts to submit a harmless test report from
   a real profile/conversation, selecting the child safety category. Confirm it
   reaches the real Reports queue. Use only text such as “Safety workflow test”.
4. Verify the operator can access the Cloudflare D1 database and R2 media bucket
   to disable/remove confirmed content. Test removal with ordinary harmless
   test content, never abusive material. Record test identifiers and results.
5. The designated contact must understand and undertake the review and authority
   reporting steps below. Only then self-certify the two Play Console terms.

## Receive and review

- Monitor the real admin Reports queue and haritre07@gmail.com. Put pending or
  escalated child safety reports first. The queue has priority ordering, but
  there is no automatic email alert or 24-hour emergency response service.
- Review the reported account, description, identifiers and timestamps. Ask
  only for reference identifiers or context if more information is needed.
  Do not ask users to forward suspected CSAM or capture screenshots of it.
- Keep case notes in a restricted case register: report ID, account/content IDs,
  receipt time, reviewer, risk assessment, actions/times, authority reference,
  follow-up and closure rationale. Do not put abusive files or sensitive case
  notes in GitHub, ordinary email, public logs or analytics.
- For immediate danger, promptly contact the appropriate emergency/police
  authority. Do not wait for an app moderation cycle.

## Restrict access and remove content

- Use Suspend/Ban in the real admin review panel when justified. These actions
  restrict the account; they are not substitutes for removing existing content.
- Identify exact content records in D1 and storage keys in R2. Use the existing
  app deletion/moderation controls where available. Otherwise an authorized
  operator must perform targeted removal through Cloudflare, verifying IDs
  before any write. Never delete all accounts/content or use guessed keys.
- Private messages: clear the exact `chat_messages.body`, set `deleted=1`, and
  remove the associated `chat_media` reference. Moments: clear the identified
  moment's body/media reference and expire it. Profile photos: clear the exact
  member photo reference. Community content: use the space moderation controls
  or targeted removal of the exact post/message/resource identified in the case.
- Disable user access immediately, including direct media access. Remove the
  exact R2 object when appropriate under the authority's instructions. If the
  material needs lawful preservation, obtain instructions for secure restricted
  preservation; do not create personal copies or leave it user-accessible.
- Preserve the minimum necessary metadata and audit trail. Record removal in
  the restricted case register, and verify the normal app/media URLs no longer
  serve the prohibited content. Follow lawful preservation and retention orders.

## Report confirmed CSAM to authorities

- The designated contact makes the external report. The admin “Escalate” action
  records an internal status only; it does not send to police or NCMEC.
- For India, use the National Cyber Crime Reporting Portal
  https://cybercrime.gov.in/ → Women/Children Related Crime, or the relevant
  police authority. Contact law enforcement directly for immediate danger.
- Use NCMEC or another relevant regional/national authority where applicable.
  Follow the receiving authority's current submission, preservation and
  follow-up instructions. This procedure is not a determination of which legal
  obligations apply in every jurisdiction.
- Record submission date, authority, acknowledgment/reference and follow-up
  without copying abusive files into the register. Cooperate with lawful requests.

## Follow through

- Keep an escalated case open until protective actions and required authority
  reporting/follow-up are completed. Avoid disclosing victims' identities or
  investigation details to the reported account.
- Confirm access restrictions persist and content is no longer accessible.
  Record the outcome; retain only necessary records under applicable law.
- Revisit this procedure when features, personnel or reporting channels change.

## Reference material

- Google Play child safety requirements:
  https://support.google.com/googleplay/android-developer/answer/14747720
- Google Play child endangerment policy:
  https://support.google.com/googleplay/android-developer/answer/9878809
- India reporting portal: https://cybercrime.gov.in/

No real authority report is sent by this implementation or its tests.
