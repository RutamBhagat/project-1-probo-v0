-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userIds" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userIds_key" ON "User"("userIds");
