import { META_CLOUD_CAPABILITY_MATRIX } from "@/lib/messaging/capabilities";
import {
  MessagingEngineError,
  assertEngineCommand,
  type EngineSendCommand,
  type EngineSendResult,
  type MessagingEngine
} from "@/lib/messaging/engine";

export type MetaCloudTransport = {
  sendText(input: {
    phoneNumberId: string;
    to: string;
    body: string;
  }): Promise<string>;
  sendDocument(input: {
    phoneNumberId: string;
    to: string;
    link: string;
    fileName: string;
    caption?: string;
  }): Promise<string>;
  sendTemplate(input: {
    phoneNumberId: string;
    to: string;
    name: string;
    languageCode: string;
    parameters: string[];
  }): Promise<string>;
};

export class MetaCloudMessagingEngine implements MessagingEngine {
  readonly providerType = "META_CLOUD" as const;
  readonly capabilities = META_CLOUD_CAPABILITY_MATRIX;

  constructor(private readonly transport: MetaCloudTransport) {}

  async send(command: EngineSendCommand): Promise<EngineSendResult> {
    assertEngineCommand(this, command);
    const phoneNumberId = command.providerAccountId?.trim();
    const to = command.to.phoneE164 ?? command.to.normalizedId;
    if (!phoneNumberId || !to) {
      throw new MessagingEngineError(
        "INVALID_COMMAND",
        "A conta externa da Meta e o destinatário são obrigatórios."
      );
    }

    let providerMessageId: string;
    switch (command.messageType) {
      case "TEXT": {
        const body = command.content.text?.trim();
        if (!body) {
          throw new MessagingEngineError(
            "INVALID_COMMAND",
            "Mensagem de texto sem conteúdo."
          );
        }
        providerMessageId = await this.transport.sendText({
          phoneNumberId,
          to,
          body
        });
        break;
      }
      case "TEMPLATE": {
        const template = command.content.template;
        if (!template?.name || !template.languageCode) {
          throw new MessagingEngineError(
            "INVALID_COMMAND",
            "Comando de template incompleto."
          );
        }
        providerMessageId = await this.transport.sendTemplate({
          phoneNumberId,
          to,
          name: template.name,
          languageCode: template.languageCode,
          parameters: [...template.parameters]
        });
        break;
      }
      case "DOCUMENT": {
        const media = command.content.media?.find(item => item.mediaType === "DOCUMENT");
        if (!media?.reference || media.referenceType !== "SIGNED_URL") {
          throw new MessagingEngineError(
            "INVALID_COMMAND",
            "Documento deve chegar ao adapter como URL assinada temporária."
          );
        }
        providerMessageId = await this.transport.sendDocument({
          phoneNumberId,
          to,
          link: media.reference,
          fileName: media.fileName?.trim() || "documento",
          caption: media.caption ?? command.content.caption ?? undefined
        });
        break;
      }
      default:
        throw new MessagingEngineError(
          "INVALID_COMMAND",
          `O adapter Meta não implementa envio ${command.messageType}.`
        );
    }

    if (!providerMessageId) {
      throw new MessagingEngineError(
        "PROVIDER_REJECTED",
        "A Meta não retornou identificador da mensagem."
      );
    }

    return {
      providerType: this.providerType,
      providerMessageId,
      acceptedAt: new Date().toISOString(),
      providerMetadata: {
        providerType: this.providerType,
        schemaVersion: "meta-cloud-adapter-v1",
        attributes: {
          messageType: command.messageType,
          idempotencyKey: command.idempotencyKey
        }
      }
    };
  }
}
