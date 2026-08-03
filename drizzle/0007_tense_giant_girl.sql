ALTER TABLE `news_articles` ADD `mode` text DEFAULT 'local';--> statement-breakpoint
ALTER TABLE `news_articles` DROP COLUMN `category`;