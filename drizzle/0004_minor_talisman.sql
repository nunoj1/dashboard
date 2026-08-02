CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `scheduled_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`priority` text DEFAULT 'medium',
	`schedule_type` text NOT NULL,
	`schedule_value` integer,
	`day_of_week` integer,
	`day_of_month` integer,
	`time_of_day` text DEFAULT '09:00',
	`last_generated_at` integer,
	`active` integer DEFAULT true,
	`created_at` integer
);
--> statement-breakpoint
ALTER TABLE `todos` ADD `category` text;