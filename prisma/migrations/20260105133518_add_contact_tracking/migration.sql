-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "contact_count" INTEGER DEFAULT 0,
ADD COLUMN     "contact_limit" INTEGER,
ADD COLUMN     "last_contact_sync" TIMESTAMP(3);
