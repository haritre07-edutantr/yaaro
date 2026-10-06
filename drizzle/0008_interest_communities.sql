CREATE TABLE interest_spaces (
 id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL REFERENCES members(id),
 name TEXT NOT NULL, description TEXT NOT NULL, topic TEXT NOT NULL, language TEXT NOT NULL,
 access TEXT NOT NULL CHECK(access IN ('open','approval')), rules TEXT NOT NULL,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE space_members (
 space TEXT NOT NULL REFERENCES interest_spaces(id) ON DELETE CASCADE,
 member TEXT NOT NULL REFERENCES members(id), role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','moderator','member')),
 status TEXT NOT NULL CHECK(status IN ('active','pending','declined','banned','left')),
 notifications INTEGER NOT NULL DEFAULT 1 CHECK(notifications IN (0,1)), muted_until INTEGER NOT NULL DEFAULT 0, joined_at INTEGER NOT NULL,
 PRIMARY KEY(space,member)
);
CREATE INDEX space_members_person ON space_members(member,status);
CREATE TABLE space_channels (
 id TEXT PRIMARY KEY NOT NULL, space TEXT NOT NULL REFERENCES interest_spaces(id) ON DELETE CASCADE,
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL,
 UNIQUE(space,name)
);
CREATE TABLE space_posts (
 id TEXT PRIMARY KEY NOT NULL, space TEXT NOT NULL REFERENCES interest_spaces(id) ON DELETE CASCADE,
 channel TEXT NOT NULL REFERENCES space_channels(id), author TEXT NOT NULL REFERENCES members(id),
 parent TEXT REFERENCES space_posts(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('discussion','question','announcement','poll')),
 body TEXT NOT NULL, options TEXT, poll_ends INTEGER, pinned INTEGER NOT NULL DEFAULT 0,
 accepted_reply TEXT REFERENCES space_posts(id), deleted INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX space_posts_feed ON space_posts(space,channel,parent,created_at);
CREATE INDEX space_posts_thread ON space_posts(parent,created_at);
CREATE TABLE space_votes (post TEXT NOT NULL REFERENCES space_posts(id) ON DELETE CASCADE, member TEXT NOT NULL REFERENCES members(id), choice INTEGER NOT NULL, PRIMARY KEY(post,member));
CREATE TABLE space_likes (post TEXT NOT NULL REFERENCES space_posts(id) ON DELETE CASCADE, member TEXT NOT NULL REFERENCES members(id), PRIMARY KEY(post,member));
CREATE TABLE space_saves (post TEXT NOT NULL REFERENCES space_posts(id) ON DELETE CASCADE, member TEXT NOT NULL REFERENCES members(id), PRIMARY KEY(post,member));
CREATE TABLE space_resources (
 id TEXT PRIMARY KEY NOT NULL, space TEXT NOT NULL REFERENCES interest_spaces(id) ON DELETE CASCADE,
 author TEXT NOT NULL REFERENCES members(id), title TEXT NOT NULL, description TEXT NOT NULL,
 url TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX space_resources_feed ON space_resources(space,created_at);
CREATE TABLE space_events (
 id TEXT PRIMARY KEY NOT NULL, space TEXT NOT NULL REFERENCES interest_spaces(id) ON DELETE CASCADE,
 host TEXT NOT NULL REFERENCES members(id), title TEXT NOT NULL, description TEXT NOT NULL,
 starts_at INTEGER NOT NULL, duration INTEGER NOT NULL, url TEXT NOT NULL DEFAULT '',
 cancelled INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX space_events_schedule ON space_events(space,starts_at);
CREATE TABLE space_rsvps (event TEXT NOT NULL REFERENCES space_events(id) ON DELETE CASCADE, member TEXT NOT NULL REFERENCES members(id), response TEXT NOT NULL CHECK(response IN ('going','interested')), PRIMARY KEY(event,member));
CREATE TABLE space_reports (
 id TEXT PRIMARY KEY NOT NULL REFERENCES reports(id), space TEXT NOT NULL REFERENCES interest_spaces(id),
 post TEXT REFERENCES space_posts(id), resource TEXT REFERENCES space_resources(id) ON DELETE SET NULL, evidence TEXT NOT NULL DEFAULT '', reporter TEXT NOT NULL REFERENCES members(id), target TEXT NOT NULL REFERENCES members(id),
 category TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL
);
CREATE INDEX space_reports_queue ON space_reports(space,status,created_at);
CREATE TABLE space_notifications (
 id TEXT PRIMARY KEY NOT NULL, recipient TEXT NOT NULL REFERENCES members(id),
 space TEXT NOT NULL REFERENCES interest_spaces(id) ON DELETE CASCADE,
 title TEXT NOT NULL, body TEXT NOT NULL, seen INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE INDEX space_notifications_person ON space_notifications(recipient,seen,created_at);
