CREATE TABLE "ravelry_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
