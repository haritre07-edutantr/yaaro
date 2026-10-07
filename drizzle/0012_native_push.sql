CREATE TABLE native_devices (
 token TEXT PRIMARY KEY, device_id TEXT NOT NULL UNIQUE, member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 platform TEXT NOT NULL CHECK(platform IN ('android','ios')), environment TEXT NOT NULL CHECK(environment IN ('production','sandbox')),
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)), updated_at INTEGER NOT NULL
);
CREATE INDEX native_devices_member ON native_devices(member,enabled);
CREATE TABLE native_push_jobs (
 id TEXT PRIMARY KEY, token TEXT NOT NULL REFERENCES native_devices(token) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('message','call')), event_id TEXT NOT NULL,
 recipient TEXT NOT NULL, sender TEXT NOT NULL, conversation TEXT NOT NULL,
 expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX native_push_pending ON native_push_jobs(lease_until,expires_at);
CREATE TRIGGER native_message_push AFTER INSERT ON chat_messages BEGIN
 INSERT OR IGNORE INTO native_push_jobs(id,token,kind,event_id,recipient,sender,conversation,expires_at)
 SELECT 'message:'||NEW.id||':'||d.token,d.token,'message',NEW.id,d.member,NEW.author,NEW.conversation,NEW.created_at+3600000
 FROM friendships f JOIN native_devices d ON d.member=CASE WHEN f.member_a=NEW.author THEN f.member_b ELSE f.member_a END
 WHERE f.id=NEW.conversation AND f.status='accepted' AND d.enabled=1 AND d.updated_at>NEW.created_at-2592000000;
END;
CREATE TRIGGER native_call_push AFTER UPDATE OF offer ON call_sessions
 WHEN OLD.offer IS NULL AND NEW.offer IS NOT NULL AND NEW.state='ringing' BEGIN
 INSERT OR IGNORE INTO native_push_jobs(id,token,kind,event_id,recipient,sender,conversation,expires_at)
 SELECT 'call:'||NEW.id||':'||d.token,d.token,'call',NEW.id,NEW.callee,NEW.caller,NEW.conversation,NEW.updated_at+90000
 FROM native_devices d WHERE d.member=NEW.callee AND d.enabled=1 AND d.updated_at>NEW.updated_at-2592000000;
END;
