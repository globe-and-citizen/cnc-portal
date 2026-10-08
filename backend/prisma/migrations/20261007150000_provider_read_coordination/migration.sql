CREATE TABLE "ProviderReadCache" (
    "key" TEXT NOT NULL,
    "payload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderReadCache_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "ProviderReadCache_expiresAt_idx" ON "ProviderReadCache"("expiresAt");

CREATE TABLE "ProviderReadBudget" (
    "provider" TEXT NOT NULL,
    "nextRequestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "limitedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3),
    CONSTRAINT "ProviderReadBudget_pkey" PRIMARY KEY ("provider")
);
