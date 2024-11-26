-- CreateTable
CREATE TABLE "User" (
    "address" TEXT NOT NULL,
    "name" TEXT,
    "nonce" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "bankAddress" TEXT,
    "votingAddress" TEXT,
    "boardOfDirectorsAddress" TEXT,
    "expenseAccountAddress" TEXT,
    "officerAddress" TEXT,
    "expenseAccountEip712Address" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberTeamsData" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "expenseAccountData" TEXT,
    "expenseAccountSignature" TEXT,
    "hourlyRate" INTEGER,
    "maxHoursPerWeek" INTEGER,

    CONSTRAINT "MemberTeamsData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "hoursWorked" INTEGER,
    "cashRemunerationSignature" TEXT,
    "memberTeamsDataId" INTEGER NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author" TEXT,
    "resource" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "BoardOfDirectorActions" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "targetAddress" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "isExecuted" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardOfDirectorActions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberTeams" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MemberTeamsData_userAddress_teamId_key" ON "MemberTeamsData"("userAddress", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamContract_address_key" ON "TeamContract"("address");

-- CreateIndex
CREATE INDEX "TeamContract_address_idx" ON "TeamContract"("address");

-- CreateIndex
CREATE UNIQUE INDEX "_MemberTeams_AB_unique" ON "_MemberTeams"("A", "B");

-- CreateIndex
CREATE INDEX "_MemberTeams_B_index" ON "_MemberTeams"("B");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_memberTeamsDataId_fkey" FOREIGN KEY ("memberTeamsDataId") REFERENCES "MemberTeamsData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamContract" ADD CONSTRAINT "TeamContract_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberTeams" ADD CONSTRAINT "_MemberTeams_A_fkey" FOREIGN KEY ("A") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MemberTeams" ADD CONSTRAINT "_MemberTeams_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;
