CREATE TABLE `book_toc` (
	`book_id` text PRIMARY KEY NOT NULL,
	`entries` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`harvested_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE cascade
);
