# Projeto RH — Estado Factual da Implementação

**Data-base:** 9 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**PR:** #42  
**Regra:** planejamento não conta como entrega. `VALIDADO` exige código existente e gate executado com sucesso. `VALIDADO EXTERNAMENTE` exige resposta oficial/credencial/ambiente real.

## 1. Último checkpoint interno completamente validado

No head `254c028e3beba3a34a78c3062e966b184aadc4fd` os gates RH específicos encerraram verdes no mesmo SHA:

- `[x]` `RH Extended Functional #406`;
- `[x]` `RH Functional #624`;
- `[x]` `RH eSocial Generation #344`;
- `[x]` `RH eSocial Results #392`;
- `[x]` `RH eSocial Parser #336`;
- `[x]` `RH Government Workspaces #385`;
- `[x]` `RH Time #367`;
- `[x]` `PostgREST Embed Diagnostic #158`;
- `[x]` `Stage 18 Concurrent E2E #590`;
- `[x]` `Stage 20 File Security E2E #1079`.

O checkpoint provou, entre outros:

- pacote oficial eSocial S-1.3 de 01/07/2026;
- SHA-256 pinado do pacote: `32535dba33d0470cf44afce410840af450028fd32d3ddf9123f601c45cf9af8e`;
- migrations RH replayáveis;
- regressões PostgreSQL das verticais críticas;
- `tsc --noEmit -p tsconfig.rh.json` verde;
- lint RH com zero warnings;
- XMLDSig comparado com canonicalização externa e verificado por `xmlsec1`;
- backup/restore isolado com comparação de catálogo, RLS, policies, funções e contagens;
- rehearsal isolado de cutover/rollback.

### 1.1. Alterações posteriores ao checkpoint — em reconfirmação no mesmo SHA

Depois do checkpoint acima, o loop continuou e acrescentou/consolidou:

- `[x]` S-2300 para categorias especiais `304`, `305`, `401` e `410` com workspace dedicado;
- `[x]` testes XML/XSD oficiais específicos para `304/305/401/410` e casos negativos;
- `[x]` regressão PostgreSQL das invariantes de banco desses quatro grupos;
- `[x]` tela da competência ligada a ordens de pagamento, liquidação, S-1200, S-1210, S-1298, S-1299 e publicação de holerites;
- `[x]` remoção de actions antigas/duplicadas já substituídas por fluxos transacionais canônicos;
- `[x]` consolidação da consulta eSocial com aplicação do resultado individual por evento;
- `[x]` recuperação do pacote XSD endurecida contra indisponibilidade transitória do GOV, sem trocar a fonte oficial.

A recuperação XSD agora:

1. usa somente URLs oficiais do eSocial;
2. aceita cache somente se o ZIP corresponder ao SHA-256 pinado acima;
3. tenta a URL canônica `@@download/file` e a URL oficial original;
4. força IPv4, retries e timeouts explícitos;
5. falha de forma bloqueante se o hash oficial mudar;
6. usa o mesmo helper no gate automático e na Produção Restrita.

Evidência intermediária importante: no SHA `4f435358e8e2099d373654dbed4ed81946f2084c`, o `RH eSocial Generation #382` passou cache/preparo pinado, preflight de Produção Restrita, migrations, todas as suites XML/XMLDSig/XMLSec/XSD oficial, typecheck e lint. No mesmo conteúdo funcional, `RH Functional #666`, `RH Government Workspaces #414`, `RH Time #396`, `RH eSocial Results #421`, `RH eSocial Parser #363`, `PostgREST #196`, `Stage 18 #625` e `Stage 20 File Security #1114` também ficaram verdes. O `RH Extended #453` foi cancelado durante backup/restore porque o branch avançou; antes do cancelamento já havia passado menus, migrations e suites PostgreSQL. Cancelamento por novo head não é classificado como falha funcional.

Um workflow temporário de manutenção gerou commits por `github-actions[bot]`, fazendo os runs subsequentes aparecerem como `action_required`. Este commit documental normal existe para reabrir os gates sobre o conteúdo atual. O novo head só substituirá `254c028...` como checkpoint quando os gates críticos concluírem no mesmo SHA.

## 2. Fundação RH/DP — VALIDADO

- `[x]` módulo RH nativo, menus e autorização por capability;
- `[x]` RLS multi-tenant e FKs compostas;
- `[x]` pessoas, trabalhadores, vínculos e matrículas;
- `[x]` empresas, estabelecimentos e lotações tributárias;
- `[x]` cargos/CBO, funções, sindicatos/categorias e jornadas;
- `[x]` condições contratuais versionadas por vigência;
- `[x]` admissão auditável, checklist, aprovação e ativação transacional/idempotente;
- `[x]` alterações cadastrais e contratuais versionadas.

## 3. Jornada, férias, afastamentos e benefícios — VALIDADO

