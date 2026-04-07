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
    holdersList: Array<{
      address: string
      tokenAmount: number
      solBalance: number
      ageInDays: number
    }>
  }
}

// 1. Explicitly type the expected responses to remove 'any' bleed
interface TokenSupply {
  value: { amount: string }
}

interface TokenLargestAccounts {
  value: Array<{ address: { toString: () => string }; amount: string }>
}

interface SignatureData {
  blockTime?: number | null
}

interface BalanceData {
  value: bigint | number | string
}

export async function getWalletForensics(walletString: string): Promise<{ solBalance: number, ageInDays: number, isFreshWallet: boolean }> {
  const wallet = address(walletString)

  const balanceRes = (await rpc.getBalance(wallet).send()) as unknown as BalanceData
  const solBalance = Number(balanceRes.value) / 1_000_000_000

  const sigsRes = (await rpc.getSignaturesForAddress(wallet, { limit: 1000 }).send()) as unknown as SignatureData[]
  
  let ageInDays = 0
  
  if (sigsRes.length > 0) {
    const oldestTx = sigsRes[sigsRes.length - 1]
    
    // Fix: Use optional chaining syntax
    if (oldestTx?.blockTime) {
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

    // Run parallel fetches
    const holdersRaw = await rpc.getTokenLargestAccounts(mint).send()
    const supplyRaw = await rpc.getTokenSupply(mint).send()
    const socialRaw = await getSocialsAndLiquidity(mintAddressString)
    const securityRaw = await getSecurityFilters(mintAddressString)

    // 2. Cast the raw responses to strict types to satisfy ESLint
    const holdersResponse = holdersRaw as unknown as TokenLargestAccounts
    const supplyResponse = supplyRaw as unknown as TokenSupply
    
    const socialData = socialRaw as { hasTelegram: boolean; hasTwitter: boolean; liquidityUsd: number }
    const securityData = securityRaw as { isMintRevoked: boolean; isFreezeRevoked: boolean }

    const topHolders = holdersResponse.value.slice(0, 5)
    const totalSupplyStr = supplyResponse.value.amount

    if (!totalSupplyStr) {
      return { success: false, message: "Could not fetch token supply" }
    }

    const totalSupply = Number(totalSupplyStr)

    let top5Amount = 0
    let freshWalletsCount = 0
    const holdersList = []

    for (const holder of topHolders) {
      const amount = Number(holder.amount)
      top5Amount += amount
      
      const holderAddressStr = holder.address.toString()
      const forensics = await getWalletForensics(holderAddressStr)
      
      if (forensics.isFreshWallet) {
        freshWalletsCount += 1
      }

      holdersList.push({
        address: holderAddressStr,
        tokenAmount: amount,
        solBalance: forensics.solBalance,
        ageInDays: forensics.ageInDays
      })
    }

    const topHoldersPercentage = (top5Amount / totalSupply) * 100
    const isRugPullRisk = topHoldersPercentage > 50 || freshWalletsCount >= 3

    const isSafeToTrade = socialData.hasTelegram && !isRugPullRisk

    await db.insert(tokens)
      .values({ mintAddress: mintAddressString })
      .onConflictDoNothing()

    await db.insert(tokenScans).values({
      mintAddress: mintAddressString,
      topHoldersPercentage: topHoldersPercentage.toFixed(2),
      isRugPullRisk,
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
        isSafeToTrade,
        holdersList
      }
    }
  } catch (error) {
    console.error("Failed to scan token:", error)
    return { success: false, message: "Failed to process token scan." }
  }
}