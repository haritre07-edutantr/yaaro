CREATE TABLE `friendships` (
	`id` text PRIMARY KEY NOT NULL,
	`member_a` text NOT NULL,
	`member_b` text NOT NULL,
	`requester` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`read_a` integer DEFAULT 0 NOT NULL,
	`read_b` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_friendships_a` ON `friendships` (`member_a`);--> statement-breakpoint
CREATE INDEX `idx_friendships_b` ON `friendships` (`member_b`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`dob` text NOT NULL,
	`languages` text NOT NULL,
	`interests` text NOT NULL,
	`bio` text NOT NULL,
	`vibe` text NOT NULL,
	`avatar` text NOT NULL,
	`region` text DEFAULT 'Prefer not to say' NOT NULL,
	`privacy` text NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_owner` ON `members` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_members_published_status` ON `members` (`published`,`status`);--> statement-breakpoint
CREATE TABLE `chat_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`message` text NOT NULL,
	`member` text NOT NULL,
	`emoji` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reactions_message` ON `chat_reactions` (`message`);--> statement-breakpoint
CREATE TABLE `member_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`blocker` text NOT NULL,
	`blocked` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blocks_blocker` ON `member_blocks` (`blocker`);--> statement-breakpoint
CREATE INDEX `idx_blocks_blocked` ON `member_blocks` (`blocked`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation` text NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`reply_id` text,
	`deleted` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_conversation_time` ON `chat_messages` (`conversation`,`created_at`);