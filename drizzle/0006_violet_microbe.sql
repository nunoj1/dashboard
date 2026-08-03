CREATE TABLE `youtube_channels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`channel_name` text NOT NULL,
	`thumbnail_url` text,
	`order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `youtube_videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`channel_id` text NOT NULL,
	`video_id` text NOT NULL,
	`title` text NOT NULL,
	`thumbnail_url` text,
	`published_at` text,
	`watched` integer DEFAULT false,
	`fetched_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `youtube_videos_video_id_unique` ON `youtube_videos` (`video_id`);--> statement-breakpoint
CREATE TABLE `news_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`url_to_image` text,
	`published_at` text,
	`category` text DEFAULT 'general',
	`read` integer DEFAULT false,
	`fetched_at` integer
);
