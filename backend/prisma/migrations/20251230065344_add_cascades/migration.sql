-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userAddress_fkey";

-- DropForeignKey
ALTER TABLE "TeamContract" DROP CONSTRAINT "TeamContract_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamFunctionOverride" DROP CONSTRAINT "TeamFunctionOverride_functionName_fkey";

-- DropForeignKey
ALTER TABLE "TeamFunctionOverride" DROP CONSTRAINT "TeamFunctionOverride_teamId_fkey";

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamContract" ADD CONSTRAINT "TeamContract_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFunctionOverride" ADD CONSTRAINT "TeamFunctionOverride_functionName_fkey" FOREIGN KEY ("functionName") REFERENCES "GlobalSetting"("functionName") ON DELETE CASCADE ON UPDATE CASCADE;
