"use server"

import { address } from "@solana/addresses"
import { rpc } from "~/lib/solana/connection"
import { db } from "~/server/db"
import { tokens, tokenScans } from "~/server/db/schema"
import { getSocialsAndLiquidity, getSecurityFilters } from "./filters"

type ScanResult = {
  success: boolean
  message?: string
  data?: {
    topHoldersPercentage: number
    isRugPullRisk: boolean
    hasTelegram: boolean
    hasTwitter: boolean
    isMintRevoked: boolean
    isFreezeRevoked: boolean
    liquidityUsd: number
    freshWalletsInTop5: number
    isSafeToTrade: boolean
  }
}

export async function getWalletForensics(walletString: string) {
  const wallet = address(walletString)

  const balanceRes = await rpc.getBalance(wallet).send()
  const solBalance = Number(balanceRes.value) / 1_000_000_000

  const sigsRes = await rpc.getSignaturesForAddress(wallet, { limit: 1000 }).send()
  
  let ageInDays = 0
  
  if (sigsRes.length > 0) {
    const oldestTx = sigsRes[sigsRes.length - 1]
    
    if (oldestTx.blockTime) {
      const now = Math.floor(Date.now() / 1000)
      const diffInSeconds = now - Number(oldestTx.blockTime)
      ageInDays = diffInSeconds / 86400
    }
  }

  return {
    solBalance,
    ageInDays,
    isFreshWallet: ageInDays < 2
  }
}

export async function scanAndSaveToken(mintAddressString: string): Promise<ScanResult> {
  try {
    const mint = address(mintAddressString)

    // 1. Fetch all basic data simultaneously
    const [holdersResponse, supplyResponse, socialData, securityData] = await Promise.all([
      rpc.getTokenLargestAccounts(mint).send(),
      rpc.getTokenSupply(mint).send(),
      getSocialsAndLiquidity(mintAddressString),
      getSecurityFilters(mintAddressString)
    ])

    const topHolders = holdersResponse.value.slice(0, 5)
    const totalSupplyStr = supplyResponse.value.amount

    if (!totalSupplyStr) {
      return { success: false, message: "Could not fetch token supply" }
    }

    const totalSupply = Number(totalSupplyStr)

    // 2. Calculate Top 5 Percentage & Check Wallets
    let top5Amount = 0
    let freshWalletsCount = 0

    // We use a simple loop with await to check each wallet's age
    for (const holder of topHolders) {
      top5Amount += Number(holder.amount)
      const forensics = await getWalletForensics(holder.address.toString())
      if (forensics.isFreshWallet) {
        freshWalletsCount += 1
      }
    }

    const topHoldersPercentage = (top5Amount / totalSupply) * 100
    const isRugPullRisk = topHoldersPercentage > 50 || freshWalletsCount >= 3

    // 3. Determine if it passes all filters
    const isSafeToTrade = 
      securityData.isMintRevoked && 
      securityData.isFreezeRevoked && 
      socialData.hasTelegram && 
      !isRugPullRisk

    // 4. Save to database
    await db.insert(tokens)
      .values({ mintAddress: mintAddressString })
      .onConflictDoNothing()

    await db.insert(tokenScans).values({
      mintAddress: mintAddressString,
      topHoldersPercentage: topHoldersPercentage.toFixed(2),
      isRugPullRisk,
      // Make sure these match the new columns you add to schema.ts
      hasTelegram: socialData.hasTelegram,
      isMintRevoked: securityData.isMintRevoked,
      isFreezeRevoked: securityData.isFreezeRevoked,
    })

    return {
      success: true,
      data: {
        topHoldersPercentage,
        isRugPullRisk,
        hasTelegram: socialData.hasTelegram,
        hasTwitter: socialData.hasTwitter,
        isMintRevoked: securityData.isMintRevoked,
        isFreezeRevoked: securityData.isFreezeRevoked,
        liquidityUsd: socialData.liquidityUsd,
        freshWalletsInTop5: freshWalletsCount,
        isSafeToTrade
      }
    }
  } catch (error) {
    console.error("Failed to scan token:", error)
    return { success: false, message: "Failed to process token scan." }
  }
}