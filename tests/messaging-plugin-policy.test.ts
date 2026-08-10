import { describe, expect, it } from "vitest";
import {
  CANONICAL_MESSAGE_PLUGIN_POLICIES,
  MessagePluginPolicyError,
  canonicalMessagePluginPolicy,
  normalizeMessagePluginPolicyRequest
} from "@/lib/messaging/plugin-policy";

describe("políticas canônicas de plugins", () => {
  it("mantém ordem única com IA obrigatoriamente por último", () => {
    expect(CANONICAL_MESSAGE_PLUGIN_POLICIES.map(policy => policy.priority)).toEqual([
      10, 20, 30, 40, 50, 60, 70, 1000
    ]);
    expect(new Set(CANONICAL_MESSAGE_PLUGIN_POLICIES.map(policy => policy.priority)).size).toBe(8);
    expect(CANONICAL_MESSAGE_PLUGIN_POLICIES.at(-1)?.pluginId).toBe("AI_FALLBACK");
  });

  it("torna consentimento anti-spam e handoff obrigatórios", () => {
    const mandatory = CANONICAL_MESSAGE_PLUGIN_POLICIES
      .filter(policy => policy.mandatory)
      .map(policy => policy.pluginId);
    expect(mandatory).toEqual(["CONSENT", "ANTI_SPAM", "HANDOFF"]);
    for (const pluginId of mandatory) {
      expect(() => normalizeMessagePluginPolicyRequest({ pluginId, enabled: false }))
        .toThrowError(MessagePluginPolicyError);
    }
  });

  it("ignora metadados do cliente ao normalizar estado opcional", () => {
    expect(normalizeMessagePluginPolicyRequest({
      pluginId: "QUALIFICATION",
      enabled: true
    })).toEqual({
      pluginId: "QUALIFICATION",
      enabled: true,
      priority: 30,
      mandatory: false,
      requiredPermission: "messaging.qualification",
      featureFlag: "MESSAGING_QUALIFICATION"
    });
  });

  it("mantém anti-spam sem feature flag para não permitir bypass", () => {
    expect(canonicalMessagePluginPolicy("ANTI_SPAM")).toMatchObject({
      priority: 20,
      mandatory: true,
      requiredPermission: null,
      featureFlag: null
    });
  });

  it("rejeita identificador fora do catálogo", () => {
    expect(() => canonicalMessagePluginPolicy("DELETE_DATABASE"))
      .toThrowError(/Plugin de mensagens inválido/);
  });
});
