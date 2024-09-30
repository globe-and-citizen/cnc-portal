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

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardOfDirectorActions" ADD CONSTRAINT "BoardOfDirectorActions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
