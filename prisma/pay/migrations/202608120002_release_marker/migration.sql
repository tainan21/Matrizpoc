CREATE TABLE "__matriz_schema_releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "__matriz_schema_releases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "__matriz_schema_releases_version_key" ON "__matriz_schema_releases"("version");
