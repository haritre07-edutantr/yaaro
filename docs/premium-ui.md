# YAARO consumer UI

The existing Cloudflare app now uses one blue/cyan/teal consumer design system in `app/consumer.css`, imported after the existing styles. Existing authenticated APIs, uploads, private calls, chat privacy, memberships, moderation and notifications remain connected.

## Screen mapping

- Desktop: compact sidebar, global search, contextual friend suggestions where useful.
- Mobile: Home, Discover, raised Create, Communities and Chats; profile and notifications in the header.
- Communities: photographic discovery hero, real community cards, cover/logo identity, compact Home/Chat/Events/More mobile navigation, channel rows, discussion composer and moderation settings.
- Creation: Identity, Purpose, Privacy, Setup and Preview; actual logo/cover previews and configurable initial channels.
- Events: joined-community events, personal RSVP plans, past gatherings and search. The server enforces active membership and blocks/bans.
- Chats: aligned search, pinned/favorite conversation lists, compact messenger surfaces, blue-to-cyan outgoing bubbles and existing disappearing-message controls.
- Profiles, discovery, matching and private call surfaces share the same type, spacing, surface and color tokens.
- Leave community is in its action menu. Permanent deletion is owner-only in Settings → Advanced → Danger Zone, with a community-name confirmation and existing server authorization.

Counts, events, members and conversations are actual backend data. Unsupported native group audio/video rooms, opportunities, games and public creator stats are not presented as live functionality.

## Decorative hero asset

AI-generated photography-style artwork, not a photograph of platform members. Prompt: adult Indian friends talking together on a hillside at blue hour, calm premium editorial composition, people on the right and negative space on the left, no text, logos or interface. Generated with ImageGen, then resized and encoded as WebP with standard image tools. Assets: `public/community-hero.webp` (1280px wide, about 66 KB) and `public/community-hero-mobile.webp` (640px wide, about 20 KB).

## Validation

TypeScript checks, production build, and the existing authentication, chat, calls, media, community moderation and real WebSocket tests passed. Added event-directory tests cover membership, blocked owners, bans, revoked access, archived communities, RSVP plans and literal search wildcard escaping.

Local visual checks were attempted with an isolated fixture harness using actual components. They could not run because no browser binary was available and the browser download failed. Phone/tablet/desktop CSS breakpoints were reviewed in code; rendered alignment and cross-device calls still need a production device check. No fixtures or synthetic data are shipped.
