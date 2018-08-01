CREATE TABLE "friends" (
	`userid`	INTEGER,
	`friendid`	INTEGER
);
CREATE TABLE "users" (
	`id`	INTEGER NOT NULL DEFAULT 0 PRIMARY KEY AUTOINCREMENT,
	`username`	TEXT NOT NULL,
	`password`	TEXT NOT NULL,
	`permission`	INTEGER DEFAULT 0,
	`username_easy`	INTEGER
);
CREATE TABLE `user_status` (
	`id`	INTEGER NOT NULL,
	ranked_score_0 INTEGER,
	accuracy_0 REAL,
	playcount_0 INTEGER,
	total_score_0 INTEGER,
	pp_0 REAL,
	ranked_score_1 INTEGER,
	accuracy_1 REAL,
	playcount_1 INTEGER,
	total_score_1 INTEGER,
	pp_1 REAL,
	ranked_score_2 INTEGER,
	accuracy_2 REAL,
	playcount_2 INTEGER,
	total_score_2 INTEGER,
	pp_2 REAL,
	ranked_score_3 INTEGER,
	accuracy_3 REAL,
	playcount_3 INTEGER,
	total_score_3 INTEGER,
	pp_3 REAL, game_rank_0 integer, game_rank_1 integer, game_rank_2 integer, game_rank_3 integer,
	PRIMARY KEY(`id`)
);
