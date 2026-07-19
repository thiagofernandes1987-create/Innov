import "server-only";
import { randomUUID } from "node:crypto";

export type SignatureProviderName = "sandbox" | "clicksign" | "zapsign" | "docusign";

export type SignatureSignerInput = {
  name: string;
  email: string;
  role?: string;
  order: number;
};

export type CreateEnvelopeInput = {
  documentPath: string;
  documentSha256: string;
  signers: SignatureSignerInput[];
  callbackUrl: string;
  idempotencyKey: string;
};

export type SignatureEnvelopeResult = {
  externalId: string;
  status: "DRAFT" | "SENT";
  signingUrl?: string;
  providerPayload: Record<string, unknown>;
};

export interface SignatureProviderAdapter {
  readonly name: SignatureProviderName;
  readonly hasExternalLegalValidity: boolean;
  createEnvelope(input: CreateEnvelopeInput): Promise<SignatureEnvelopeResult>;
  cancelEnvelope(externalId: string): Promise<void>;
}

class SandboxSignatureProvider implements SignatureProviderAdapter {
  readonly name = "sandbox" as const;
  readonly hasExternalLegalValidity = false;

  async createEnvelope(input: CreateEnvelopeInput): Promise<SignatureEnvelopeResult> {
    const externalId = `sandbox_${randomUUID()}`;
    return {
      externalId,
      status: "SENT",
      signingUrl: `/app/assinaturas/sandbox/${externalId}`,
      providerPayload: {
        sandbox: true,
        legalValidity: "none",
        documentPath: input.documentPath,
        documentSha256: input.documentSha256,
        signerCount: input.signers.length,
        idempotencyKey: input.idempotencyKey
      }
    };
  }

  async cancelEnvelope(): Promise<void> {
    return;
  }
}

class UnconfiguredExternalProvider implements SignatureProviderAdapter {
  readonly hasExternalLegalValidity = true;

  constructor(readonly name: Exclude<SignatureProviderName, "sandbox">) {}

  async createEnvelope(): Promise<SignatureEnvelopeResult> {
    throw new Error(`O provider ${this.name} ainda não possui credenciais e adapter habilitado.`);
  }

  async cancelEnvelope(): Promise<void> {
    throw new Error(`O provider ${this.name} ainda não possui credenciais e adapter habilitado.`);
  }
}

export function getSignatureProvider(): SignatureProviderAdapter {
  const provider = (process.env.SIGNATURE_PROVIDER ?? "sandbox").toLowerCase() as SignatureProviderName;

  switch (provider) {
    case "sandbox":
      return new SandboxSignatureProvider();
    case "clicksign":
    case "zapsign":
    case "docusign":
      return new UnconfiguredExternalProvider(provider);
    default:
      throw new Error(`SIGNATURE_PROVIDER inválido: ${provider}`);
  }
}
