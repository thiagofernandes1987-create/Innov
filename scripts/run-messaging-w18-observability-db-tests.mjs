import { execFileSync } from "node:child_process";

const database = "innov_messaging_w18_observability";
const environment = {
  ...process.env,
  PGHOST: process.env.PGHOST ?? "127.0.0.1",
  PGPORT: process.env.PGPORT ?? "5432",
  PGUSER: process.env.PGUSER ?? "postgres",
  PGPASSWORD: process.env.PGPASSWORD ?? "postgres"
};
function psql(args) { execFileSync("psql", args, { stdio: "inherit", env: environment }); }
try {
  psql(["-d","postgres","-v","ON_ERROR_STOP=1","-c",`drop database if exists ${database}`]);
  psql(["-d","postgres","-v","ON_ERROR_STOP=1","-c",`create database ${database}`]);
  for (const file of [
    "supabase/tests/messaging-multiprovider/fixture.sql",
    "supabase/tests/messaging-multiprovider/legacy-seed.sql",
    "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
    "supabase/migrations/20260804230000_stage22_messaging_observability.sql",
    "supabase/tests/messaging-observability/observability.test.sql"
  ]) psql(["-d",database,"-v","ON_ERROR_STOP=1","-f",file]);
} finally {
  psql(["-d","postgres","-v","ON_ERROR_STOP=1","-c",`drop database if exists ${database} with (force)`]);
}
