"use server"

import { address } from "@solana/addresses"
import { rpc } from "~/lib/solana/connection"
import { db } from "~/server/db"
import { tokens, tokenScans } from "~/server/db/schema"

type ScanResult = {
  success: boolean;
  message?: string;
  data?: {
    topHoldersPercentage: number;
    isRugPullRisk: boolean;
  };
}

export async function scanAndSaveToken(mintAddressString: string): Promise<ScanResult> {
  try {
    // 1. Validate the address
    const mint = address(mintAddressString)

    // 2. Fetch data from the blockchain
    const [holdersResponse, supplyResponse] = await Promise.all([
      rpc.getTokenLargestAccounts(mint).send(),
      rpc.getTokenSupply(mint).send()
    ])

    const topHolders = holdersResponse.value.slice(0, 5)
    const totalSupplyStr = supplyResponse.value.amount

    if (!totalSupplyStr) {
      return { success: false, message: "Could not fetch token supply" }
    }

    const totalSupply = Number(totalSupplyStr)

    // 3. Calculate metrics
    let top5Amount = 0
    for (const holder of topHolders) {
      top5Amount += Number(holder.amount)
    }

    const topHoldersPercentage = (top5Amount / totalSupply) * 100
    
    // Set a basic risk rule: If top 5 hold more than 50%, it is risky
    const isRugPullRisk = topHoldersPercentage > 50

    // 4. Save to database
    // Ensure the token exists in the main table first
    await db.insert(tokens)
      .values({ mintAddress: mintAddressString })
      .onConflictDoNothing()

    // Insert the scan record
    await db.insert(tokenScans).values({
      mintAddress: mintAddressString,
      topHoldersPercentage: topHoldersPercentage.toFixed(2),
      isRugPullRisk,
    })

    return {
      success: true,
      data: {
        topHoldersPercentage,
        isRugPullRisk
      }
    }
  } catch (error) {
    console.error("Failed to scan token:", error)
    return { success: false, message: "Failed to process token scan." }
  }
}