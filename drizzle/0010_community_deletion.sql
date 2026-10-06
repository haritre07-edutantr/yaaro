-- Retain report evidence independently of a deleted community or its content.
CREATE TABLE space_reports_retained (
 id TEXT PRIMARY KEY NOT NULL REFERENCES reports(id),
 space TEXT REFERENCES interest_spaces(id) ON DELETE SET NULL,
 post TEXT REFERENCES space_posts(id) ON DELETE SET NULL,
 resource TEXT REFERENCES space_resources(id) ON DELETE SET NULL,
 evidence TEXT NOT NULL DEFAULT '',
 reporter TEXT NOT NULL REFERENCES members(id),
 target TEXT NOT NULL REFERENCES members(id),
 category TEXT NOT NULL,
 description TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at INTEGER NOT NULL,
 message TEXT REFERENCES space_messages(id) ON DELETE SET NULL
);
INSERT INTO space_reports_retained(id,space,post,resource,evidence,reporter,target,category,description,status,created_at,message)
 SELECT id,space,post,resource,evidence,reporter,target,category,description,status,created_at,message FROM space_reports;
DROP TABLE space_reports;
ALTER TABLE space_reports_retained RENAME TO space_reports;
CREATE INDEX space_reports_queue ON space_reports(space,status,created_at);
