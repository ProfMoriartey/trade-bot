import { createSolanaRpc } from "@solana/rpc";
import { createSolanaRpcSubscriptions } from "@solana/rpc-subscriptions";

const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? "";

if (!rpcUrl) {
  throw new Error("Missing NEXT_PUBLIC_HELIUS_RPC_URL in environment variables");
}

export const rpc = createSolanaRpc(rpcUrl);

export const rpcSubscriptions = createSolanaRpcSubscriptions(
  rpcUrl.replace("https", "wss")
);