- `[x]` marcação bruta append-only, apuração, tratamento e fechamento de ponto;
- `[x]` exportação idempotente do ponto para folha;
- `[x]` férias: direito, concessão, 1/3, abono e folha;
- `[x]` afastamento separado de ausência, início/retorno e projeção eSocial nos caminhos suportados;
- `[x]` benefícios: catálogo, adesão, cobrança, folha, fatura de fornecedor e reconciliação;
- `[x]` aprovação de fatura somente após reconciliação/conferência do total;
- `[x]` pagamento de fornecedor com referência e evidência.

## 4. Folha de pagamento — VALIDADO NO NÚCLEO IMPLEMENTADO

- `[x]` competência, execução, resultado por trabalhador e memória de cálculo;
- `[x]` rubricas/versionamento e bases declarativas;
- `[x]` fórmulas `MANUAL`, `FIXED`, `QUANTITY_X_RATE`, `PERCENT_OF_AMOUNT`, `PERCENT_OF_BASE`, `BRACKET_DEDUCTION`, `MARGINAL_PROGRESSIVE`;
- `[x]` parâmetros regulatórios versionados;
- `[x]` IRRF 2026: tabela progressiva, deduções legal × simplificada, redução e acumulados;
- `[x]` múltiplos vínculos/bases externas;
- `[x]` 13º especializado;
- `[x]` férias e rescisão especializadas;
- `[x]` retroativos/complementares por diferença entre execuções imutáveis;
- `[x]` provisões;
- `[x]` contabilização balanceada;
- `[x]` conta/PIX, ordens, lotes, liquidação e evidência;
- `[x]` operação periódica eSocial pela própria competência;
- `[x]` publicação de holerites pela própria competência;
- `[x]` folha-sombra/reconciliação e gate de aceite.

**Condicional:** CNAB/API bancária específica depende do banco/provider efetivamente contratado.

## 5. SST — VALIDADO NOS CAMINHOS SUPORTADOS

- `[x]` CAT;
- `[x]` ASO/procedimentos;
- `[x]` exposição ocupacional;
- `[x]` EPC/EPI e entregas;
- `[x]` segregação de informação clínica sensível;
- `[x]` S-2210/S-2220/S-2240 e projeção do retorno para o domínio.

## 6. Desligamento/offboarding — VALIDADO NOS CAMINHOS SUPORTADOS

- `[x]` caso de desligamento;
- `[x]` cálculo rescisório versionado e ajustes com evidência;
- `[x]` aprovação/efetivação;
- `[x]` offboarding separado para acessos, ativos, benefícios, documentos, Financeiro e SST;
- `[x]` mapeamento das verbas para eSocial;
- `[x]` integração com fluxo rescisório do FGTS Digital.

## 7. eSocial — VALIDADO INTERNAMENTE NOS EVENTOS SUPORTADOS

### Geração

- `[x]` S-1000/S-1005/S-1010/S-1020;
- `[x]` S-2190/S-2200 CLT padrão/S-2205/S-2206;
- `[x]` S-2200 especial e de transição nos caminhos explicitamente suportados;
- `[x]` S-2230 padrão e especial nos caminhos suportados;
- `[x]` S-2210/S-2220/S-2240;
- `[x]` S-2299/S-2399 nos caminhos suportados;
- `[x]` S-1200/S-1210/S-1298/S-1299;
- `[x]` S-2300 contribuintes 7XX suportados;
- `[x]` S-2300 estágio 901 e serviço civil 906;
- `[x]` S-2300 grupos especiais 304/305/401/410;
- `[x]` XMLDSig RSA-SHA256/SHA-256;
- `[x]` canonicalização comparada com `xmllint --c14n`;
- `[x]` assinatura completa aceita pelo `xmlsec1` independente;
- `[x]` XMLs liberados validados contra XSD oficial vigente.

### Transporte e retorno

- `[x]` Produção Restrita/Produção separadas e Produção bloqueada por padrão;
- `[x]` mTLS e material criptográfico apenas no servidor;
- `[x]` lote 1–50 e homogeneidade de grupo/empregador/transmissor/ambiente;
- `[x]` evento, lote, tentativa, protocolo e payload sanitizado;
- `[x]` timeout como estado indeterminado;
- `[x]` consulta, parser por `Id`, recibo e ocorrências por evento;
- `[x]` aplicação do resultado individual correlacionado ao fato interno;
- `[x]` runner real de Produção Restrita reutiliza o mesmo signer validado pelo app;
- `[x]` preflight do runner sem secrets/rede validado no gate automático;
- `[x]` runner real valida chave↔certificado, XSD e XMLSec antes do envio;
- `[x]` pacote XSD oficial pinado por SHA-256 e cache verificado.

**Externo:** Produção Restrita só será concluída depois de protocolo/retorno oficial com certificado e inscrições autorizadas.

