CREATE TABLE explore_queue (
 member TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
 ticket TEXT NOT NULL UNIQUE,
 mode TEXT NOT NULL CHECK(mode IN ('text','voice','video')),
 language TEXT NOT NULL DEFAULT '',
 vibe TEXT NOT NULL DEFAULT '',
 interest TEXT NOT NULL DEFAULT '',
 region TEXT NOT NULL DEFAULT '',
 session_id TEXT,
 joined_at INTEGER NOT NULL,
 touched_at INTEGER NOT NULL
);
CREATE INDEX explore_queue_available ON explore_queue(mode,session_id,touched_at);
CREATE TABLE explore_sessions (
 id TEXT PRIMARY KEY,
 member_a TEXT NOT NULL REFERENCES members(id),
 member_b TEXT NOT NULL REFERENCES members(id),
 mode TEXT NOT NULL CHECK(mode IN ('text','voice','video')),
 state TEXT NOT NULL DEFAULT 'active' CHECK(state IN ('active','ended')),
 decision_a TEXT NOT NULL DEFAULT 'pending' CHECK(decision_a IN ('pending','request','skip')),
 decision_b TEXT NOT NULL DEFAULT 'pending' CHECK(decision_b IN ('pending','request','skip')),
 created_at INTEGER NOT NULL,
 ended_at INTEGER,
 CHECK(member_a != member_b)
);
CREATE INDEX explore_sessions_cleanup ON explore_sessions(state,ended_at,created_at);
CREATE INDEX explore_sessions_a ON explore_sessions(member_a,state);
CREATE INDEX explore_sessions_b ON explore_sessions(member_b,state);
CREATE TABLE explore_messages (
 id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL REFERENCES explore_sessions(id) ON DELETE CASCADE,
 author TEXT NOT NULL REFERENCES members(id),
 body TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE INDEX explore_messages_session ON explore_messages(session_id,created_at);
CREATE TRIGGER explore_claim AFTER INSERT ON explore_sessions BEGIN
 UPDATE explore_queue SET session_id=NEW.id WHERE member IN (NEW.member_a,NEW.member_b);
END;
CREATE TRIGGER explore_message_limit AFTER INSERT ON explore_messages BEGIN
 DELETE FROM explore_messages WHERE session_id=NEW.session_id AND id NOT IN (SELECT id FROM explore_messages WHERE session_id=NEW.session_id ORDER BY created_at DESC,rowid DESC LIMIT 30);
END;
CREATE TRIGGER explore_end AFTER UPDATE OF state ON explore_sessions WHEN NEW.state='ended' AND OLD.state='active' BEGIN
 DELETE FROM explore_messages WHERE session_id=NEW.id;
 UPDATE call_sessions SET state='ended',offer=NULL,answer=NULL WHERE conversation=NEW.id AND state IN ('ringing','connecting','active');
END;
CREATE TRIGGER explore_call_end AFTER UPDATE OF state ON call_sessions WHEN NEW.state IN ('ended','declined') AND OLD.state IN ('ringing','connecting','active') AND NEW.conversation LIKE 'explore:%' BEGIN
 UPDATE explore_sessions SET state='ended',ended_at=COALESCE(ended_at,NEW.updated_at) WHERE id=NEW.conversation AND state='active';
END;
CREATE TRIGGER explore_delete AFTER DELETE ON explore_sessions BEGIN
 DELETE FROM explore_messages WHERE session_id=OLD.id;
 DELETE FROM call_sessions WHERE conversation=OLD.id;
 DELETE FROM explore_queue WHERE session_id=OLD.id;
END;
CREATE TRIGGER explore_block AFTER INSERT ON member_blocks BEGIN
 UPDATE explore_sessions SET state='ended',ended_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE state='active' AND ((member_a=NEW.blocker AND member_b=NEW.blocked) OR (member_b=NEW.blocker AND member_a=NEW.blocked));
END;
CREATE TRIGGER explore_privacy AFTER UPDATE OF status,published,privacy ON members BEGIN
 UPDATE explore_sessions SET state='ended',ended_at=CAST(strftime('%s','now') AS INTEGER)*1000 WHERE state='active' AND (member_a=NEW.id OR member_b=NEW.id) AND (NEW.status!='active' OR NEW.published!=1 OR json_extract(NEW.privacy,'$.discover')!='Everyone' OR (mode='text' AND json_extract(NEW.privacy,'$.messages')='Nobody') OR (mode!='text' AND json_extract(NEW.privacy,'$.calls')='Nobody'));
END;
