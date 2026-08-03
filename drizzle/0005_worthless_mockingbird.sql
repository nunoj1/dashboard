ALTER TABLE `habits` ADD `target_type` text DEFAULT 'daily';--> statement-breakpoint
ALTER TABLE `habits` ADD `target_count` integer;--> statement-breakpoint
ALTER TABLE `habits` DROP COLUMN `target`;