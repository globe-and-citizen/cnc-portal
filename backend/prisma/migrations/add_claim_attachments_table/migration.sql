-- Create ClaimAttachment table to store files directly in the database
CREATE TABLE "ClaimAttachment" (
    "id" SERIAL NOT NULL,
    "claimId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimAttachment_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint to Claim table
ALTER TABLE "ClaimAttachment" ADD CONSTRAINT "ClaimAttachment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index on claimId for faster queries
CREATE INDEX "ClaimAttachment_claimId_idx" ON "ClaimAttachment"("claimId");