**Bloqueio seguro:** caso ainda não modelado para uma categoria/grupo específico deve ser rejeitado pelo gerador; não é permitido completar XML com dado inferido.

## 8. DCTFWeb / MIT / Integra Contador — VALIDADO INTERNAMENTE

- `[x]` workspace DCTFWeb, estados, snapshots e reconciliação;
- `[x]` MIT JSON leiaute 1.0;
- `[x]` eventos especiais, IDs sequenciais, grupos tributários condicionais, `BalancoLucroReal`, `ListaDebitosAposEvento` e suspensões;
- `[x]` adapter Integra Contador server-only;
- `[x]` allowlist dos gateways SERPRO, OAuth `client_credentials`, timeout e correlação;
- `[x]` paths externos como capabilities configuradas, sem endpoints inventados;
- `[x]` workflow manual de validação contratual.

**Externo:** consumo real depende de contrato, Consumer Key/Secret, procurações/perfis e serviços habilitados ao contratante.

## 9. FGTS Digital — VALIDADO INTERNAMENTE

- `[x]` workspace por competência/trabalhador;
- `[x]` base/valor esperado derivados da folha;
- `[x]` divergência, guia, pagamento e conciliação;
- `[x]` canais `PORTAL_ASSISTED`, `OFFICIAL_FILE_IMPORT` e `DIRECT_API` somente quando comprovada;
- `[x]` arquivo Remunerações para Fins Rescisórios leiaute 1.2 de 03/10/2025;
- `[x]` limites, decimal brasileiro, competências e empregador validados.

## 10. Documentos, recibos, portal e relatórios — VALIDADO

- `[x]` Storage privado, versões, SHA-256, MIME, sensibilidade, legal hold/retention;
- `[x]` publicação/revogação e trilha de acesso;
- `[x]` vínculo `auth user ↔ worker`;
- `[x]` recibos publicados e PDF server-side;
- `[x]` Meu RH somente do próprio trabalhador;
- `[x]` download auditado;
- `[x]` relatórios agregados de RH/folha/SST/eSocial.

## 11. Recuperação — VALIDADO EM AMBIENTE ISOLADO

- `[x]` banco PostgreSQL descartável;
- `[x]` migrations RH aplicadas no rehearsal isolado;
- `[x]` dados sintéticos inseridos;
- `[x]` `pg_dump` em formato custom;
- `[x]` `pg_restore` em banco distinto;
- `[x]` comparação de tabelas RH, contagens, RLS, policies e funções;
- `[x]` artifact de evidência;
- `[x]` rehearsal isolado de cutover/rollback.

Isso comprova o mecanismo em ambiente isolado. Não substitui um rehearsal do ambiente candidato real.

## 12. E2E/homologação — IMPLEMENTADO, EXECUÇÃO EXTERNA PENDENTE

- `[x]` smoke Playwright;
- `[x]` jornada transacional folha → publicação → Meu RH;
- `[x]` seed isolado e verificação persistida;
- `[x]` cleanup determinístico com restauração da role do usuário de teste;
- `[x]` workflow `RH Browser E2E` protegido por `rh-homologation`;
- `[x]` workflow `RH eSocial Restricted Homologation`;
- `[x]` workflow `RH Integra Contador Contract Validation`.

Ainda exigem ambiente/credenciais/evidência real:

- `[ ]` Browser E2E contra homologação HTTPS;
- `[ ]` protocolo/retorno oficial em Produção Restrita eSocial;
- `[ ]` Integra Contador com contrato/chaves reais;
- `[ ]` folha-sombra contra fonte real autorizada e aceite do responsável;
- `[ ]` rehearsal de cutover/rollback do ambiente real;
- `[ ]` piloto controlado;
- `[ ]` GO/NO_GO de negócio;
- `[ ]` produção.

## 13. Restrições da infraestrutura conectada nesta execução

- o conector GitHub disponível não expõe leitura de secrets/environments nem ação de `workflow_dispatch` manual;
- o conector Vercel acessível não expôs um projeto Innov/homologação;
- credenciais/certificados reais não são inferidos nem simulados.

Essas limitações impedem encerrar artificialmente os gates externos, mas não autorizam enfraquecer os checks internos.

## 14. Gate de produção

Não liberar enquanto faltar qualquer item abaixo:

1. head candidato com gates RH verdes no mesmo SHA;
2. XSD/XMLSec oficiais verdes;
3. Produção Restrita com protocolo/retorno oficial;
4. Browser E2E no ambiente de homologação;
5. folha-sombra/reconciliação aceita com fonte autorizada;
6. parâmetros legais/tributários aprovados pelo responsável competente;
7. recovery isolado verde e rehearsal do ambiente real;
8. piloto sem divergência crítica;
9. cutover/rollback e responsáveis aprovados;
10. GO formal de negócio.

O PR permanece `draft` e este documento não autoriza merge ou produção.
