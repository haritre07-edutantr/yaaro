CREATE TABLE account_deletions (owner TEXT PRIMARY KEY NOT NULL, member TEXT, requested_at INTEGER NOT NULL, completed_at INTEGER);
CREATE TRIGGER account_deletion_owner_guard BEFORE INSERT ON account_deletions
WHEN EXISTS(SELECT 1 FROM interest_spaces WHERE owner=NEW.member)
BEGIN SELECT RAISE(ABORT,'OWNER_TRANSFER'); END;
