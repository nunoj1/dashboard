CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `todo_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `todo_subtasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`todo_id` integer NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`done` integer DEFAULT false,
	`due_date` integer,
	`completed_at` integer,
	`priority` text DEFAULT 'medium',
	`category` text,
	`location` text,
	`created_at` integer
);
