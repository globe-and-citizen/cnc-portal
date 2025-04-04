-- CreateTable
CREATE TABLE "User" (
    "address" TEXT NOT NULL,
    "name" TEXT,
    "nonce" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "officerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberTeamsData" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "expenseAccountData" TEXT,
    "expenseAccountSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberTeamsData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wage" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "userAddress" TEXT NOT NULL,
    "cashRatePerHour" DOUBLE PRECISION NOT NULL,
    "tokenRatePerHour" DOUBLE PRECISION NOT NULL,
    "maximumHoursPerWeek" INTEGER NOT NULL,
    "nextWageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "hoursWorked" INTEGER,
    "signature" TEXT,
    "tokenTx" TEXT,
    "wageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userAddress" TEXT NOT NULL,
    "author" TEXT,
    "resource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamContract" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deployer" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardOfDirectorActions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MemberTeams" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MemberTeams_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MemberTeamsData_userAddress_teamId_key" ON "MemberTeamsData"("userAddress", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Wage_nextWageId_key" ON "Wage"("nextWageId");

-- CreateIndex
CREATE UNIQUE INDEX "Wage_teamId_userAddress_nextWageId_key" ON "Wage"("teamId", "userAddress", "nextWageId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamContract_address_key" ON "TeamContract"("address");

-- CreateIndex
CREATE INDEX "TeamContract_address_idx" ON "TeamContract"("address");

-- CreateIndex
CREATE INDEX "_MemberTeams_B_index" ON "_MemberTeams"("B");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wage" ADD CONSTRAINT "Wage_nextWageId_fkey" FOREIGN KEY ("nextWageId") REFERENCES "Wage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_wageId_fkey" FOREIGN KEY ("wageId") REFERENCES "Wage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
