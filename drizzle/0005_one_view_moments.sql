CREATE TABLE member_moments_new (
 id TEXT PRIMARY KEY NOT NULL,
 author TEXT NOT NULL REFERENCES members(id),
 body TEXT NOT NULL DEFAULT '',
 photo_key TEXT,
 visibility TEXT NOT NULL CHECK(visibility IN ('friends','private','everyone','selected')),
 expires_at INTEGER,
 created_at INTEGER NOT NULL,
 media_kind TEXT NOT NULL DEFAULT 'photo' CHECK(media_kind IN ('photo','video'))
);
INSERT INTO member_moments_new (id,author,body,photo_key,visibility,expires_at,created_at)
 SELECT id,author,body,photo_key,visibility,expires_at,created_at FROM member_moments;
DROP TABLE member_moments;
ALTER TABLE member_moments_new RENAME TO member_moments;
CREATE INDEX member_moments_feed ON member_moments(author,created_at);
CREATE TABLE moment_recipients (
 moment TEXT NOT NULL REFERENCES member_moments(id) ON DELETE CASCADE,
 member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 PRIMARY KEY(moment,member)
);
CREATE TABLE moment_views (
 moment TEXT NOT NULL REFERENCES member_moments(id) ON DELETE CASCADE,
 member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 viewed_at INTEGER NOT NULL,
 PRIMARY KEY(moment,member)
);
