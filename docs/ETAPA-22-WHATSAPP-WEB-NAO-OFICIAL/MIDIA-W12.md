# W-12 — Mídia segura

## Estado

Concluída com arquivos e scanners sintéticos, reutilizando as fronteiras da Etapa 20.

## Fluxo

```text
stream binário limitado
  -> SHA-256 incremental
  -> assinatura real/MIME
  -> storage privado de quarentena
  -> antivírus
  -> BLOCKED ou promoção CLEAN
  -> metadata redaction
  -> URL assinada temporária
```

## Garantias

- `MediaReference` guarda referências, nunca base64 persistente;
- limite de 25 MiB aplicado durante o streaming;
- tamanho esperado detecta truncamento;
- MIME declarado é comparado à assinatura real;
- nome de arquivo é sanitizado;
- hash e tamanho permitem deduplicação por organização;
- malware permanece em quarentena e nunca recebe clean path;
- somente `CLEAN` pode gerar URL assinada;
- thumbnail, OCR e transcrição dependem de política explícita;
- metadata sensível pode ser removida durante a promoção;
- RLS forçada e RPCs técnicas;
- infraestrutura `lib/file-security/server.ts` da Etapa 20 é a implementação de referência para quarentena e ClamAV.

## Artefatos

- `apps/messaging-gateway/src/media/**`;
- migration `20260804170000_stage22_secure_media.sql`;
- `supabase/tests/messaging-media/media.test.sql`;
- `scripts/run-messaging-w12-media-db-tests.mjs`;
- `scripts/validate-messaging-w12-media.mjs`;
- `tests/messaging-media.test.ts`.

## Limites

Nenhuma mídia real foi baixada de WhatsApp. Storage e antivírus reais permanecem atrás de portas já existentes e dependem de ambiente autorizado.
