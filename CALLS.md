# YAARO voice and video setup

Existing call signaling, mutual connection checks, call privacy, block enforcement and explicit media permission remain in place. This edition supports Cloudflare Realtime TURN in addition to coturn. Provider credentials are generated only after the server verifies an active call's participant and connection permissions. Browser clients receive temporary relay credentials, never the provider token. Calls use relay-only WebRTC and expire after one hour.

In Cloudflare Realtime > TURN, create a key for YAARO. In the deployed Worker's Settings > Variables and Secrets, save `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` as secrets using the key ID and token returned by Cloudflare. These are runtime secrets, not build variables. Do not paste the token in chat or source control. Deploy the settings. Do not put a Cloudflare token into `TURN_SHARED_SECRET`: that setting belongs to the separate coturn HMAC integration.

Cloudflare currently provides a shared SFU/TURN allowance of 1,000 GB monthly; additional egress is billed. Review account terms and billing before activation. Configuration presence enables the call UI, but does not prove working relay credentials.

After deployment, sign into two connected YAARO accounts on separate devices and preferably different networks. Start a voice call from their saved chat, explicitly allow microphone access, accept on the recipient and verify two-way audio. End the call and verify microphone capture stops. Repeat for video, explicitly allowing camera access; verify mute, camera toggle and end controls. Test declined calls, blocked users and calls set to Nobody. A completed two-device test is required before claiming voice/video works.

Provider request failures return a generic unavailable call state. No recordings or transcription are implemented.
