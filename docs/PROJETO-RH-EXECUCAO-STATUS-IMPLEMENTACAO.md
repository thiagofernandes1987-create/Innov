# Projeto RH — Estado Factual da Implementação

**Data-base:** 9 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**PR:** #42  
**Regra:** planejamento não conta como entrega. `VALIDADO` exige código existente e gate executado com sucesso. Integrações externas só são `VALIDADAS EXTERNAMENTE` após resposta oficial/credencial/ambiente real.

## 1. Checkpoint automatizado atual

No head `89b97e9aeb0aee6a5f4eddb256a3bef1565775e2` os gates específicos do RH encerraram verdes:

- `[x]` `RH Extended Functional #184` — pacote XSD oficial eSocial S-1.3, migrations RH, regressão PostgreSQL principal, suítes DB dedicadas, typecheck RH, lint RH e `tests/rh`;
- `[x]` `RH Functional #430`;
- `[x]` `RH eSocial Generation #166`;
- `[x]` `RH eSocial Results #243`;
- `[x]` `RH eSocial Parser #201`;
- `[x]` `RH Government Workspaces #236`;
- `[x]` `RH Time #218`;
- `[x]` `Stage 18 Concurrent E2E #385`;
- `[x]` `Stage 20 File Security E2E #874`.

Os workflows globais `CI`, `QA Launcher e Projetos` e `QA Fixture Pública do Launcher` permanecem vermelhos por dívidas do monólito fora do RH; não são mascarados por este projeto.

## 2. Fundação RH/DP — VALIDADO

- `[x]` aplicativo `rh` no launcher e navegação contextual;
- `[x]` autorização por capability e RLS por organização;
- `[x]` proteção cross-tenant por FKs compostas;
- `[x]` pessoas, trabalhadores, vínculos e matrículas;
- `[x]` empresas empregadoras, estabelecimentos e lotações tributárias;
- `[x]` cargos/CBO, funções, sindicatos/categorias e jornadas;
- `[x]` condições contratuais versionadas por vigência e bloqueio de sobreposição;
- `[x]` admissão como caso auditável, checklist, aprovação e ativação transacional/idempotente;
- `[x]` alterações cadastrais e contratuais versionadas.

## 3. Jornada e ponto — VALIDADO

- `[x]` escala semanal e política de apuração;
- `[x]` marcação bruta append-only;
- `[x]` sequência `IN/OUT` e pendências de marcação;
- `[x]` apuração diária e tratamentos;
- `[x]` fechamento do período;
- `[x]` exportação idempotente de horas/faltas para a folha;
- `[x]` integração corrigida com o contrato atual de lançamentos da folha.

## 4. Folha de pagamento — VALIDADO NO NÚCLEO IMPLEMENTADO

### 4.1 Motor e parametrização

- `[x]` competência, processamento, execução e resultado por trabalhador;
- `[x]` rubricas estáveis + versões por vigência;
- `[x]` bases declarativas e composição explícita por rubrica/fator;
- `[x]` memória de cálculo por linha;
- `[x]` fórmulas `MANUAL`, `FIXED`, `QUANTITY_X_RATE`, `PERCENT_OF_AMOUNT`, `PERCENT_OF_BASE`, `BRACKET_DEDUCTION`, `MARGINAL_PROGRESSIVE`;
- `[x]` parâmetros regulatórios versionados, sem regra tributária rígida no código-fonte;
- `[x]` teste negativo permanente contra contaminação indevida de base;
- `[x]` fechamento e proteção contra recálculo de período fechado.

### 4.2 Cálculos especializados

- `[x]` IRRF 2026: tabela progressiva, deduções legais × simplificada, redução mensal de 2026 e contexto acumulado;
- `[x]` múltiplos vínculos/bases externas para acumulação;
- `[x]` 13º: adiantamento e quitação separados;
- `[x]` férias: direito, concessão, 1/3, abono e exportação à folha;
- `[x]` rescisão: cálculo versionado, ajustes explícitos, aprovação e efetivação;
- `[x]` retroativos/complementares por diferença entre execuções imutáveis;
- `[x]` provisões parametrizadas por base, percentual e vigência;
- `[x]` contabilização por rubrica, lote balanceado e bloqueio de rubrica sem mapeamento;
- `[x]` ordens de pagamento, conta/PIX, lote, liquidação e evidência;
- `[x]` folha-sombra com reconciliação, tolerância, divergência e aceite bloqueado quando não conciliada.

**Limitação explícita:** CNAB/API bancária específica depende do banco/provider contratado. O arquivo operacional genérico não é rotulado como CNAB.

## 5. Benefícios — VALIDADO

