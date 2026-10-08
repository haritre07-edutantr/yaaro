CREATE TABLE password_recoveries(ticket_hash TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
CREATE INDEX password_recoveries_expiry ON password_recoveries(expires_at);
