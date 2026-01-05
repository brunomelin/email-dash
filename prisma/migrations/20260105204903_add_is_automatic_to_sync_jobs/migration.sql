-- AlterTable
ALTER TABLE "sync_jobs" ADD COLUMN     "is_automatic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "sync_jobs_is_automatic_finished_at_idx" ON "sync_jobs"("is_automatic", "finished_at");
