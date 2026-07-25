# Etapa 20 — Correções dos achados da auditoria APEX V5.2.5

## Estado

**Seis dos sete achados abertos foram corrigidos e validados localmente. Um continua bloqueado por limite de escopo da sessão e está descrito com o comando pronto para execução.**

Auditoria de origem: `docs/ETAPA-20-AUDITORIA-APEX-V525.md`.
Verificações após as correções: 19/19. Testes: 48 → 80, com 10 → 14 arquivos.

## Achados corrigidos

### FND-0005 — antimalware em todos os uploads de usuário

Antes, `secureUpload` era chamado apenas no SAC. Agora os oito caminhos de upload de arquivo enviado por usuário passam pela quarentena, incluindo os dois não autenticados.

| Fluxo | Bucket | Autenticação |
| --- | --- | --- |
| Baixa financeira | `finance-attachments` | interna |
| Cotação do portal de fornecedor | `procurement-attachments` | **token, sem login** |
| Documento da qualidade | `quality-documents` | interna |
| Anexo de resposta de formulário | `quality-form-attachments` | interna, cliente e pública |
| Documento original de assinatura | `signature-artifacts` | interna |
| Evidência do signatário externo | `signature-artifacts` | **token, sem login** |
| Mídia do diário de obra | `daily-log-media` | interna |
| Documento de projeto | `project-documents` | interna |

Nenhum fluxo teve tipo ou tamanho estreitado. `secureUpload` passou a aceitar uma política por chamada (`allowedMimeTypes`, `maxBytes`, `requireContentSignature`), de modo que cada bucket mantém exatamente o que já aceitava:

- diário de obra continua aceitando qualquer tipo até 150 MB;
- documento de projeto continua aceitando qualquer tipo até 50 MB;
- formulário de qualidade e evidência de assinatura continuam aceitando HEIC.

HEIC e os formatos técnicos do canteiro não possuem assinatura de conteúdo conhecida. Para eles a verificação de magic bytes é dispensada explicitamente — o que não existia antes é a análise antimalware, e essa passou a ser obrigatória em todos os casos.

O PDF assinado e o JSON de trilha gerados pela própria aplicação em `finalizeAdvancedEnvelope` continuam sem análise, por serem saída do sistema e não entrada de usuário.

**Requisito operacional:** o `clamd` precisa aceitar streams do tamanho do maior fluxo (`StreamMaxLength` e `MaxScanSize` cobrindo 150 MB). Abaixo disso, uploads grandes falham fechado, que é o comportamento previsto pela arquitetura da fatia, mas o operador precisa dimensionar antes de habilitar em produção.

### FND-0002 — CSP aplicada

`Content-Security-Policy-Report-Only` passou a `Content-Security-Policy`. Três diretivas foram acrescentadas porque a política anterior, se aplicada como estava, quebraria a aplicação:

- `frame-src 'self' https://*.supabase.co` — a página de assinatura externa e a de documentos exibem o PDF em `iframe` apontando para URL assinada do storage; sem esta diretiva o fluxo de assinatura pararia;
- `media-src 'self' blob: https://*.supabase.co` — mídia do diário de obra;
- `worker-src 'self' blob:`.

**Limitação:** não há navegador neste ambiente. A política foi derivada de leitura do código, não de execução. Recomenda-se uma passagem em homologação pelas telas de assinatura, documentos e diário antes do go-live.

### FND-0007 — regressão de estado no webhook de assinatura

A decisão de aplicar ou não o status saiu do manipulador para `lib/signatures/webhook-state.ts`, com escala de progresso (`SENT` → `VIEWED` → `PARTIALLY_SIGNED` → `COMPLETED`) e desfechos terminais congelados (`COMPLETED`, `DECLINED`, `EXPIRED`, `CANCELED`).

Um evento válido entregue fora de ordem passa a ser registrado em `signature_events` e refletido na trilha, mas não rebaixa o envelope nem sobrescreve `contracts.status`. Os efeitos colaterais de `COMPLETED` — marcar versão e contrato como assinados e aplicar o aditivo — só ocorrem quando a transição é aceita.

