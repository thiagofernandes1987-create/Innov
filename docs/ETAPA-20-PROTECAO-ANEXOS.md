# Etapa 20 — Proteção e análise de anexos

## Estado

**Fundação transversal implementada; integração nos fluxos de upload e provider ClamAV externo ainda pendentes.**

## Objetivo

Impedir que um arquivo enviado por usuário seja disponibilizado no bucket funcional antes de validação de tipo, tamanho, hash e análise antimalware.

## Arquitetura

```text
upload autorizado
→ validação central de nome, MIME e tamanho
→ bucket privado file-quarantine
→ manifesto PENDING
→ ClamAV INSTREAM
→ CLEAN: promoção ao bucket definitivo
→ BLOCKED: retenção isolada no prefixo blocked
→ ERROR/timeout: falha fechada e arquivo não liberado
```

## Escopo incluído

- política central de tipos e tamanho máximo;
- nome de arquivo normalizado;
- SHA-256 calculado antes da promoção;
- bucket de quarentena obrigatoriamente privado;
- manifesto JSON por análise;
- provider ClamAV por protocolo `INSTREAM`;
- timeout configurável;
- promoção somente após resultado `CLEAN`;
- bloqueio e retenção isolada quando assinatura for encontrada;
- erro fail-closed quando o scanner estiver indisponível;
- provider `test-clean` restrito a teste ou autorização insegura explícita;
- componente visual acessível para `PENDING`, `SCANNING`, `CLEAN`, `BLOCKED` e `ERROR`;
- testes unitários de validação e parsing do ClamAV.

## Fora do escopo desta fatia

- integração em todos os uploads existentes;
- provisionamento da infraestrutura ClamAV;
- retenção jurídica de arquivos bloqueados;
- interface administrativa de quarentena;
- reprocessamento assíncrono;
- métricas e alertas externos;
- liberação manual por administrador;
- scan de objetos já existentes.

## Tipos permitidos

```text
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
image/jpeg
image/png
image/webp
```

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
```

`ALLOW_INSECURE_FILE_SCANNER=true` é proibida em produção e existe somente para testes controlados.

## Segurança

- Service Role somente no servidor;
- bucket de quarentena privado;
- usuário não recebe URL do objeto pendente ou bloqueado;
- arquivo só existe no bucket funcional depois de `CLEAN`;
- MIME e tamanho validados antes do upload;
- nome não controla o caminho final;
- hash calculado sobre os bytes recebidos;
- scanner indisponível não libera o arquivo;
- malware detectado não é promovido;
- resposta desconhecida do scanner resulta em `ERROR`;
- paths usam UUID e organização;
- valores de configuração não aparecem no manifesto.

## UI/UX Pro Max

Estados devem usar texto e semântica, não apenas cor:

- `Aguardando análise`;
- `Analisando arquivo`;
- `Arquivo liberado`;
- `Arquivo bloqueado`;
- `Análise indisponível`.

O componente usa `role=status`; `SCANNING` possui `aria-live=polite`. Bloqueios devem explicar o próximo passo sem revelar assinatura técnica ao cliente.

## Arquivos

```text
lib/file-security/domain.ts
lib/file-security/server.ts
components/file-security/file-security-status.tsx
tests/file-security.test.ts
docs/ETAPA-20-PROTECAO-ANEXOS.md
```

## Testes

- sanitização de filename;
- tipo permitido;
- tipo rejeitado;
- tamanho máximo;
- resposta ClamAV `OK`;
- resposta ClamAV `FOUND`;
- resposta desconhecida fail-closed;
- validação estrutural da Etapa 20;
- lint, typecheck, testes e build.

## Próximos passos

1. configurar ClamAV acessível aos runtimes server-side;
2. criar health check do provider;
3. integrar `secureUpload` ao SAC;
4. integrar documentos, qualidade, compras, financeiro, assinatura e diário;
5. bloquear downloads sem promoção concluída;
6. implementar interface administrativa e retenção;
7. adicionar E2E com arquivo limpo e arquivo de teste antimalware aprovado para ambiente controlado.

## Critério de conclusão

- [x] contrato central;
- [x] validação de tipo, tamanho e nome;
- [x] SHA-256;
- [x] bucket privado de quarentena;
- [x] ClamAV INSTREAM;
- [x] timeout;
- [x] fail-closed;
- [x] promoção somente após `CLEAN`;
- [x] estado visual acessível;
- [x] testes unitários;
- [ ] provider externo configurado;
- [ ] health check aprovado;
- [ ] uploads existentes integrados;
- [ ] downloads revisados;
- [ ] E2E limpo/infectado;
- [ ] CI final da integração completa.
