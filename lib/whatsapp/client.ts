import "server-only";

import { WhatsAppDomainError } from "@/lib/whatsapp/domain";

type ProviderError = {
  code?: number;
  message?: string;
  error_subcode?: number;
  type?: string;
};

type ProviderResponse = {
  messages?: Array<{ id?: string }>;
  success?: boolean;
  error?: ProviderError;
};

type TemplateRequest = {
  phoneNumberId: string;
  to: string;
  name: string;
  languageCode: string;
  parameters: string[];
};

export type WhatsAppPhoneInfo = {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
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

async function requestMeta<T>(
  resource: string,
  init: RequestInit,
  event: string
): Promise<{ data: T; error: ProviderError | null }> {
  const { version, token } = configuration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${resource.replace(/^\/+/, "")}`,
      {
        ...init,
        headers,
        cache: "no-store",
        signal: controller.signal
      }
    );
    const result = (await response.json().catch(() => ({}))) as T & {
      error?: ProviderError;
    };
    if (!response.ok) {
      const providerError = result.error ?? null;
      console.error(
        JSON.stringify({
          event,
          code: String(providerError?.code ?? response.status),
          subcode: providerError?.error_subcode ?? null,
          type: providerError?.type ?? null
        })
      );
      return { data: result, error: providerError ?? { code: response.status } };
    }
    return { data: result, error: null };
  } catch (error) {
    if (error instanceof WhatsAppDomainError) throw error;
    console.error(
      JSON.stringify({
        event: `${event}.unavailable`,
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

async function send(phoneNumberId: string, payload: Record<string, unknown>) {
  const result = await requestMeta<ProviderResponse>(
    `${encodeURIComponent(phoneNumberId)}/messages`,
    { method: "POST", body: JSON.stringify(payload) },
    "whatsapp.provider.send_failed"
  );
  const providerMessageId = result.data.messages?.[0]?.id;
  if (result.error || !providerMessageId) {
    throw new WhatsAppDomainError(
      "PROVIDER_ERROR",
      "O WhatsApp não aceitou a mensagem. Verifique a configuração e tente novamente."
    );
  }
  return providerMessageId;
}

export async function verifyWhatsAppPhoneNumber(phoneNumberId: string) {
  const fields = "id,display_phone_number,verified_name,quality_rating";
  const result = await requestMeta<WhatsAppPhoneInfo>(
    `${encodeURIComponent(phoneNumberId)}?fields=${encodeURIComponent(fields)}`,
    { method: "GET" },
    "whatsapp.provider.verify_phone_failed"
  );
  if (result.error || !result.data.id) {
    throw new WhatsAppDomainError(
      "PROVIDER_ERROR",
      "O número não pôde ser validado na Meta."
    );
  }
  return result.data;
}

export async function registerWhatsAppPhoneNumber(input: {
  phoneNumberId: string;
  pin: string;
}) {
  const result = await requestMeta<ProviderResponse>(
    `${encodeURIComponent(input.phoneNumberId)}/register`,
    {
      method: "POST",
      body: JSON.stringify({ messaging_product: "whatsapp", pin: input.pin })
    },
    "whatsapp.provider.register_phone_failed"
  );
  if (!result.error) return { alreadyRegistered: false };
  if (/already.*registered/i.test(String(result.error.message ?? ""))) {
    return { alreadyRegistered: true };
  }
  throw new WhatsAppDomainError(
    "PROVIDER_ERROR",
    "O número foi validado, mas não pôde ser registrado para receber mensagens."
  );
}

export async function subscribeWhatsAppBusinessAccount(wabaId: string) {
  const result = await requestMeta<ProviderResponse>(
    `${encodeURIComponent(wabaId)}/subscribed_apps`,
    { method: "POST" },
    "whatsapp.provider.subscribe_waba_failed"
  );
  if (result.error) {
    throw new WhatsAppDomainError(
      "PROVIDER_ERROR",
      "A conta empresarial não pôde ser vinculada ao aplicativo da Meta."
    );
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
