import { NextResponse } from "next/server"
import { scanAndSaveToken } from "~/actions/scan"
import { executeBuy } from "~/actions/swap"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Helius sends an array of transactions
    for (const tx of body) {
      // 1. Extract the Mint Address from the Raydium 'Initialize' instruction
      // This logic depends on the specific Helius parser, but usually:
      const mintAddress = tx.tokenTransfers?.[0]?.mint
      
      if (mintAddress) {
        console.log(`New Token Detected: ${mintAddress}`)
        
        // 2. Run your Forensic Scan
        const scan = await scanAndSaveToken(mintAddress)
        
        // 3. Auto-Execute if it passes your 'Safe' threshold
        if (scan.success && scan.data?.isSafeToTrade) {
          console.log(`SAFE TOKEN FOUND. Executing Buy for ${mintAddress}`)
          
          // Execute trade with your preferred amount (e.g., 0.1 SOL)
          await executeBuy(mintAddress, 0.1)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}