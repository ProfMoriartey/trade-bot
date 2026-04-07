"use client";

import { useEffect, useState } from "react";
import { getRecentScans } from "~/actions/feed";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ShieldCheck, AlertTriangle, Clock, RefreshCw } from "lucide-react";

// Define the type based on your Drizzle schema
type TokenScan = {
  id: number;
  mintAddress: string;
  topHoldersPercentage: string | null;
  isRugPullRisk: boolean | null;
  hasTelegram: boolean | null;
  isMintRevoked: boolean | null;
  isFreezeRevoked: boolean | null;
  scannedAt: Date;
};

export default function LiveFeedPage() {
  const [scans, setScans] = useState<TokenScan[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchFeed = async () => {
    const res = await getRecentScans();
    if (res.success && res.data) {
      setScans(res.data);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchFeed();

    // Set up the active listener (polling every 3 seconds)
    let interval: NodeJS.Timeout;
    if (isPolling) {
      interval = setInterval(fetchFeed, 3000);
    }

    return () => clearInterval(interval);
  }, [isPolling]);

  return (
    <main className="container mx-auto max-w-5xl p-4 md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Live Token Feed
            </h1>
            <p className="text-muted-foreground mt-2">
              Actively listening for new liquidity pools.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={() => setIsPolling(!isPolling)}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                isPolling
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <RefreshCw
                className={`h-4 w-4 ${isPolling ? "animate-spin" : ""}`}
              />
              {isPolling ? "Listening" : "Paused"}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {scans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-muted-foreground py-12 pt-6 text-center">
                Waiting for new tokens to be detected...
              </CardContent>
            </Card>
          ) : (
            scans.map((scan) => {
              // Determine overall risk
              const isLowRisk = scan.hasTelegram && !scan.isRugPullRisk;

              return (
                <Card
                  key={scan.id}
                  className={`border-l-4 ${isLowRisk ? "border-l-emerald-500" : "border-l-destructive"}`}
                >
                  <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {scan.mintAddress.slice(0, 8)}...
                          {scan.mintAddress.slice(-6)}
                        </span>
                        {isLowRisk ? (
                          <Badge className="flex gap-1 bg-emerald-500 hover:bg-emerald-600">
                            <ShieldCheck className="h-3 w-3" /> Low Risk
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex gap-1">
                            <AlertTriangle className="h-3 w-3" /> High Risk
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-xs">
                        Detected:{" "}
                        {new Date(scan.scannedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={
                          scan.hasTelegram
                            ? "border-emerald-500 text-emerald-500"
                            : "border-destructive text-destructive"
                        }
                      >
                        TG: {scan.hasTelegram ? "Yes" : "No"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          scan.isMintRevoked
                            ? "border-emerald-500 text-emerald-500"
                            : "border-destructive text-destructive"
                        }
                      >
                        Mint: {scan.isMintRevoked ? "Revoked" : "Active"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          !scan.isRugPullRisk
                            ? "border-emerald-500 text-emerald-500"
                            : "border-destructive text-destructive"
                        }
                      >
                        Top 5: {scan.topHoldersPercentage}%
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://dexscreener.com/solana/${scan.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                      >
                        Chart
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
