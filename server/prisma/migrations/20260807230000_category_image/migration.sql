-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';

-- Temporary lavender cover for all existing categories (admin can replace later)
UPDATE "ServiceCategory"
SET "imageUrl" = 'https://images.unsplash.com/photo-1499002238440-d264edd948ad?w=900&q=80'
WHERE "imageUrl" = '';
