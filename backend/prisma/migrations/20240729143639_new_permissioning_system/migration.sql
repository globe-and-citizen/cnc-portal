-- CreateTable
CREATE TABLE "RoleCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "RoleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roleCategoryId" INTEGER NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitlementType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" TEXT,

    CONSTRAINT "EntitlementType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" SERIAL NOT NULL,
    "entitlementTypeId" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "roleCategoryId" INTEGER,
    "roleId" INTEGER,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleEntitlement" (
    "id" SERIAL NOT NULL,
    "userRoleId" INTEGER NOT NULL,
    "entitlementId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION,
    "lastPayDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleCategory_name_key" ON "RoleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_roleCategoryId_key" ON "Role"("name", "roleCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EntitlementType_name_key" ON "EntitlementType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userAddress_roleId_key" ON "UserRole"("userAddress", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleEntitlement_userRoleId_entitlementId_key" ON "UserRoleEntitlement"("userRoleId", "entitlementId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_roleCategoryId_fkey" FOREIGN KEY ("roleCategoryId") REFERENCES "RoleCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_roleCategoryId_fkey" FOREIGN KEY ("roleCategoryId") REFERENCES "RoleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_entitlementTypeId_fkey" FOREIGN KEY ("entitlementTypeId") REFERENCES "EntitlementType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleEntitlement" ADD CONSTRAINT "UserRoleEntitlement_userRoleId_fkey" FOREIGN KEY ("userRoleId") REFERENCES "UserRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleEntitlement" ADD CONSTRAINT "UserRoleEntitlement_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