- `[x]` catálogo, adesão e vigência;
- `[x]` cobrança por competência, parte empresa, parte empregado e coparticipação;
- `[x]` exportação para a folha;
- `[x]` fatura de fornecedor por trabalhador/adesão;
- `[x]` reconciliação fornecedor × cobrança interna;
- `[x]` divergência/missing explícitos;
- `[x]` aprovação somente após reconciliação e conferência do total;
- `[x]` registro de pagamento com referência e evidência.

## 6. Afastamentos e SST — VALIDADO NOS CAMINHOS SUPORTADOS

- `[x]` afastamento como fato separado de ausência de ponto;
- `[x]` início e retorno;
- `[x]` CAT;
- `[x]` ASO/procedimentos;
- `[x]` exposição ocupacional;
- `[x]` EPC/EPI e entregas;
- `[x]` segregação de informação clínica sensível;
- `[x]` projeção eSocial do estado do domínio.

## 7. Desligamento/offboarding — VALIDADO NOS CAMINHOS SUPORTADOS

- `[x]` caso de desligamento e motivo explícito;
- `[x]` cálculo rescisório versionado;
- `[x]` ajustes com evidência;
- `[x]` aprovação e efetivação do vínculo;
- `[x]` offboarding separado: acessos, ativos, benefícios, documentos, Financeiro e SST;
- `[x]` mapeamento de verbas rescisórias para rubricas eSocial;
- `[x]` integração com o fluxo rescisório do FGTS Digital.

## 8. eSocial — VALIDADO INTERNAMENTE NOS EVENTOS SUPORTADOS

### 8.1 Geração e assinatura

- `[x]` S-1000;
- `[x]` S-1005;
- `[x]` S-1010;
- `[x]` S-1020;
- `[x]` S-2190;
- `[x]` S-2200 — caminho CLT padrão;
- `[x]` S-2205;
- `[x]` S-2206;
- `[x]` S-2230 — caminho suportado;
- `[x]` S-2210;
- `[x]` S-2220;
- `[x]` S-2240;
- `[x]` S-2299 — caminho suportado;
- `[x]` S-2399 — caminho suportado;
- `[x]` S-1200;
- `[x]` S-1210;
- `[x]` S-1298;
- `[x]` S-1299;
- `[x]` XMLDSig automática RSA-SHA256/digest SHA-256;
- `[x]` todos os XMLs acima testados contra o pacote XSD oficial S-1.3 de produção publicado em 01/07/2026.

### 8.2 Transporte e retorno

- `[x]` endpoints separados de Produção Restrita/Produção;
- `[x]` Produção bloqueada por padrão;
- `[x]` mTLS com material de certificado somente no servidor;
- `[x]` lote com 1–50 eventos e homogeneidade de ambiente/grupo/empregador/transmissor;
- `[x]` persistência de evento, lote, tentativa, protocolo e payload sanitizado;
- `[x]` timeout como estado indeterminado, exigindo consulta/reconciliação;
- `[x]` parser por `Id` do evento;
- `[x]` recibo, código de resposta, descrição e ocorrências por evento;
- `[x]` estados individuais `ACCEPTED`, `REJECTED`, `PROCESSING`, `UNKNOWN`;
- `[x]` fechamento do lote derivado dos filhos.

**Ainda externo:** nenhuma homologação real é declarada concluída até existir protocolo/retorno oficial obtido em Produção Restrita com certificado e inscrições autorizadas.

**Casos intencionalmente bloqueados até implementação específica:** grupos especiais de S-2200, motivos de S-2230 que exigem estruturas adicionais e causas/grupos especiais de S-2299/S-2399 não cobertos pelo gerador padrão.

## 9. DCTFWeb / MIT — VALIDADO INTERNAMENTE

- `[x]` workspace por competência, estados, snapshots e reconciliação;
- `[x]` distinção fechamento eSocial/EFD-Reinf → sensibilização DCTFWeb;
- `[x]` recibos, débitos, pagamentos e divergências;
- `[x]` MIT JSON leiaute 1.0;
- `[x]` regra de nome do arquivo;
- `[x]` grupos de débito, eventos especiais e IDs sequenciais;
- `[x]` regras condicionais de qualificação/tributação;
- `[x]` `BalancoLucroReal` quando aplicável;
- `[x]` `ListaDebitosAposEvento` condicionada a evento especial compatível;
- `[x]` suspensões administrativas/judiciais e referências a débitos;
- `[x]` renderer e testes contra a documentação oficial vigente do MIT.

### Integra Contador

