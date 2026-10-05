CREATE TABLE `call_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation` text NOT NULL,
	`caller` text NOT NULL,
	`callee` text NOT NULL,
	`mode` text NOT NULL,
	`state` text DEFAULT 'ringing' NOT NULL,
	`offer` text,
	`answer` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_calls_caller_state` ON `call_sessions` (`caller`,`state`);--> statement-breakpoint
CREATE INDEX `idx_calls_callee_state` ON `call_sessions` (`callee`,`state`);--> statement-breakpoint
ALTER TABLE `members` ADD `photo_key` text;