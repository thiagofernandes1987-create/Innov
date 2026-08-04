import "server-only";

import {
  sendWhatsAppDocument,
  sendWhatsAppTemplate,
  sendWhatsAppText
} from "@/lib/whatsapp/client";
import { MetaCloudMessagingEngine } from "@/lib/messaging/engines/meta-cloud";

export function createMetaCloudMessagingEngine() {
  return new MetaCloudMessagingEngine({
    sendText: sendWhatsAppText,
    sendDocument: sendWhatsAppDocument,
    sendTemplate: sendWhatsAppTemplate
  });
}
