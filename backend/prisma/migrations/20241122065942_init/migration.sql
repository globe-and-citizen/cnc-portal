-- CreateTable
CREATE TABLE "TeamContract" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deployer" TEXT NOT NULL,
    "admins" TEXT[],
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "TeamContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamContract_address_key" ON "TeamContract"("address");

-- CreateIndex
CREATE INDEX "TeamContract_address_idx" ON "TeamContract"("address");

-- AddForeignKey
ALTER TABLE "TeamContract" ADD CONSTRAINT "TeamContract_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
