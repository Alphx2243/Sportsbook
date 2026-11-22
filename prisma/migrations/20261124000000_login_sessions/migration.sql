CREATE TABLE "LoginSession" (
  "tokenHash" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LoginSession_expiresAt_idx" ON "LoginSession"("expiresAt");
CREATE INDEX "LoginSession_userId_idx" ON "LoginSession"("userId");
