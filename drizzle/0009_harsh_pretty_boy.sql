CREATE TABLE `youtube_watched` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`video_id` text NOT NULL,
	`watched_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `youtube_watched_user_video` ON `youtube_watched` (`user_id`,`video_id`);--> statement-breakpoint
CREATE TABLE `news_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`active` integer DEFAULT true,
	`order` integer DEFAULT 0
);
--> statement-breakpoint
DROP TABLE `youtube_channels`;--> statement-breakpoint
DROP TABLE `youtube_videos`;--> statement-breakpoint
DROP TABLE `news_regions`;--> statement-breakpoint
ALTER TABLE `news_articles` ADD `image_url` text;