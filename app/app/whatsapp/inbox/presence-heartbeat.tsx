"use client";

import { useEffect, useState } from "react";
import { refreshMessagingOperatorPresence } from "@/app/actions/messaging-inbox";
import type { OperatorPresence } from "@/lib/messaging/inbox";

export function PresenceHeartbeat({
  presence,
  conversationId
}: {
  presence: OperatorPresence;
  conversationId: string | null;
}) {
  const [state, setState] = useState<"IDLE" | "SYNCED" | "FAILED">("IDLE");

  useEffect(() => {
    if (presence === "OFFLINE") return;
    let disposed = false;

    async function refresh() {
      const data = new FormData();
      data.set("presence", presence);
      if (conversationId) data.set("conversationId", conversationId);
      const result = await refreshMessagingOperatorPresence(data);
      if (!disposed) setState(result.ok ? "SYNCED" : "FAILED");
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [conversationId, presence]);

  return (
    <span aria-live="polite" style={{ color: state === "FAILED" ? "#b91c1c" : "#64748b", fontSize: 11 }}>
      {presence === "OFFLINE"
        ? "Presença offline"
        : state === "FAILED"
          ? "Presença sem sincronização"
          : "Presença sincronizada"}
    </span>
  );
}
