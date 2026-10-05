CREATE TABLE `chat_preferences` (
	`member` text NOT NULL,
	`target` text NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`member`, `target`),
	FOREIGN KEY (`member`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chat_preferences_flags" CHECK("chat_preferences"."pinned" IN (0, 1) AND "chat_preferences"."favorite" IN (0, 1))
);
