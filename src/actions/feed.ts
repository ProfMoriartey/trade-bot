"use server"

import { db } from "~/server/db"
import { tokenScans } from "~/server/db/schema"
import { desc } from "drizzle-orm"

export async function getRecentScans() {
  try {
    const data = await db.query.tokenScans.findMany({
      orderBy: [desc(tokenScans.scannedAt)],
      limit: 50,
    })
    
    return { success: true, data }
  } catch (error) {
    console.error("Failed to fetch live feed:", error)
    return { success: false, data: [] }
  }
}