-- Run once as postgres superuser to create the app role + database:
--   psql -U postgres -f scripts/setup-db.sql
-- Or with full path on Windows:
--   "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f scripts/setup-db.sql

CREATE USER anbeauty WITH PASSWORD 'anbeauty';
CREATE DATABASE anbeauty OWNER anbeauty;
GRANT ALL PRIVILEGES ON DATABASE anbeauty TO anbeauty;

\c anbeauty
GRANT ALL ON SCHEMA public TO anbeauty;
ALTER SCHEMA public OWNER TO anbeauty;
