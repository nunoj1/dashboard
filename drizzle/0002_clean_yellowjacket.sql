CREATE TABLE `subtasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`todo_id` integer NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false,
	`created_at` integer
);
