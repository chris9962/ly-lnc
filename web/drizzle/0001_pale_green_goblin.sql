CREATE TABLE `attempt_answers` (
	`attempt_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`value` text,
	`saved_at` integer NOT NULL,
	PRIMARY KEY(`attempt_id`, `seq`),
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer,
	`paper_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`deadline` integer,
	`submitted_at` integer,
	`score` real,
	`max_score` real NOT NULL,
	`reopen_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_exam_user_idx` ON `attempts` (`exam_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `attempts_user_idx` ON `attempts` (`user_id`);--> statement-breakpoint
CREATE INDEX `attempts_paper_idx` ON `attempts` (`paper_id`);--> statement-breakpoint
CREATE TABLE `exam_papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exam_id` integer NOT NULL,
	`paper_id` integer NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `exam_papers_exam_idx` ON `exam_papers` (`exam_id`);--> statement-breakpoint
CREATE INDEX `exam_papers_paper_idx` ON `exam_papers` (`paper_id`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`search_title` text NOT NULL,
	`grade` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`created_by` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `exams_grade_idx` ON `exams` (`grade`,`starts_at`);--> statement-breakpoint
CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	`created_by` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `folders_parent_idx` ON `folders` (`parent_id`);--> statement-breakpoint
CREATE TABLE `paper_contexts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`count` integer NOT NULL,
	`boxes` text NOT NULL,
	`image_width` integer NOT NULL,
	`image_height` integer NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paper_contexts_seq_idx` ON `paper_contexts` (`paper_id`,`seq`);--> statement-breakpoint
CREATE TABLE `paper_questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`paper_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`label` integer,
	`shape` text NOT NULL,
	`answer_key` text,
	`boxes` text NOT NULL,
	`context_seq` integer,
	`image_width` integer NOT NULL,
	`image_height` integer NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paper_questions_seq_idx` ON `paper_questions` (`paper_id`,`seq`);--> statement-breakpoint
CREATE TABLE `papers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`search_title` text NOT NULL,
	`grade` integer NOT NULL,
	`folder_id` integer,
	`format` text NOT NULL,
	`scoring` text NOT NULL,
	`page_sizes` text NOT NULL,
	`warnings` text NOT NULL,
	`question_count` integer DEFAULT 0 NOT NULL,
	`keyed_count` integer DEFAULT 0 NOT NULL,
	`image_version` integer DEFAULT 1 NOT NULL,
	`source_name` text NOT NULL,
	`created_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `papers_grade_idx` ON `papers` (`grade`);--> statement-breakpoint
CREATE INDEX `papers_folder_idx` ON `papers` (`folder_id`);