"use server"

import { Keypair, VersionedTransaction } from "@solana/web3.js"
import bs58 from "bs58"

// 1. Define the Expected Response Types
interface JupiterQuoteResponse {
  error?: string;
  // We don't need to define every field Jupiter returns, 
  // just the ones we need or pass back to them
  [key: string]: unknown; 
}

interface JupiterSwapResponse {
  swapTransaction?: string;
  error?: string;
}

interface HeliusBroadcastResponse {
  error?: { message: string };
  result?: string;
}

export async function executeBuy(mintAddress: string, amountInSol: number) {
  try {
    const privateKey = process.env.SOLANA_BOT_PRIVATE_KEY

    if (!privateKey) {
      return { success: false, message: "Missing bot private key" }
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey))
    const lamports = Math.floor(amountInSol * 1000000000)
    const solMint = "So11111111111111111111111111111111111111112"

    // Fetch Quote
    const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${solMint}&outputMint=${mintAddress}&amount=${lamports}&slippageBps=500`)
    
    // 2. Cast the unknown JSON to our defined type
    const quoteData = (await quoteResponse.json()) as JupiterQuoteResponse

    if (quoteData.error) {
      return { success: false, message: "Could not get a price quote" }
    }

    // Fetch Swap Transaction
    const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
      })
    })

    // 3. Cast Swap Response
    const swapData = (await swapResponse.json()) as JupiterSwapResponse
    
    if (!swapData.swapTransaction) {
      return { success: false, message: "Failed to generate swap transaction" }
    }

    // Now TypeScript knows swapTransaction is a string
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64")
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf)
    
    transaction.sign([wallet])

    const rawTransaction = transaction.serialize()
    const txBase64 = Buffer.from(rawTransaction).toString("base64")

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? ""

    // Broadcast Transaction
    const broadcastRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendTransaction",
        params: [txBase64, { encoding: "base64", skipPreflight: true }]
      })
    })

    // 4. Cast Broadcast Response
    const broadcastData = (await broadcastRes.json()) as HeliusBroadcastResponse

    if (broadcastData.error) {
      return { success: false, message: broadcastData.error.message }
    }

    return { 
      success: true, 
      txid: broadcastData.result ?? "Unknown TXID"
    }
  } catch (error) {
    return { success: false, message: "Trade execution failed" }
  }
}