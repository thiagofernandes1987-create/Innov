import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const EVIDENCE_PATH = process.env.WHATSAPP_TEST_EVIDENCE_PATH?.trim()
  || "whatsapp-meta-test-evidence.json";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`CONFIG_MISSING:${name}`);
  return value;
}

function digits(name) {
  const value = required(name).replace(/\D/g, "");
  if (!/^\d{5,30}$/.test(value)) throw new Error(`CONFIG_INVALID:${name}`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function maskPhone(value) {
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, digitsOnly.length - 4))}${digitsOnly.slice(-4)}`;
}

function safeProviderError(value, status) {
  const error = value && typeof value === "object" && value.error && typeof value.error === "object"
    ? value.error
    : {};
  return {
    httpStatus: status,
    code: String(error.code ?? status),
    subcode: error.error_subcode ?? null,
    type: error.type ?? null,
    traceIdHash: error.fbtrace_id ? sha256(String(error.fbtrace_id)) : null
  };
}

async function metaRequest(url, init, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (init.body) headers.set("content-type", "application/json");
    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const safe = safeProviderError(body, response.status);
      throw new Error(`META_REQUEST_FAILED:${JSON.stringify(safe)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (required("WHATSAPP_TEST_MODE").toLowerCase() !== "true") {
    throw new Error("TEST_MODE_NOT_CONFIRMED");
  }
  if (required("WHATSAPP_TEST_SEND_ENABLED").toLowerCase() !== "true") {
    throw new Error("TEST_SEND_NOT_ENABLED");
  }

  const apiVersion = required("WHATSAPP_GRAPH_API_VERSION");
  if (!/^v\d+\.\d+$/.test(apiVersion)) {
    throw new Error("CONFIG_INVALID:WHATSAPP_GRAPH_API_VERSION");
  }
  const token = required("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = digits("WHATSAPP_TEST_PHONE_NUMBER_ID");
  const recipient = digits("WHATSAPP_TEST_RECIPIENT");
  const templateName = process.env.WHATSAPP_TEST_TEMPLATE_NAME?.trim() || "hello_world";
  const languageCode = process.env.WHATSAPP_TEST_TEMPLATE_LANGUAGE?.trim() || "en_US";
  if (!/^[a-z0-9_]{2,80}$/.test(templateName)) throw new Error("CONFIG_INVALID:WHATSAPP_TEST_TEMPLATE_NAME");
  if (!/^[a-z]{2}_[A-Z]{2}$/.test(languageCode)) throw new Error("CONFIG_INVALID:WHATSAPP_TEST_TEMPLATE_LANGUAGE");

  const baseUrl = `https://graph.facebook.com/${apiVersion}`;
  const fields = "id,display_phone_number,verified_name,quality_rating";
  const phoneInfo = await metaRequest(
    `${baseUrl}/${encodeURIComponent(phoneNumberId)}?fields=${encodeURIComponent(fields)}`,
    { method: "GET" },
    token
  );

  if (String(phoneInfo.id ?? "") !== phoneNumberId) {
    throw new Error("META_PHONE_ID_MISMATCH");
  }
  const displayPhone = String(phoneInfo.display_phone_number ?? "");
  const displayDigits = displayPhone.replace(/\D/g, "");
  if (displayDigits && displayDigits === recipient) {
    throw new Error("TEST_RECIPIENT_EQUALS_SENDER");
  }

  const sent = await metaRequest(
    `${baseUrl}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode }
        }
      })
    },
    token
  );

  const providerMessageId = String(sent.messages?.[0]?.id ?? "");
  if (!providerMessageId) throw new Error("META_MESSAGE_NOT_ACCEPTED");

  const evidence = {
    schemaVersion: "1.0.0",
    executedAt: new Date().toISOString(),
    mode: "META_TEST_NUMBER",
    apiVersion,
    sender: {
      phoneNumberIdHash: sha256(phoneNumberId),
      displayPhoneMasked: maskPhone(displayPhone),
      verifiedNameHash: phoneInfo.verified_name ? sha256(String(phoneInfo.verified_name)) : null,
      qualityRating: phoneInfo.quality_rating ?? null
    },
    recipient: {
      phoneMasked: maskPhone(recipient),
      phoneHash: sha256(recipient)
    },
    message: {
      type: "template",
      templateName,
      languageCode,
      providerAccepted: true,
      providerMessageIdHash: sha256(providerMessageId)
    },
    deliveryReceiptObserved: false,
    inboundWebhookObserved: false,
    productionNumberUsed: false,
    baileysUsed: false
  };

  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    ok: true,
    mode: evidence.mode,
    sender: evidence.sender.displayPhoneMasked,
    recipient: evidence.recipient.phoneMasked,
    providerAccepted: true,
    evidencePath: EVIDENCE_PATH
  }));
}

main().catch(async error => {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const evidence = {
    schemaVersion: "1.0.0",
    executedAt: new Date().toISOString(),
    mode: "META_TEST_NUMBER",
    ok: false,
    errorCode: message.split(":", 1)[0],
    providerDetails: message.startsWith("META_REQUEST_FAILED:")
      ? JSON.parse(message.slice("META_REQUEST_FAILED:".length))
      : null,
    productionNumberUsed: false,
    baileysUsed: false
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 }).catch(() => undefined);
  console.error(JSON.stringify({ ok: false, errorCode: evidence.errorCode, evidencePath: EVIDENCE_PATH }));
  process.exit(1);
});
