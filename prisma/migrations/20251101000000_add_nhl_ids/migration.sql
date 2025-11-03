-- AlterTable
ALTER TABLE "Game" ADD COLUMN "nhlGamePk" INTEGER;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "nhlPlayerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Game_nhlGamePk_key" ON "Game"("nhlGamePk");

-- CreateIndex
CREATE UNIQUE INDEX "Player_nhlPlayerId_key" ON "Player"("nhlPlayerId");

-- CreateIndex
CREATE INDEX "Game_nhlGamePk_idx" ON "Game"("nhlGamePk");

-- CreateIndex
CREATE INDEX "Player_nhlPlayerId_idx" ON "Player"("nhlPlayerId");

