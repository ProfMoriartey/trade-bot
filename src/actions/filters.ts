"use server"

export async function getSocialsAndLiquidity(mintAddress: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
  const response = await fetch(url)
  const data = await response.json()

  if (!data.pairs || data.pairs.length === 0) {
    return { hasTelegram: false, hasTwitter: false, liquidityUsd: 0 }
  }

  const topPair = data.pairs[0]
  const socials = topPair.info?.socials || []

  const hasTelegram = socials.some((s: any) => s.type === "telegram")
  const hasTwitter = socials.some((s: any) => s.type === "twitter")

  return {
    hasTelegram,
    hasTwitter,
    liquidityUsd: topPair.liquidity?.usd || 0
  }
}

export async function getSecurityFilters(mintAddress: string) {
  const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL

  if (!rpcUrl) {
    throw new Error("Missing RPC URL")
  }

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "getAsset",
      params: { id: mintAddress }
    })
  })

  const data = await response.json()
  const tokenInfo = data.result?.token_info

  if (!tokenInfo) {
    return { isMintRevoked: false, isFreezeRevoked: false }
  }

  const hasMintAuthority = tokenInfo.mint_authority !== null
  const hasFreezeAuthority = tokenInfo.freeze_authority !== null

  return {
    isMintRevoked: !hasMintAuthority,
    isFreezeRevoked: !hasFreezeAuthority
  }
}