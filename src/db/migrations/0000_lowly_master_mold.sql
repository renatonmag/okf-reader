CREATE TABLE `annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`kind` text NOT NULL,
	`locator_start` text NOT NULL,
	`locator_end` text,
	`text_snippet` text,
	`color` text,
	`note_body` text,
	`parent_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `annotations_book_idx` ON `annotations` (`book_id`,`kind`);--> statement-breakpoint
CREATE INDEX `annotations_parent_idx` ON `annotations` (`parent_id`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY DEFAULT 'global' NOT NULL,
	`font_family` text DEFAULT 'serif' NOT NULL,
	`font_size` integer DEFAULT 18 NOT NULL,
	`line_spacing` real DEFAULT 1.5 NOT NULL,
	`margin` integer DEFAULT 24 NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`reading_mode` text DEFAULT 'paged' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `book_settings` (
	`book_id` text PRIMARY KEY NOT NULL,
	`font_family` text,
	`font_size` integer,
	`line_spacing` real,
	`margin` integer,
	`theme` text,
	`reading_mode` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`cover_path` text,
	`file_path` text NOT NULL,
	`format` text NOT NULL,
	`content_hash` text NOT NULL,
	`file_size` integer NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_opened_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_content_hash_unique` ON `books` (`content_hash`);--> statement-breakpoint
CREATE INDEX `books_last_opened_idx` ON `books` (`last_opened_at`);--> statement-breakpoint
CREATE INDEX `books_title_idx` ON `books` (`title`);--> statement-breakpoint
CREATE TABLE `reading_state` (
	`book_id` text PRIMARY KEY NOT NULL,
	`locator` text,
	`progress` real DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