Coberto por `tests/signature-webhook-state.test.ts`.

### FND-0008 — contadores atômicos

`register_quality_public_link_access` e `register_procurement_invitation_access` somam no banco. A aplicação deixou de ler, somar e regravar `access_count`. Ambas são `security definer` com `search_path` fixo, revogadas de `anon` e `authenticated` e concedidas apenas a `service_role`.

### FND-0010 — função de diagnóstico sem referência

`stage19_can_read_global_diagnostics()` foi removida. A migration verifica, ao final, que a função não existe mais e que as duas novas foram criadas.

Migration: `20260725120000_stage20_atomic_access_counters_and_cleanup.sql`. **Ainda não aplicada em homologação.**

### FND-0004 — cobertura dos controles de segurança

`safeFileName` e `canonicalJson` saíram de `lib/signatures/crypto.ts`, que importa `server-only` e por isso não podia ser exercitado em teste, para `lib/signatures/format.ts`. `crypto.ts` reexporta ambas, então nenhum consumidor mudou.

`tests/signature-format.test.ts` cobre travessia de caminho, aspas e quebras que escapariam de `Content-Disposition`, limite de comprimento e a estabilidade da serialização canônica que entra no hash da evidência de assinatura.

## Achado que continua aberto

### FND-0011 — ações de CI por tag mutável

Não corrigido. Fixar por SHA exige resolver o commit de `actions/checkout`, `actions/setup-node`, `actions/setup-python` e `actions/upload-artifact`, e o acesso a repositórios fora de `thiagofernandes1987-create/innov` é negado nesta sessão. Fixar por um valor não verificado quebraria todos os workflows.

Comando para quem tiver acesso:

```bash
for ref in actions/checkout@v6 actions/setup-node@v6 actions/setup-python@v6 actions/upload-artifact@v7; do
  repo="${ref%@*}"; tag="${ref#*@}"
  sha=$(gh api "repos/$repo/commits/$tag" --jq .sha)
  echo "$repo@$sha # $tag"
done
```

Em seguida, substituir cada `uses: <acao>@<tag>` por `uses: <acao>@<sha> # <tag>` nos oito workflows.

## Evidência de verificação

Os mesmos detectores determinísticos da rodada cega foram executados antes e depois:

| Detector | Antes | Depois |
| --- | --- | --- |
| D02 CSP aplicada | falha | passa |
| D03 gateway autentica antes de bufferizar | falha | passa |
| D04 uploads analisados | falha | passa |
| D09 contadores atômicos | falha | passa |
| D11 artefatos gerados ignorados | falha | passa |
| D12 controles cobertos por teste | falha | passa |
| D01 instalação congelada | falha | falha, por decisão registrada na VACINA-008 |
| D10 ações fixadas por commit | falha | falha, bloqueado por escopo da sessão |
| D08 e D13 | falha | falso positivo do detector, descrito abaixo |
| D14 função SQL órfã | falha | falso positivo em massa, já descrito na auditoria |

`D08` não reconhece o comentário de reserva que existe em `.env.example`. `D13` procura marcadores dentro do arquivo da rota e passou a não encontrá-los porque a guarda foi extraída para `lib/signatures/webhook-state.ts`, onde é testada. Nos dois casos o artefato está correto e o detector é que está defasado; nenhum deles foi ajustado para produzir um resultado favorável.

## Riscos residuais após as correções

| ID | Risco | Sev. |
| --- | --- | --- |
| RSK-0001 | `clamd` precisa ser dimensionado para 150 MB, senão uploads grandes do diário passam a falhar fechado | MEDIUM |
| RSK-0002 | CSP aplicada sem verificação em navegador | MEDIUM |
| RSK-0003 | Migration nova ainda não aplicada em homologação | MEDIUM |
| RSK-0004 | Instalação segue não congelada, conforme VACINA-008 | MEDIUM |
| RSK-0005 | Ações de CI seguem por tag mutável | LOW |
