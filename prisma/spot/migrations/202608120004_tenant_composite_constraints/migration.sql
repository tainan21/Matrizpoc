SET search_path TO "spot";

ALTER TABLE "artist_profiles" DROP CONSTRAINT "artist_profiles_bandId_fkey";
ALTER TABLE "gigs" DROP CONSTRAINT "gigs_bandId_fkey";
ALTER TABLE "gig_bookings" DROP CONSTRAINT "gig_bookings_gigId_fkey";
DROP INDEX "artist_profiles_bandId_idx";
DROP INDEX "gigs_bandId_idx";
DROP INDEX "gig_bookings_gigId_idx";

CREATE UNIQUE INDEX "bands_tenantId_id_key" ON "bands"("tenantId", "id");
CREATE UNIQUE INDEX "gigs_tenantId_id_key" ON "gigs"("tenantId", "id");
CREATE INDEX "artist_profiles_tenantId_bandId_idx" ON "artist_profiles"("tenantId", "bandId");
CREATE INDEX "gigs_tenantId_bandId_idx" ON "gigs"("tenantId", "bandId");
CREATE INDEX "gig_bookings_tenantId_gigId_idx" ON "gig_bookings"("tenantId", "gigId");

ALTER TABLE "artist_profiles" ADD CONSTRAINT "artist_profiles_tenantId_bandId_fkey" FOREIGN KEY ("tenantId", "bandId") REFERENCES "bands"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gigs" ADD CONSTRAINT "gigs_tenantId_bandId_fkey" FOREIGN KEY ("tenantId", "bandId") REFERENCES "bands"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gig_bookings" ADD CONSTRAINT "gig_bookings_tenantId_gigId_fkey" FOREIGN KEY ("tenantId", "gigId") REFERENCES "gigs"("tenantId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
