CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`done` integer DEFAULT false,
	`due_date` integer,
	`priority` text DEFAULT 'medium',
	`created_at` integer
);
