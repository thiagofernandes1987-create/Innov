# Etapa 20 — Proteção e análise de anexos

## Estado

**Pipeline integrado ao SAC na branch da Etapa 20; E2E local do ClamAV aprovado. Migration e provider real de homologação ainda precisam ser ativados antes do deploy da branch.**

## Objetivo

Impedir que um arquivo enviado por usuário seja disponibilizado no bucket funcional antes de autorização, validação de tipo, assinatura do conteúdo, tamanho, hash e análise antimalware.

## Arquitetura

```text
upload autorizado
→ validação central de nome, MIME, tamanho e assinatura do conteúdo
→ bucket privado file-quarantine
→ manifesto PENDING
→ estado SCANNING
→ ClamAV INSTREAM
→ CLEAN: promoção ao bucket definitivo
→ registro transacional no SAC com scanId/provider/scannedAt
→ BLOCKED: retenção isolada no prefixo blocked
→ ERROR/timeout: fail-closed e arquivo não liberado
```

O registro em `sac_ticket_attachments` só ocorre depois da promoção de um arquivo `CLEAN`. Se a RPC de registro falhar, o objeto promovido é removido.

## Escopo incluído

- política central de tipos e tamanho máximo;
- normalização do nome de arquivo;
- verificação de assinatura PDF, JPEG, PNG, WebP e OOXML;
- SHA-256 calculado antes da promoção;
- bucket de quarentena obrigatoriamente privado;
- manifesto JSON por análise;
- provider ClamAV por protocolo `INSTREAM`;
- timeout configurável;
- promoção somente após resultado `CLEAN`;
- bloqueio e retenção isolada quando assinatura for encontrada;
- erro fail-closed quando o scanner estiver indisponível;
- provider `test-clean` restrito a teste controlado;
- integração dos uploads internos e do portal do SAC;
- persistência de `security_status`, `security_scan_id`, `security_provider` e `security_scanned_at`;
- downloads do portal limitados a anexos `CLEAN`;
- arquivos anteriores identificados como `LEGACY` e visíveis apenas à equipe autorizada;
- estado visual acessível, com texto além da cor;
- E2E com arquivo limpo e EICAR bloqueado.

## Fora do escopo desta fatia

- provisionamento do provider real ClamAV;
- aplicação da migration em homologação;
- integração dos uploads de documentos, qualidade, compras, financeiro, assinatura e diário;
- retenção jurídica de arquivos bloqueados;
- interface administrativa de quarentena;
- reprocessamento assíncrono;
- métricas e alertas externos;
- liberação manual por administrador;
- reanálise dos objetos `LEGACY` já existentes.

## Tipos permitidos no SAC

```text
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
image/jpeg
image/png
image/webp
```

A biblioteca transversal também reconhece XLSX, mas o bucket e o fluxo do SAC mantêm uma allowlist mais restrita.

Limite canônico inicial:

```text
25 MB
```

## Variáveis

```env
FILE_SECURITY_PROVIDER=clamav
FILE_SECURITY_QUARANTINE_BUCKET=file-quarantine
CLAMAV_HOST=
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=15000
ALLOW_INSECURE_FILE_SCANNER=false
```

`ALLOW_INSECURE_FILE_SCANNER=true` é proibida em produção e existe somente para testes controlados.

## Segurança

- autorização do SAC acontece antes da leitura integral do arquivo;
- Service Role permanece somente no servidor;
- bucket de quarentena é privado;
- usuário não recebe URL do objeto pendente ou bloqueado;
- arquivo só existe no bucket funcional depois de `CLEAN`;
- MIME e tamanho são validados;
- assinatura dos bytes precisa corresponder ao formato declarado;
- nome fornecido pelo usuário não controla o caminho final;
- hash é calculado sobre os bytes recebidos;
- scanner indisponível não libera o arquivo;
- malware detectado não é promovido;
- resposta desconhecida do scanner resulta em `ERROR`;
- paths usam UUID e organização;
- valores de configuração não aparecem no manifesto;
- falha após promoção remove o objeto do bucket definitivo;
- portal não recebe anexos `LEGACY`;
- URL de download é assinada por 60 segundos e usa `Cache-Control: private, no-store`.

