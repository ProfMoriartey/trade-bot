"use server"

import { Keypair, VersionedTransaction } from "@solana/web3.js"
import bs58 from "bs58"

export async function executeBuy(mintAddress: string, amountInSol: number) {
  try {
    const privateKey = process.env.SOLANA_BOT_PRIVATE_KEY

    if (!privateKey) {
      return { success: false, message: "Missing bot private key" }
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(privateKey))
    const lamports = Math.floor(amountInSol * 1000000000)
    const solMint = "So11111111111111111111111111111111111111112"

    const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${solMint}&outputMint=${mintAddress}&amount=${lamports}&slippageBps=500`)
    const quoteData = await quoteResponse.json()

    if (quoteData.error) {
      return { success: false, message: "Could not get a price quote" }
    }

    const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
      })
    })

    const swapData = await swapResponse.json()
    
    if (!swapData.swapTransaction) {
      return { success: false, message: "Failed to generate swap transaction" }
    }

    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64")
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf)
    
    transaction.sign([wallet])

    const rawTransaction = transaction.serialize()
    const txBase64 = Buffer.from(rawTransaction).toString("base64")

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? ""

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

    const broadcastData = await broadcastRes.json()

    if (broadcastData.error) {
      return { success: false, message: broadcastData.error.message }
    }

    return { 
      success: true, 
      txid: broadcastData.result 
    }
  } catch (error) {
    return { success: false, message: "Trade execution failed" }
  }
}