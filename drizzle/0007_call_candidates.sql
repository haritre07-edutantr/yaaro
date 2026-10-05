CREATE TABLE IF NOT EXISTS call_candidates (
 id TEXT PRIMARY KEY NOT NULL,
 call_id TEXT NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
 author TEXT NOT NULL,
 candidate TEXT NOT NULL,
 sdp_mid TEXT,
 sdp_mline INTEGER,
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS call_candidates_session ON call_candidates(call_id,author,created_at);
CREATE TRIGGER IF NOT EXISTS clear_call_candidates AFTER UPDATE OF state ON call_sessions
WHEN NEW.state IN ('ended','declined')
BEGIN DELETE FROM call_candidates WHERE call_id=NEW.id; END;
