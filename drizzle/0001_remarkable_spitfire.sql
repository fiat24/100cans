CREATE TABLE `blogPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blogId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`url` varchar(2000) NOT NULL,
	`score` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`publishedDate` timestamp,
	`externalId` varchar(255),
	`isSummarized` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogPosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`author` varchar(255),
	`bio` text,
	`topics` text,
	`totalScore` int DEFAULT 0,
	`storiesCount` int DEFAULT 0,
	`averageScore` int DEFAULT 0,
	`rank` int,
	`lastFetched` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `blogs_domain_unique` UNIQUE(`domain`)
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`summaryText` text NOT NULL,
	`modelUsed` varchar(100) DEFAULT 'gpt-4o-mini',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `summaries_id` PRIMARY KEY(`id`)
);
