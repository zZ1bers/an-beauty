-- Optional master copy/photo defaults + homepage visibility flag
ALTER TABLE "MasterProfile" ALTER COLUMN "roleRu" SET DEFAULT '';
ALTER TABLE "MasterProfile" ALTER COLUMN "roleDe" SET DEFAULT '';
ALTER TABLE "MasterProfile" ALTER COLUMN "bioRu" SET DEFAULT '';
ALTER TABLE "MasterProfile" ALTER COLUMN "bioDe" SET DEFAULT '';
ALTER TABLE "MasterProfile" ALTER COLUMN "imageUrl" SET DEFAULT '';

ALTER TABLE "MasterProfile" ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT true;
