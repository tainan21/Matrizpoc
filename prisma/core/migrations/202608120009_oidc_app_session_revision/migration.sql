SET search_path TO "core";

ALTER TABLE "oidc_app_sessions"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
