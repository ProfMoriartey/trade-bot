ALTER TABLE "token_scans" ADD COLUMN "hasTelegram" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "token_scans" ADD COLUMN "isMintRevoked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "token_scans" ADD COLUMN "isFreezeRevoked" boolean DEFAULT false;