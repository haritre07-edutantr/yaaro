CREATE TABLE IF NOT EXISTS chat_media (
 id TEXT PRIMARY KEY NOT NULL,
 message TEXT NOT NULL UNIQUE REFERENCES chat_messages(id) ON DELETE CASCADE,
 conversation TEXT NOT NULL,
 storage_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('photo','voice')),
 content_type TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_media_conversation ON chat_media(conversation);
CREATE TABLE IF NOT EXISTS member_moments (
 id TEXT PRIMARY KEY NOT NULL,
 author TEXT NOT NULL REFERENCES members(id),
 body TEXT NOT NULL DEFAULT '',
 photo_key TEXT,
 visibility TEXT NOT NULL CHECK(visibility IN ('friends','private')),
 expires_at INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS member_moments_feed ON member_moments(author,created_at);
