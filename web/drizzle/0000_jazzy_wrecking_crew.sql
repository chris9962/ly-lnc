CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`actor_id` integer,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` integer,
	`detail` text,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_log_target_idx` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_log_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`search_name` text NOT NULL,
	`role` text NOT NULL,
	`grade` integer,
	`must_change_password` integer DEFAULT true NOT NULL,
	`disabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_role_grade_idx` ON `users` (`role`,`grade`);