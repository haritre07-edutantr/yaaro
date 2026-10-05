ALTER TABLE chat_preferences ADD COLUMN disappearing INTEGER NOT NULL DEFAULT 0 CHECK(disappearing IN (0,1));
ALTER TABLE chat_messages ADD COLUMN disappearing INTEGER NOT NULL DEFAULT 0 CHECK(disappearing IN (0,1));
ALTER TABLE chat_messages ADD COLUMN receiver_read_at INTEGER;
CREATE TABLE chat_media_new (
 id TEXT PRIMARY KEY NOT NULL,
 message TEXT NOT NULL UNIQUE REFERENCES chat_messages(id) ON DELETE CASCADE,
 conversation TEXT NOT NULL,
 storage_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('photo','voice','video')),
 content_type TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
INSERT INTO chat_media_new SELECT * FROM chat_media;
DROP TABLE chat_media;
ALTER TABLE chat_media_new RENAME TO chat_media;
CREATE INDEX chat_media_conversation ON chat_media(conversation);
CREATE TABLE media_cleanup (storage_key TEXT PRIMARY KEY NOT NULL);
CREATE TABLE chat_presence (
 member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 conversation TEXT NOT NULL,
 touched_at INTEGER NOT NULL,
 PRIMARY KEY(member,conversation)
);
CREATE TABLE chat_media_views (
 message TEXT PRIMARY KEY NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
 viewer TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 opened_at INTEGER NOT NULL
);
CREATE TRIGGER chat_delete_cleanup BEFORE DELETE ON chat_messages BEGIN
 INSERT OR IGNORE INTO media_cleanup(storage_key) SELECT storage_key FROM chat_media WHERE message=OLD.id;
 DELETE FROM chat_reactions WHERE message=OLD.id;
 UPDATE chat_messages SET reply_id=NULL WHERE reply_id=OLD.id;
END;
CREATE TRIGGER chat_soft_delete_cleanup AFTER UPDATE OF deleted ON chat_messages WHEN NEW.deleted=1 BEGIN
 INSERT OR IGNORE INTO media_cleanup(storage_key) SELECT storage_key FROM chat_media WHERE message=NEW.id;
 DELETE FROM chat_media WHERE message=NEW.id;
END;
CREATE TRIGGER chat_retention AFTER INSERT ON chat_messages BEGIN
 UPDATE chat_messages SET disappearing=COALESCE((SELECT p.disappearing FROM chat_preferences p JOIN friendships f ON f.id=NEW.conversation WHERE p.member=NEW.author AND p.target=CASE WHEN f.member_a=NEW.author THEN f.member_b ELSE f.member_a END),0) WHERE id=NEW.id;
 DELETE FROM chat_messages WHERE conversation=NEW.conversation AND id NOT IN (SELECT id FROM chat_messages WHERE conversation=NEW.conversation ORDER BY created_at DESC,rowid DESC LIMIT 30);
END;
-- Enforce the new limit on existing conversations too, preserving only the latest 30.
DELETE FROM chat_messages WHERE id IN (SELECT id FROM (SELECT id,ROW_NUMBER() OVER(PARTITION BY conversation ORDER BY created_at DESC,rowid DESC) AS n FROM chat_messages) WHERE n>30);
