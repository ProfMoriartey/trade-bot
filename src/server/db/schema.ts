import { pgTable, serial, text, timestamp, numeric, boolean } from "drizzle-orm/pg-core"

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  mintAddress: text("mint_address").notNull().unique(),
  name: text("name"),
  symbol: text("symbol"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})

export const tokenScans = pgTable("token_scans", {
  id: serial("id").primaryKey(),
  mintAddress: text("mint_address").notNull(),
  topHoldersPercentage: numeric("top_holders_percentage"),
  isRugPullRisk: boolean("is_rug_pull_risk").default(false),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
  hasTelegram: boolean("hasTelegram").default(false), 
  hasTwitter: boolean("hasTwitter").default(false),
  isMintRevoked: boolean("isMintRevoked").default(false),
  isFreezeRevoked: boolean("isFreezeRevoked").default(false),
})