- `[x]` adapter server-only;
- `[x]` allowlist dos gateways SERPRO de validação/produção;
- `[x]` OAuth `client_credentials`;
- `[x]` timeout, correlação, tratamento HTTP e produção bloqueada por padrão;
- `[x]` paths de serviço são capabilities configuradas, não endpoints inventados;
- `[x]` workflow manual de validação contratual.

**Ainda externo:** consumo real dos serviços DCTFWeb/Integra Contador depende de contratação, `Consumer Key/Secret`, procurações/perfis e paths efetivamente habilitados ao contratante.

## 10. FGTS Digital — VALIDADO INTERNAMENTE

- `[x]` workspace por competência e trabalhador;
- `[x]` base/valor esperado derivados da folha configurada;
- `[x]` valor externo, divergência, guia, pagamento e conciliação;
- `[x]` canais `PORTAL_ASSISTED`, `OFFICIAL_FILE_IMPORT` e `DIRECT_API` condicionada à existência real da capability;
- `[x]` arquivo oficial de Remunerações para Fins Rescisórios — leiaute 1.2 de 03/10/2025;
- `[x]` linhas tipo 1/2, separador `;`, decimal brasileiro, limite 5.000 linhas/130 KB;
- `[x]` bloqueio de competências a partir de março/2024 no arquivo de recomposição;
- `[x]` múltiplos trabalhadores somente do mesmo empregador.

**Ainda externo:** ações que o FGTS Digital mantém exclusivamente em portal permanecem assistidas, com evidência e reconciliação; não existe API geral fictícia no projeto.

## 11. Documentos, recibos e Meu RH — VALIDADO

- `[x]` documentos RH por categoria e sensibilidade;
- `[x]` versões, SHA-256, MIME real, limite de tamanho e Storage privado;
- `[x]` publicação/revogação lógica e versão anterior superseded;
- `[x]` legal hold/retention no modelo;
- `[x]` autorização segregada para documentos clínicos/judiciais;
- `[x]` vínculo explícito `auth user ↔ worker`;
- `[x]` publicação controlada de recibos;
- `[x]` acesso self-service somente ao próprio trabalhador;
- `[x]` autorização de download auditada;
- `[x]` recibo PDF gerado server-side com hash SHA-256 e `Cache-Control: private, no-store`;
- `[x]` documentos publicados aparecem no Meu RH.

## 12. Relatórios e indicadores — IMPLEMENTADO E COBERTO PELO GATE RH

- `[x]` relatórios operacionais agregados de RH;
- `[x]` folha;
- `[x]` SST;
- `[x]` eSocial/obrigações;
- `[x]` navegação protegida por capability.

## 13. E2E e homologação

### Implementado

- `[x]` smoke Playwright profissional;
- `[x]` jornada transacional folha → publicação → Meu RH;
- `[x]` seed isolado e verificação persistida;
- `[x]` workflow manual `RH Browser E2E` protegido pelo environment `rh-homologation`;
- `[x]` workflow manual `RH eSocial Restricted Homologation`;
- `[x]` workflow manual `RH Integra Contador Contract Validation`.

### Ainda exige execução externa com evidência

- `[ ]` executar Browser E2E contra homologação HTTPS com credenciais válidas;
- `[ ]` obter protocolo/retorno oficial em Produção Restrita eSocial com certificado válido;
- `[ ]` validar OAuth/serviço Integra Contador com contrato/chaves reais;
- `[ ]` executar folha-sombra contra fonte/folha autorizada de referência e obter reconciliação aceita;
- `[ ]` piloto controlado;
- `[ ]` rehearsal de cutover/rollback;
- `[ ]` GO/NO_GO de negócio;
- `[ ]` produção.

## 14. Gate para piloto/produção

Não liberar produção enquanto faltar qualquer item abaixo:

1. head candidato com `RH Extended Functional` verde;
2. XMLs eSocial liberados passando XSD oficial vigente;
3. Produção Restrita eSocial com protocolo/retorno oficial;
4. Browser E2E transacional executado no ambiente de homologação;
5. folha-sombra/reconciliação aceita com fonte autorizada;
6. validação legal/tributária dos parâmetros configurados;
7. restore/recovery aplicável ao conjunto RH;
8. piloto controlado sem divergência crítica aberta;
9. plano de cutover/rollback com responsáveis;
10. GO de negócio documentado.

## 15. Próxima ordem de execução

O trabalho interno principal não deve voltar para novos módulos abstratos. A sequência é:

1. manter o gate estendido verde a cada correção;
2. executar os workflows externos quando os environments/secrets forem fornecidos;
3. corrigir rejeições reais encontradas na Produção Restrita ou E2E;
4. rodar folha-sombra e conciliar;
5. piloto;
6. cutover controlado;
7. produção somente após GO formal.
