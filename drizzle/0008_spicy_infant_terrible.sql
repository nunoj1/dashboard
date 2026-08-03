CREATE TABLE `news_regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`region` text NOT NULL,
	`order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `news_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`tag` text NOT NULL,
	`active` integer DEFAULT true,
	`order` integer DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE `news_articles` ADD `saved_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `news_articles_user_url` ON `news_articles` (`user_id`,`url`);--> statement-breakpoint
ALTER TABLE `news_articles` DROP COLUMN `url_to_image`;--> statement-breakpoint
ALTER TABLE `news_articles` DROP COLUMN `mode`;--> statement-breakpoint
ALTER TABLE `news_articles` DROP COLUMN `fetched_at`;