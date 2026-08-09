# Projeto RH — Execução dos Blocos Críticos

**Iniciado:** 2026-08-07  
**Checkpoint interno:** 2026-08-09  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**PR:** #42  

Este arquivo registra o resultado do loop `implementar → testar → corrigir → repetir`. O estado detalhado está em `PROJETO-RH-EXECUCAO-STATUS-IMPLEMENTACAO.md`.

## 1. Checklist interno concluído e validado

- `[x]` geração automática de XML eSocial nos caminhos suportados;
- `[x]` XMLDSig RSA-SHA256/SHA-256;
- `[x]` C14N comparada com `xmllint` e assinatura validada externamente com `xmlsec1`;
- `[x]` XSD oficial S-1.3 carregado no CI e usado para validar os XMLs;
- `[x]` S-1000/S-1005/S-1010/S-1020;
- `[x]` S-2190/S-2200 CLT padrão/S-2205/S-2206;
- `[x]` S-2230 nos caminhos suportados;
- `[x]` SST + S-2210/S-2220/S-2240;
- `[x]` S-2299/S-2399 nos caminhos suportados;
- `[x]` S-1200/S-1210/S-1298/S-1299;
- `[x]` S-2300 para contribuintes individuais 7XX suportados, estagiário 901, serviço civil 906 e grupos especiais 304/305/401/410 modelados;
- `[x]` retorno eSocial por lote/evento, protocolo, recibo e ocorrências, com aplicação de resultado individual correlacionado;
- `[x]` IRRF 2026;
- `[x]` múltiplos vínculos/acumulados;
- `[x]` 13º especializado;
- `[x]` férias e rescisão especializadas;
- `[x]` retroativos/complementares;
- `[x]` afastamento → folha/eSocial nos efeitos explicitamente configurados;
- `[x]` benefícios ponta a ponta, incluindo fatura, reconciliação, aprovação e pagamento;
- `[x]` SST/ASO/EPI;
- `[x]` desligamento/offboarding;
- `[x]` provisões;
- `[x]` contabilização;
- `[x]` pagamentos bancários internos, conta/PIX, lotes, liquidação e evidência;
- `[x]` MIT JSON 1.0 e regras condicionais;
- `[x]` adapter Integra Contador e workflow de validação contratual;
- `[x]` arquivo FGTS Digital para remunerações rescisórias, leiaute 1.2;
- `[x]` documentos RH privados/versionados;
- `[x]` recibos PDF e Meu RH;
- `[x]` publicação de holerites pela competência;
- `[x]` relatórios/indicadores;
- `[x]` folha-sombra/reconciliação;
- `[x]` E2E de navegador implementado com seed rastreável, verificação e cleanup determinístico;
- `[x]` backup/restore isolado executado e comparado;
- `[x]` rehearsal isolado de cutover/rollback executado;
- `[x]` mapa canônico de código regenerado sem confrontos estruturais.

## 2. Evidência do checkpoint interno `254c028e3beba3a34a78c3062e966b184aadc4fd`

No mesmo SHA encerraram com sucesso:

- `RH Extended Functional #406` — **SUCCESS**;
- `RH Functional #624` — **SUCCESS**;
- `RH eSocial Generation #344` — **SUCCESS**;
- `RH eSocial Results #392` — **SUCCESS**;
- `RH eSocial Parser #336` — **SUCCESS**;
- `RH Government Workspaces #385` — **SUCCESS**;
- `RH Time #367` — **SUCCESS**;
- `PostgREST Embed Diagnostic #158` — **SUCCESS**;
- `Stage 18 Concurrent E2E #590` — **SUCCESS**;
- `Stage 20 File Security E2E #1079` — **SUCCESS**.

O gate eSocial desse checkpoint baixou o pacote oficial S-1.3, executou o preflight do runner de Produção Restrita, validou migrations, XMLDSig/XMLSec/XSD oficial, typecheck e lint. O gate estendido validou menus, migrations, regressão PostgreSQL RH, suites dedicadas, backup/restore, cutover/rollback, typecheck e lint.

## 3. Fechamento estrutural posterior ao checkpoint

Depois do checkpoint acima, o loop continuou para eliminar desconexões detectadas pelo `MAPA-DO-CODIGO` sem enfraquecer o validador.

