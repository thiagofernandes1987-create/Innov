# Projeto RH — Estado Factual da Implementação

**Data-base:** 9 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**PR:** #42  
**Regra:** planejamento não conta como entrega. `VALIDADO` exige código existente e gate executado com sucesso. `VALIDADO EXTERNAMENTE` exige resposta oficial/credencial/ambiente real.

## 1. Checkpoint interno candidato

No head `b7b3aa01849dc7b1d45ff61d05d682984422cb30` os gates RH específicos encerraram verdes:

- `[x]` `RH Extended Functional #217`;
- `[x]` `RH Functional #452`;
- `[x]` `RH eSocial Generation #198`;
- `[x]` `RH eSocial Results #264`;
- `[x]` `RH eSocial Parser #222`;
- `[x]` `RH Government Workspaces #257`;
- `[x]` `RH Time #239`;
- `[x]` `Stage 18 Concurrent E2E #426`;
- `[x]` `Stage 20 File Security E2E #915`.

O gate estendido provou no mesmo SHA:

- pacote oficial eSocial S-1.3 de 01/07/2026: **52 XSDs**;
- SHA-256 do pacote observado no run: `32535dba33d0470cf44afce410840af450028fd32d3ddf9123f601c45cf9af8e`;
- replay de **53 migrations RH**;
- regressão PostgreSQL de empregado, estrutura, admissão, folha V1/V2, regulatório, IRRF 2026, MIT, folha-sombra, benefícios, documentos, eSocial-results, DCTFWeb/FGTS e ponto;
- `tsc --noEmit -p tsconfig.rh.json` verde;
- lint RH com zero warnings;
- **37 testes** unitários/contratuais em 6 arquivos verdes;
- XMLDSig comparado com `xmllint --c14n` e verificado por `xmlsec1` externo;
- backup/restore isolado: **112 tabelas RH**, **29 linhas sintéticas** restauradas, catálogo/RLS/policies/funções/contagens comparados;
- evidência de restore publicada como artifact `rh-backup-restore-evidence-31310912855`, digest `sha256:f3675e3eb46e02189c76e8814d83e47087f7baef35691eecfa9cd0133abf5669`.

Os workflows globais `CI`, `QA Launcher e Projetos` e `QA Fixture Pública do Launcher` continuam vermelhos por dívidas do monólito fora do RH. Nenhum validador foi enfraquecido para mascará-las.

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
- `[x]` S-2230;
- `[x]` S-2210/S-2220/S-2240;
- `[x]` S-2299/S-2399 nos caminhos suportados;
- `[x]` S-1200/S-1210/S-1298/S-1299;
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
- `[x]` runner real de Produção Restrita reutiliza o mesmo signer validado pelo app;
- `[x]` preflight do runner sem secrets/rede validado no gate automático;
- `[x]` runner real valida chave↔certificado, XSD e XMLSec antes do envio.

**Externo:** Produção Restrita só será concluída depois de protocolo/retorno oficial com certificado e inscrições autorizadas.

**Bloqueados por design:** casos especiais de S-2200, S-2230, S-2299 e S-2399 que exigem grupos ainda não modelados continuam rejeitados pelo gerador em vez de produzir XML incompleto.

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
- `[x]` todas as migrations RH aplicadas;
- `[x]` dados sintéticos inseridos;
- `[x]` `pg_dump` em formato custom;
- `[x]` `pg_restore` em banco distinto;
- `[x]` comparação de 112 tabelas RH, contagens, RLS, policies e funções;
- `[x]` artifact de evidência com retenção de 30 dias.

Isso comprova o mecanismo em ambiente isolado. Não substitui um rehearsal de cutover do ambiente real.

## 12. E2E/homologação — IMPLEMENTADO, EXECUÇÃO EXTERNA PENDENTE

- `[x]` smoke Playwright;
- `[x]` jornada transacional folha → publicação → Meu RH;
- `[x]` seed isolado e verificação persistida;
- `[x]` workflow `RH Browser E2E` protegido por `rh-homologation`;
- `[x]` workflow `RH eSocial Restricted Homologation`;
- `[x]` workflow `RH Integra Contador Contract Validation`.

Ainda exigem ambiente/credenciais/evidência real:

- `[ ]` Browser E2E contra homologação HTTPS;
- `[ ]` protocolo/retorno oficial em Produção Restrita eSocial;
- `[ ]` Integra Contador com contrato/chaves reais;
- `[ ]` folha-sombra contra fonte real autorizada;
- `[ ]` rehearsal de cutover/rollback do ambiente real;
- `[ ]` piloto controlado;
- `[ ]` GO/NO_GO de negócio;
- `[ ]` produção.

## 13. Gate de produção

Não liberar enquanto faltar qualquer item abaixo:

1. head candidato com gates RH verdes;
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