## Modelo de dados

Migration:

```text
supabase/migrations/20260722104500_stage20_sac_attachment_security.sql
```

Campos adicionados:

```text
security_status      LEGACY | CLEAN
security_scan_id     UUID do manifesto
security_provider    clamav | test-clean
security_scanned_at  instante da conclusão
```

Anexos antigos recebem `LEGACY` sem serem falsamente classificados como analisados. Novos registros exigem evidência completa de scan `CLEAN` na RPC.

## UI/UX Pro Max

Estados usam texto e semântica, não apenas cor:

- `Legado não analisado`;
- `Aguardando análise`;
- `Analisando arquivo`;
- `Arquivo liberado`;
- `Arquivo bloqueado`;
- `Análise indisponível`.

O componente usa `role=status`; `SCANNING` possui `aria-live=polite`. As ações foram renomeadas para **Analisar e enviar**, e os bloqueios não revelam detalhes técnicos da assinatura ao cliente.

## Arquivos

```text
lib/file-security/domain.ts
lib/file-security/server.ts
components/file-security/file-security-status.tsx
app/actions/relationship.ts
app/api/sac/attachments/[id]/route.ts
app/app/ocorrencias/[id]/page.tsx
app/cliente/ocorrencias/[id]/page.tsx
scripts/run-stage20-file-security-e2e.mjs
.github/workflows/stage20-file-security-e2e.yml
.github/workflows/stage20-file-security-provider-health.yml
supabase/migrations/20260722104500_stage20_sac_attachment_security.sql
tests/file-security.test.ts
```

## Testes

### Unitários

- sanitização de filename;
- tipo permitido e rejeitado;
- tamanho máximo;
- assinatura PDF válida;
- MIME divergente dos bytes;
- estrutura mínima DOCX;
- resposta ClamAV `OK`;
- resposta ClamAV `FOUND`;
- resposta desconhecida fail-closed.

### E2E local do scanner

- workflow: `Stage 20 File Security E2E`;
- run: `29913332621`;
- artefato: `8526808218`;
- imagem oficial: `clamav/clamav:1.4`;
- `PING` → `PONG`;
- fixture limpa → `CLEAN`;
- EICAR → `BLOCKED`;
- resultado: aprovado.

O E2E usa EICAR apenas como arquivo-padrão inofensivo de validação antimalware em ambiente isolado.

### Provider real

O workflow manual `Stage 20 File Security Provider Health` executa `PING` e scan limpo no ambiente protegido `homologation`. Sem `CLAMAV_HOST`, registra `blocked_missing_secrets` e encerra sem alterar dados.

## Próximos passos

1. provisionar endpoint ClamAV privado e acessível ao runtime server-side;
2. cadastrar `CLAMAV_HOST` no ambiente `homologation`;
3. executar e aprovar o health check do provider real;
4. aplicar a migration em homologação;
5. executar upload limpo e EICAR pelo fluxo real do SAC;
6. implementar reanálise dos anexos `LEGACY`;
7. expandir o pipeline aos demais módulos;
8. adicionar métricas, alertas, retenção e interface administrativa.

## Critério de conclusão

- [x] contrato central;
- [x] validação de tipo, tamanho, nome e assinatura;
- [x] SHA-256;
- [x] bucket privado de quarentena;
- [x] ClamAV INSTREAM;
- [x] timeout;
- [x] fail-closed;
- [x] promoção somente após `CLEAN`;
- [x] estado visual acessível;
- [x] testes unitários;
- [x] integração do SAC na branch;
- [x] downloads revisados na branch;
- [x] E2E local limpo/EICAR;
- [ ] provider real configurado;
- [ ] health check do provider real aprovado;
- [ ] migration aplicada em homologação;
- [ ] E2E pelo fluxo real do SAC;
- [ ] reanálise de anexos `LEGACY`;
- [ ] integração dos demais módulos;
- [ ] CI final da integração completo.
