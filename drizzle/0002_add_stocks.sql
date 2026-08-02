CREATE TABLE `stock_tickers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0,
	`created_at` integer
);
