import { NextResponse } from "next/server"

// Define a generic array type to satisfy strict TypeScript rules during debugging
type HeliusDebugPayload = Array<Record<string, unknown>>

export async function POST(req: Request) {
  try {
    // Cast the incoming JSON to our generic array
    const body = (await req.json()) as HeliusDebugPayload
    
    // Now TypeScript knows 'body' is an array and has a .length property
    console.log(`Received Webhook! Array length: ${body.length}`)

    // It also knows body[0] is safe to access if length > 0
    if (body.length > 0) {
      console.dir(body[0], { depth: null, colors: true })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
  }
}

// import { NextResponse } from "next/server"
// import { scanAndSaveToken } from "~/actions/scan"
// import { executeBuy } from "~/actions/swap"

// // Define the Expected Webhook Payload Type
// interface TokenTransfer {
//   mint: string
//   [key: string]: unknown
// }

// interface HeliusTransaction {
//   tokenTransfers?: TokenTransfer[]
//   [key: string]: unknown
// }

// export async function POST(req: Request) {
//   try {
//     // Cast the JSON body to an array of HeliusTransactions
//     const body = (await req.json()) as HeliusTransaction[]
    
//     for (const tx of body) {
//       const mintAddress = tx.tokenTransfers?.[0]?.mint
      
//       if (mintAddress) {
//         console.log(`New Token Detected: ${mintAddress}`)
        
//         const scan = await scanAndSaveToken(mintAddress)
        
//         if (scan.success && scan.data?.isSafeToTrade) {
//           console.log(`SAFE TOKEN FOUND. Executing Buy for ${mintAddress}`)
//           await executeBuy(mintAddress, 0.1)
//         }
//       }
//     }

//     return NextResponse.json({ ok: true })
//   } catch (error) {
//     // Log the error so the variable is used
//     console.error("Webhook processing error:", error)
//     return NextResponse.json({ error: "Webhook failed" }, { status: 500 })
//   }
// }