Foram consolidados:

- remoção das actions antigas de benefícios substituídas por `rh-benefits.ts`;
- remoção da criação antiga de rubrica substituída pelo fluxo transacional de `rh-payroll.ts`;
- consolidação da consulta eSocial na action que também aplica resultados individuais por evento;
- ligação da competência de folha às actions já existentes de ordens de pagamento, liquidação, S-1200, S-1210, S-1298, S-1299 e publicação de holerites;
- remoção de `lib/casca/indicadores.ts`, já substituído por `launcher-metrics.ts`;
- remoção do wrapper antigo `createDependency`, pois o planner usa `createScheduleDependency` diretamente;
- remoção de `createProjectFromContract` legado, substituído por `createProjectFromContractSafe` + RPC `create_project_from_contract_v2`.

No commit `aa6e8e0ccc3f87ccfc14c5cb854f8554216f80ea`, o gerador canônico foi executado e verificado sem confrontos, `diretrizes/MAPA-DO-CODIGO.md` foi regenerado e o workflow temporário de manutenção se auto removeu.

A VACINA-057 também foi reconciliada sem afirmar aplicação inexistente: 70 migrations RH/Stage 22 presentes no branch e ausentes do ledger real foram registradas em `debito.arquivos_sem_aplicacao`, com responsável e bloqueio explícito até existir homologação isolada. O próprio `validate-migrations-applied` confirmou 234 arquivos, 202 migrations aplicadas e nenhuma divergência **nova**; isso não transforma as 70 pendentes em funcionalidade disponível no banco principal.

O CI global `#4007` atravessou todos os validadores estruturais e os cinco blocos de testes PostgreSQL globais antes de parar em um único warning de lint no Gantt. O commit `6ccf4c2c5b45110d6b349e58a3271dbed6d30acf` removeu somente `hitWidth` e `hitOffset`, ambos sem consumidores, e o ESLint isolado do planner foi aprovado com `--max-warnings=0`. Como esse commit foi produzido pelo `github-actions[bot]`, os workflows associados ficaram em `action_required`; este commit documental normal apenas reabre os gates sobre o mesmo conteúdo, sem alterar comportamento.

## 4. Homologação eSocial real — pronta para execução, mas externa

O workflow manual:

- usa o mesmo signer XMLDSig do aplicativo;
- valida correspondência chave privada ↔ certificado;
- valida XSD oficial antes da rede;
- valida XMLDSig com `xmlsec1` antes da rede;
- usa mTLS;
- envia somente para Produção Restrita;
- consulta o protocolo;
- grava evidência sanitizada;
- mantém Produção bloqueada.

`[ ]` Só pode ser marcado concluído após executar com certificado ICP-Brasil e inscrições autorizadas e obter protocolo/retorno oficial.

## 5. Pendências externas/condicionais reais

- `[ ]` Browser E2E contra um ambiente HTTPS de homologação isolado;
- `[ ]` Produção Restrita eSocial com certificado/inscrições reais;
- `[ ]` Integra Contador com contrato, Consumer Key/Secret e serviços realmente habilitados;
- `[ ]` folha-sombra contra fonte real autorizada e aceite do responsável;
- `[ ]` CNAB/API de banco específico, se o banco/provider escolhido exigir;
- `[ ]` rehearsal de cutover/rollback no ambiente candidato;
- `[ ]` piloto controlado;
- `[ ]` GO/NO_GO de negócio;
- `[ ]` produção.

Casos de negócio ainda não exigidos devem permanecer bloqueados até que exista necessidade concreta e regra normativa correspondente; não produzir XML parcial é preferível a inferir dados.

## 6. Restrições atuais da infraestrutura conectada

- o conector GitHub disponível nesta conversa não expõe secrets/environments nem uma ação para disparar `workflow_dispatch` manualmente;
- a Vercel conectada não expõe um projeto Innov acessível para homologação;
- o Supabase conectado expõe somente o projeto principal e a branch `main`, sem branch isolada de homologação; por segurança nenhuma migration RH foi aplicada nela.

O PR permanece `draft`, sem merge e sem produção. O loop interno continua pelos gates automáticos; as etapas externas só podem ser encerradas com infraestrutura isolada e credenciais/evidências reais.
