CREATE TABLE `youtube_subscription_toggles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`hidden` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `yt_sub_toggle_user_channel` ON `youtube_subscription_toggles` (`user_id`,`channel_id`);--> statement-breakpoint
DROP TABLE `news_tags`;