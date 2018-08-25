CREATE TABLE "friends" (
	`userid`	INTEGER,
	`friendid`	INTEGER
);
CREATE TABLE `irc_tokens` (
	`id`	INTEGER NOT NULL,
	`token`	TEXT,
	PRIMARY KEY(`id`)
);
CREATE TABLE "users" (
	`id`	INTEGER NOT NULL DEFAULT 0 PRIMARY KEY AUTOINCREMENT,
	`username`	TEXT NOT NULL,
	`password`	TEXT NOT NULL,
	`permission`	INTEGER DEFAULT 0,
	`username_easy`	INTEGER,
	`silence_time`	INTEGER NOT NULL DEFAULT 0,
	`silence_reason`	INTEGER,
	`latest_activity`	INTEGER
);
CREATE TABLE "user_status" (
	`id`	INTEGER NOT NULL,
	`ranked_score_0`	INTEGER DEFAULT 0,
	`accuracy_0`	REAL DEFAULT 0,
	`playcount_0`	INTEGER DEFAULT 0,
	`total_score_0`	INTEGER DEFAULT 0,
	`pp_0`	REAL DEFAULT 0,
	`ranked_score_1`	INTEGER DEFAULT 0,
	`accuracy_1`	REAL DEFAULT 0,
	`playcount_1`	INTEGER DEFAULT 0,
	`total_score_1`	INTEGER DEFAULT 0,
	`pp_1`	REAL DEFAULT 0,
	`ranked_score_2`	INTEGER DEFAULT 0,
	`accuracy_2`	REAL DEFAULT 0,
	`playcount_2`	INTEGER DEFAULT 0,
	`total_score_2`	INTEGER DEFAULT 0,
	`pp_2`	REAL DEFAULT 0,
	`ranked_score_3`	INTEGER DEFAULT 0,
	`accuracy_3`	REAL DEFAULT 0,
	`playcount_3`	INTEGER DEFAULT 0,
	`total_score_3`	INTEGER DEFAULT 0,
	`pp_3`	REAL DEFAULT 0,
	`game_rank_0`	integer DEFAULT 0,
	`game_rank_1`	integer DEFAULT 0,
	`game_rank_2`	integer DEFAULT 0,
	`game_rank_3`	integer DEFAULT 0,
	`country`	TEXT DEFAULT 'XX',
	PRIMARY KEY(`id`)
);
