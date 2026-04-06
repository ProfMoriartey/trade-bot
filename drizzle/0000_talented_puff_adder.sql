CREATE TABLE "token_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"mint_address" text NOT NULL,
	"top_holders_percentage" numeric,
	"is_rug_pull_risk" boolean DEFAULT false,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"mint_address" text NOT NULL,
	"name" text,
	"symbol" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokens_mint_address_unique" UNIQUE("mint_address")
);
