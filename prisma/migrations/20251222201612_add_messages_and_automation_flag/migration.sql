-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "is_automation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sync_jobs" ADD COLUMN     "messages_synced" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "campaign_messages" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "was_opened" BOOLEAN NOT NULL DEFAULT false,
    "was_clicked" BOOLEAN NOT NULL DEFAULT false,
    "was_bounced" BOOLEAN NOT NULL DEFAULT false,
    "contact_id" TEXT,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_messages_pkey" PRIMARY KEY ("account_id","id")
);

-- CreateIndex
CREATE INDEX "campaign_messages_account_id_campaign_id_idx" ON "campaign_messages"("account_id", "campaign_id");

-- CreateIndex
CREATE INDEX "campaign_messages_account_id_sent_at_idx" ON "campaign_messages"("account_id", "sent_at");

-- CreateIndex
CREATE INDEX "campaign_messages_sent_at_idx" ON "campaign_messages"("sent_at");

-- CreateIndex
CREATE INDEX "campaigns_account_id_is_automation_idx" ON "campaigns"("account_id", "is_automation");

-- AddForeignKey
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_account_id_campaign_id_fkey" FOREIGN KEY ("account_id", "campaign_id") REFERENCES "campaigns"("account_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
