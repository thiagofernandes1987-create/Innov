import "server-only";

import { WhatsAppDomainError } from "@/lib/whatsapp/domain";

type ProviderResponse = {
  messages?: Array<{ id?: string }>;
  error?: {
    code?: number;
    message?: string;
    error_subcode?: number;
    type?: string;
  };
};

type TemplateRequest = {
  phoneNumberId: string;
  to: string;
  name: string;
  languageCode: string;
  parameters: string[];
};

function configuration() {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  if (!version || !token) {
    throw new WhatsAppDomainError(
      "PROVIDER_NOT_CONFIGURED",
      "A integração oficial do WhatsApp ainda não foi configurada."
    );
  }
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new WhatsAppDomainError(
      "PROVIDER_NOT_CONFIGURED",
      "A versão da Graph API configurada é inválida."
    );
  }
  return { version, token };
}

async function send(phoneNumberId: string, payload: Record<string, unknown>) {
  const { version, token } = configuration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal
      }
    );
    const result = (await response.json().catch(() => ({}))) as ProviderResponse;
    const providerMessageId = result.messages?.[0]?.id;
    if (!response.ok || !providerMessageId) {
      const code = String(result.error?.code ?? response.status);
      console.error(
        JSON.stringify({
          event: "whatsapp.provider.send_failed",
          code,
          subcode: result.error?.error_subcode ?? null,
          type: result.error?.type ?? null
        })
      );
      throw new WhatsAppDomainError(
        "PROVIDER_ERROR",
        "O WhatsApp não aceitou a mensagem. Verifique a configuração e tente novamente."
      );
    }
    return providerMessageId;
  } catch (error) {
    if (error instanceof WhatsAppDomainError) throw error;
    console.error(
      JSON.stringify({
        event: "whatsapp.provider.unavailable",
        reason: error instanceof Error ? error.name : "UNKNOWN"
      })
    );
    throw new WhatsAppDomainError(
      "PROVIDER_ERROR",
      "O serviço do WhatsApp está indisponível no momento."
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function sendWhatsAppText(input: {
  phoneNumberId: string;
  to: string;
  body: string;
}) {
  return send(input.phoneNumberId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "text",
    text: { preview_url: false, body: input.body }
  });
}

export function sendWhatsAppDocument(input: {
  phoneNumberId: string;
  to: string;
  link: string;
  fileName: string;
  caption?: string;
}) {
  return send(input.phoneNumberId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "document",
    document: {
      link: input.link,
      filename: input.fileName,
      caption: input.caption || undefined
    }
  });
}

export function sendWhatsAppTemplate(input: TemplateRequest) {
  return send(input.phoneNumberId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "template",
    template: {
      name: input.name,
      language: { code: input.languageCode },
      components: input.parameters.length
        ? [
            {
              type: "body",
              parameters: input.parameters.map(text => ({ type: "text", text }))
            }
          ]
        : undefined
    }
  });
}
