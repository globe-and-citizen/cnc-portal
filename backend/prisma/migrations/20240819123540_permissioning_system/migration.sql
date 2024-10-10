-- AlterTable
ALTER TABLE "UserRoleEntitlement" ALTER COLUMN "value" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "MemberTeamsData" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "contract" TEXT,
    "memberSignature" TEXT,
    "ownerSignature" TEXT,

    CONSTRAINT "MemberTeamsData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberTeamsData_userAddress_teamId_key" ON "MemberTeamsData"("userAddress", "teamId");

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTeamsData" ADD CONSTRAINT "MemberTeamsData_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;