import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PERSONAS_OPERACIONAIS } from "../lib/personas/catalog";

const MIGRATION =
  "supabase/migrations/20260728103000_operational_events_notifications.sql";
const PERFORMANCE_MIGRATION =
  "supabase/migrations/20260728143000_operational_notifications_performance.sql";
const CLIENT_ORIGIN_MIGRATION =
  "supabase/migrations/20260728150000_operational_client_event_origin.sql";

describe("contrato de personas no banco", () => {
  it("mantém os eventos pessimistas e destinatários no catálogo SQL", () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
    const sql = fs.readFileSync(MIGRATION, "utf8");

    for (const persona of PERSONAS_OPERACIONAIS) {
      expect(sql, persona.id).toContain(persona.scenarios.pessimistic.event);
      for (const destinatario of persona.scenarios.pessimistic.notify) {
        expect(sql, `${persona.id}:${destinatario}`).toContain(`'${destinatario}'`);
      }
    }
  });

  it("aplica as vacinas de segurança e idempotência", () => {
    const sql = fs.readFileSync(MIGRATION, "utf8");
    expect(sql).toMatch(/force row level security/gi);
    expect(sql).toMatch(/set search_path\s*=\s*public/gi);
    expect(sql).toMatch(/revoke all on function public\.create_operational_event/gi);
    expect(sql).toMatch(/deduplication_key/gi);
    expect(sql).toMatch(/on conflict/gi);
    expect(sql).toContain("references public.app_modules(key)");
    expect(sql).toContain("array_position(v_recipients, responsibility.persona_id)");
  });

  it("aplica a vacina do advisor sem alterar a autorização", () => {
    const sql = fs.readFileSync(PERFORMANCE_MIGRATION, "utf8");
    expect(sql).toContain("(select auth.uid())");
    expect(sql).toContain("operational_events_project_org_idx");
    expect(sql).toContain("operational_notifications_event_org_idx");
    expect(sql).toContain("operational_responsibilities_org_user_idx");
  });

  it("mantém cliente e profissões internas em fronteiras distintas", () => {
    const sql = fs.readFileSync(CLIENT_ORIGIN_MIGRATION, "utf8");
    expect(sql).toContain("(v_actor_persona = 'P15') <> (v_member_role = 'CLIENTE')");
    expect(sql).toContain("actor_user_id = (select auth.uid())");
    expect(sql).toContain("operational_responsibility_persona_guard");
  });
});
