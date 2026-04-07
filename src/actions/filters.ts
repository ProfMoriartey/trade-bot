"use server"

// 1. Define DexScreener Types
interface SocialLink {
  type: string;
  url: string;
}

interface DexPair {
  info?: {
    socials?: SocialLink[];
  };
  liquidity?: {
    usd?: number;
  };
}

interface DexScreenerResponse {
  pairs?: DexPair[] | null;
}

export async function getSocialsAndLiquidity(mintAddress: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
  const response = await fetch(url)
  
  // Cast the response
  const data = (await response.json()) as DexScreenerResponse

  if (!data.pairs || data.pairs.length === 0) {
    return { hasTelegram: false, hasTwitter: false, liquidityUsd: 0 }
  }

  // Use optional chaining
  const topPair = data.pairs[0]
  
  // Use ?? instead of || to satisfy the ESLint rule
  const socials = topPair?.info?.socials ?? []

  // TypeScript now knows 's' is of type SocialLink
  const hasTelegram = socials.some((s) => s.type === "telegram")
  const hasTwitter = socials.some((s) => s.type === "twitter")

  return {
    hasTelegram,
    hasTwitter,
    liquidityUsd: topPair?.liquidity?.usd ?? 0
  }
}

// 2. Define Helius Types
interface TokenInfo {
  mint_authority?: string | null;
  freeze_authority?: string | null;
}

interface HeliusAssetResponse {
  result?: {
    token_info?: TokenInfo;
  };
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

  // Cast the response
  const data = (await response.json()) as HeliusAssetResponse
  const tokenInfo = data.result?.token_info

  if (!tokenInfo) {
    return { isMintRevoked: false, isFreezeRevoked: false }
  }

  // Explicit null checks for strict boolean assignment
  const hasMintAuthority = tokenInfo.mint_authority !== null && tokenInfo.mint_authority !== undefined
  const hasFreezeAuthority = tokenInfo.freeze_authority !== null && tokenInfo.freeze_authority !== undefined

  return {
    isMintRevoked: !hasMintAuthority,
    isFreezeRevoked: !hasFreezeAuthority
  }
}