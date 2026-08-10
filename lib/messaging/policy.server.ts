import "server-only";

import {
  META_CLOUD_CAPABILITY_MATRIX,
  applyCapabilityOverrides,
  deriveMessagingUiCapabilities,
  requireEngineCapability,
  type EngineCapability
} from "@/lib/messaging/capabilities";
import { MessagingEngineError } from "@/lib/messaging/engine";
import { resolveProviderPolicy } from "@/lib/messaging/feature-flags";

export function resolveMetaCloudRuntimePolicy(organizationId: string) {
  const policy = resolveProviderPolicy({
    organizationId,
    providerType: "META_CLOUD",
    rawOverrides: process.env.MESSAGING_PROVIDER_FLAGS_JSON
  });
  const matrix = applyCapabilityOverrides(
    META_CLOUD_CAPABILITY_MATRIX,
    policy.disabledCapabilities
  );
  return {
    policy,
    matrix,
    ui: deriveMessagingUiCapabilities(matrix, policy.enabled)
  };
}

export function requireMetaCloudCapability(
  organizationId: string,
  capability: EngineCapability
) {
  const runtime = resolveMetaCloudRuntimePolicy(organizationId);
  if (!runtime.policy.configurationValid) {
    throw new MessagingEngineError(
      "PROVIDER_NOT_AVAILABLE",
      "A configuração de providers da organização é inválida."
    );
  }
  if (!runtime.policy.enabled) {
    throw new MessagingEngineError(
      "PROVIDER_NOT_AVAILABLE",
      "O provider Meta Cloud está desabilitado para esta organização."
    );
  }
  requireEngineCapability(runtime.matrix, capability);
  return runtime;
}
