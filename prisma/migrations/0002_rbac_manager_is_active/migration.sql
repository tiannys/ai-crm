-- AlterEnum: Add MANAGER to UserRole
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- AlterTable: Add is_active column to users
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
