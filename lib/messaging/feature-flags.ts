import {
  CHANNEL_PROVIDER_TYPES,
  IMPLEMENTED_CHANNEL_PROVIDER_TYPES,
  type ChannelProviderType
} from "@/lib/messaging/domain";
import {
  ENGINE_CAPABILITIES,
  type EngineCapability
} from "@/lib/messaging/capabilities";

export type OrganizationProviderOverride = {
  enabled?: boolean;
  disabledCapabilities?: readonly EngineCapability[];
};

export type OrganizationProviderOverrides = Readonly<
  Record<string, Partial<Record<ChannelProviderType, OrganizationProviderOverride>>>
>;

export type ResolvedProviderPolicy = {
  organizationId: string;
  providerType: ChannelProviderType;
  requestedEnabled: boolean;
  runtimeAvailable: boolean;
  enabled: boolean;
  disabledCapabilities: readonly EngineCapability[];
  configurationValid: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === "object";
}

function validDisabledCapabilities(value: unknown): EngineCapability[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter(item => typeof item === "string")
      .filter(item => ENGINE_CAPABILITIES.includes(item as EngineCapability))
      .map(item => item as EngineCapability)
  )];
}

export function parseOrganizationProviderOverrides(
  raw: string | null | undefined
): { overrides: OrganizationProviderOverrides; valid: boolean } {
  if (!raw?.trim()) return { overrides: {}, valid: true };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return { overrides: {}, valid: false };

    const overrides: Record<
      string,
      Partial<Record<ChannelProviderType, OrganizationProviderOverride>>
    > = {};

    for (const [organizationId, organizationValue] of Object.entries(parsed)) {
      if (!organizationId.trim() || !isRecord(organizationValue)) continue;
      const providerOverrides: Partial<
        Record<ChannelProviderType, OrganizationProviderOverride>
      > = {};
      for (const [providerType, providerValue] of Object.entries(organizationValue)) {
        if (
          !CHANNEL_PROVIDER_TYPES.includes(providerType as ChannelProviderType) ||
          !isRecord(providerValue)
        ) {
          continue;
        }
        providerOverrides[providerType as ChannelProviderType] = {
          enabled:
            typeof providerValue.enabled === "boolean"
              ? providerValue.enabled
              : undefined,
          disabledCapabilities: validDisabledCapabilities(
            providerValue.disabledCapabilities
          )
        };
      }
      overrides[organizationId] = providerOverrides;
    }
    return { overrides, valid: true };
  } catch {
    return { overrides: {}, valid: false };
  }
}

export function resolveProviderPolicy(input: {
  organizationId: string;
  providerType: ChannelProviderType;
  rawOverrides?: string | null;
  runtimeProviderTypes?: readonly ChannelProviderType[];
}): ResolvedProviderPolicy {
  const parsed = parseOrganizationProviderOverrides(input.rawOverrides);
  const override = parsed.overrides[input.organizationId]?.[input.providerType];
  const runtimeProviderTypes =
    input.runtimeProviderTypes ?? IMPLEMENTED_CHANNEL_PROVIDER_TYPES;
  const runtimeAvailable = runtimeProviderTypes.includes(input.providerType);
  const defaultEnabled = input.providerType === "META_CLOUD";
  const requestedEnabled = override?.enabled ?? defaultEnabled;

  return {
    organizationId: input.organizationId,
    providerType: input.providerType,
    requestedEnabled,
    runtimeAvailable,
    enabled: parsed.valid && requestedEnabled && runtimeAvailable,
    disabledCapabilities: override?.disabledCapabilities ?? [],
    configurationValid: parsed.valid
  };
}

export function resolveOrganizationProviderPolicies(input: {
  organizationId: string;
  rawOverrides?: string | null;
  runtimeProviderTypes?: readonly ChannelProviderType[];
}) {
  return Object.fromEntries(
    CHANNEL_PROVIDER_TYPES.map(providerType => [
      providerType,
      resolveProviderPolicy({
        ...input,
        providerType
      })
    ])
  ) as Record<ChannelProviderType, ResolvedProviderPolicy>;
}
