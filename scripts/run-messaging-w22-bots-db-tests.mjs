import { execFileSync } from "node:child_process";

const database = "innov_messaging_w22_bots";
const environment = {
  ...process.env,
  PGHOST: process.env.PGHOST ?? "127.0.0.1",
  PGPORT: process.env.PGPORT ?? "5432",
  PGUSER: process.env.PGUSER ?? "postgres",
  PGPASSWORD: process.env.PGPASSWORD ?? "postgres"
};
function psql(args) {
  execFileSync("psql", args, { stdio: "inherit", env: environment });
}
try {
  psql(["-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists ${database}`]);
  psql(["-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `create database ${database}`]);
  for (const file of [
    "supabase/tests/messaging-multiprovider/fixture.sql",
    "supabase/tests/messaging-multiprovider/legacy-seed.sql",
    "supabase/tests/messaging-bots/fixture.sql",
    "supabase/migrations/20260804011500_stage22_multiprovider_storage.sql",
    "supabase/migrations/20260804175900_stage22_inbox_precompat.sql",
    "supabase/migrations/20260804180000_stage22_multiprovider_inbox.sql",
    "supabase/migrations/20260804200000_stage22_ai_bridge.sql",
    "supabase/migrations/20260804210000_stage22_message_plugins.sql",
    "supabase/migrations/20260805003000_stage22_governed_bot_profiles.sql",
    "supabase/tests/messaging-bots/bots.test.sql"
  ]) psql(["-d", database, "-v", "ON_ERROR_STOP=1", "-f", file]);
} finally {
  psql(["-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists ${database} with (force)`]);
}
