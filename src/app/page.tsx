"use client";

import { useState } from "react";
import { scanAndSaveToken } from "~/actions/scan";
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
  Send,
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
};

export default function Dashboard() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanData | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setLoading(true);
    setError(null);
    setResult(null);

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
            Analyze Solana contracts for rug pull risks and social proof.
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
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !address}>
                {loading ? (
                  "Scanning..."
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Social & Liquidity</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="bg-background flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Liquidity (USD)</span>
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
          </div>
        )}
      </div>
    </main>
  );
}
