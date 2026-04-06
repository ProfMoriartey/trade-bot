"use client";

import { useState } from "react";
import { scanAndSaveToken } from "~/actions/scan";
import { executeBuy } from "~/actions/swap";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Search,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Droplets,
  Users,
} from "lucide-react";

type ScanData = {
  topHoldersPercentage: number;
  isRugPullRisk: boolean;
  hasTelegram: boolean;
  hasTwitter: boolean;
  isMintRevoked: boolean;
  isFreezeRevoked: boolean;
  liquidityUsd: number;
  freshWalletsInTop5: number;
  isSafeToTrade: boolean;
  holdersList: Array<{
    address: string;
    tokenAmount: number;
    solBalance: number;
    ageInDays: number;
  }>;
};

export default function Dashboard() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanData | null>(null);

  const [buyAmount, setBuyAmount] = useState("0.01");
  const [buying, setBuying] = useState(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setTxMessage(null);

    try {
      const res = await scanAndSaveToken(address);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.message ?? "Failed to scan token");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    setBuying(true);
    setTxMessage(null);

    const amount = Number(buyAmount);

    if (amount <= 0) {
      setTxMessage("Enter a valid SOL amount");
      setBuying(false);
      return;
    }

    const res = await executeBuy(address, amount);

    if (res.success) {
      setTxMessage(`Success Transaction ID: ${res.txid}`);
    } else {
      setTxMessage(`Error: ${res.message}`);
    }

    setBuying(false);
  };

  const BooleanRow = ({ label, value }: { label: string; value: boolean }) => (
    <div className="bg-background flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      {value ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      ) : (
        <XCircle className="text-destructive h-5 w-5" />
      )}
    </div>
  );

  return (
    <main className="container mx-auto max-w-4xl p-4 md:p-8">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meme Coin Sniper
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze Solana contracts and execute trades.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Scan Contract</CardTitle>
            <CardDescription>
              Paste a Solana Mint Address below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleScan}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                placeholder="e.g. JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbZedPFTsUpT"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="flex-1"
                disabled={loading || buying}
              />
              <Button type="submit" disabled={loading || !address || buying}>
                {loading ? (
                  "Scanning"
                ) : (
                  <span className="flex items-center">
                    <Search className="mr-2 h-4 w-4" />
                    Scan
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="text-destructive flex items-center gap-2 pt-6">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  Security Check
                  {result.isSafeToTrade ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">
                      Safe
                    </Badge>
                  ) : (
                    <Badge variant="destructive">High Risk</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <BooleanRow
                  label="Mint Authority Revoked"
                  value={result.isMintRevoked}
                />
                <BooleanRow
                  label="Freeze Authority Revoked"
                  value={result.isFreezeRevoked}
                />
                <div className="bg-background flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Users className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm font-medium">
                      Top 5 Concentration
                    </span>
                  </div>
                  <span
                    className={`font-bold ${result.isRugPullRisk ? "text-destructive" : "text-emerald-500"}`}
                  >
                    {result.topHoldersPercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-background flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">
                    Fresh Wallets (Top 5)
                  </span>
                  <span
                    className={`font-bold ${result.freshWalletsInTop5 >= 3 ? "text-destructive" : "text-foreground"}`}
                  >
                    {result.freshWalletsInTop5} / 5
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Social and Liquidity
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <div className="bg-background flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">
                        Liquidity (USD)
                      </span>
                    </div>
                    <span className="font-bold">
                      $
                      {result.liquidityUsd.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <BooleanRow label="Has Telegram" value={result.hasTelegram} />
                  <BooleanRow label="Has Twitter" value={result.hasTwitter} />
                </CardContent>
              </Card>

              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Trade Execution</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      disabled={buying}
                      placeholder="SOL Amount"
                    />
                    <Button
                      onClick={handleBuy}
                      disabled={buying || !address}
                      className="bg-primary hover:bg-primary/90 min-w-24"
                    >
                      {buying ? "Sending" : "Buy Now"}
                    </Button>
                  </div>
                  {txMessage && (
                    <div className="bg-muted rounded-lg p-3 text-sm break-all">
                      {txMessage}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card className="mt-6 md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Top 5 Holders Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {result.holdersList.map((holder, index) => (
                  <div
                    key={holder.address}
                    className="bg-background flex flex-col items-start justify-between gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 text-sm font-bold">
                        #{index + 1}
                        <a
                          href={`https://solscan.io/account/${holder.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-mono text-xs font-normal hover:underline"
                        >
                          {holder.address.slice(0, 6)}...
                          {holder.address.slice(-4)}
                        </a>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">
                          Wallet Age
                        </span>
                        <span
                          className={
                            holder.ageInDays < 2
                              ? "text-destructive font-bold"
                              : "font-bold text-emerald-500"
                          }
                        >
                          {holder.ageInDays < 1
                            ? "Under 24h"
                            : `${Math.floor(holder.ageInDays)} Days`}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">
                          SOL Balance
                        </span>
                        <span className="font-bold">
                          {holder.solBalance.toFixed(2)} SOL
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
