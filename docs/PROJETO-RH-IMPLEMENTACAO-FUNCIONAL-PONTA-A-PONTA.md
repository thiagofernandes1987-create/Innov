# Projeto RH — Implementação Funcional Ponta a Ponta

**Estado:** EM EXECUÇÃO  
**Data de início:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Objetivo:** transformar a especificação do Projeto RH/DP em módulos utilizáveis por profissionais dentro da Innovar Platform, com dados persistidos, telas reais, cálculos, integrações, auditoria e fluxos ponta a ponta.

> Regra deste arquivo: checkbox só recebe `[x]` quando existe implementação concreta no repositório. Documento, wireframe ou intenção não contam como entrega.

---

## 1. Definição de funcional

Uma capacidade só é considerada funcional quando possui, conforme aplicável:

- [ ] rota acessível dentro do app;
- [ ] autorização real pelo módulo `rh`;
- [ ] tabela(s), constraints e RLS;
- [ ] leitura e escrita persistentes;
- [ ] formulário/tela de operação;
- [ ] validação no servidor;
- [ ] regra de negócio executável;
- [ ] estados e transições;
- [ ] histórico/auditoria;
- [ ] tratamento de erro;
- [ ] integração com módulos de origem/destino;
- [ ] teste automatizado;
- [ ] critério de aceite executado;
- [ ] evidência de funcionamento.

Para integração governamental também é obrigatório:

- [ ] canal oficial identificado;
- [ ] autenticação/certificado/procuração modelados;
- [ ] contrato request/response ou layout oficial;
- [ ] ambiente de teste/homologação quando existente;
- [ ] idempotência/correlação;
- [ ] protocolo/recibo/retorno;
- [ ] retry/reconciliação;
- [ ] fallback assistido quando não existir API pública aplicável.

---

## 2. Arquitetura funcional alvo

```text
Innovar Platform
└─ RH / Departamento Pessoal
   ├─ Pessoas e Empregados
   ├─ Estrutura / Empresas / Estabelecimentos
   ├─ Admissão
   ├─ Contratos / Salários / Jornadas
   ├─ Ponto / Banco de Horas
   ├─ Férias / Afastamentos
   ├─ Benefícios
   ├─ SST
   ├─ Folha de Pagamento
   │  ├─ Rubricas e Fórmulas
   │  ├─ Entradas
   │  ├─ Competências
   │  ├─ Cálculo
   │  ├─ Conferência
   │  ├─ Fechamento
   │  ├─ Pagamentos
   │  └─ Contabilização
   ├─ Desligamento / Rescisão
   ├─ Obrigações Digitais
   │  ├─ eSocial
   │  ├─ DCTFWeb
   │  └─ FGTS Digital
   ├─ Documentos
   └─ Relatórios / Indicadores
```

---

# 3. Sprints de implementação

## S00 — Entrada real do RH no app

**Entrega:** aplicativo RH navegável e autorizável.

### Código
- [ ] registrar `rh` em `lib/modules/registry.ts`;
- [ ] cadastrar menu do RH em `lib/casca/menus.ts`;
- [ ] migration para `app_modules` e dependências;
- [ ] página `/app/rh`;
- [ ] dashboard operacional real;
- [ ] verificar `validate:menus`;
- [ ] verificar typecheck/build.

### Telas
- [ ] Visão geral;
- [ ] Pessoas;
- [ ] Folha;
- [ ] Obrigações;
- [ ] Configuração.

**Done:** usuário autorizado consegue abrir o RH pelo launcher e navegar sem 404.

---

## S01 — Pessoas, trabalhadores e vínculos

**Entrega:** cadastro de empregados utilizável.

### Banco
- [ ] `rh_people`;
- [ ] `rh_workers`;
- [ ] `rh_employments`;
- [ ] constraints de CPF/documento e tenant;
- [ ] RLS;
- [ ] índices de busca;
- [ ] histórico de estado.

### Telas
- [ ] `/app/rh/pessoas` lista com busca;
- [ ] `/app/rh/pessoas/novo`;
- [ ] `/app/rh/pessoas/[id]` dossiê;
- [ ] edição de dados cadastrais;
- [ ] criação/ativação de vínculo;
- [ ] histórico do vínculo.

### Regras
- [ ] pessoa ≠ usuário;
- [ ] trabalhador ≠ vínculo;
- [ ] documento duplicado por organização tratado;
- [ ] vínculo encerrado não é apagado;
- [ ] status `DRAFT/ACTIVE/SUSPENDED/TERMINATED`.

**Done:** DP cadastra uma pessoa, cria vínculo e consulta o dossiê persistido.

---

## S02 — Empresas, estabelecimentos, lotações e estrutura

**Entrega:** estrutura empregadora usada de verdade pela folha/eSocial.

### Banco
- [ ] `rh_employers`;
- [ ] `rh_establishments`;
- [ ] `rh_tax_allocations`;
- [ ] `rh_positions`;
- [ ] `rh_functions`;
- [ ] `rh_unions`;
- [ ] `rh_collective_instruments`;
- [ ] vigências e histórico.

### Telas
- [ ] Empresas;
- [ ] Estabelecimentos;
- [ ] Lotações tributárias;
- [ ] Cargos;
- [ ] Funções;
- [ ] Sindicatos/instrumentos;
- [ ] validação de vigência.

**Done:** um vínculo pode apontar para empresa, estabelecimento, lotação, cargo, função, sindicato e jornada vigentes.

---

## S03 — Admissão ponta a ponta

**Entrega:** admissão real até vínculo ativo.

### Telas
- [ ] fila de admissões;
- [ ] nova admissão;
- [ ] checklist documental;
- [ ] dados pessoais;
- [ ] dados contratuais;
- [ ] cargo/função/jornada;
- [ ] salário;
- [ ] benefícios iniciais;
- [ ] revisão e ativação.

### Integrações
- [ ] preparar fatos eSocial de admissão;
- [ ] validar dados exigidos pelo leiaute vigente;
- [ ] bloquear ativação quando houver erro impeditivo configurado;
- [ ] ativação transacional/idempotente.

**Done:** um caso de admissão completo gera vínculo ativo e fica pronto para primeira folha/eSocial.

---

## S04 — Contratos, salários e jornadas

**Entrega:** condições de trabalho versionadas.

- [ ] versões contratuais imutáveis;
- [ ] histórico salarial;
- [ ] jornadas e escalas;
- [ ] alterações futuras;
- [ ] retroatividade explícita;
- [ ] telas de alteração;
- [ ] impacto em ponto/folha/eSocial;
- [ ] documentos contratuais vinculados.

---

## S05 — Ponto e banco de horas

**Entrega:** apuração real do período e fatos consumíveis pela folha.

- [ ] jornadas planejadas;
- [ ] marcações append-only;
- [ ] importação/manual;
- [ ] tratamento de inconsistências;
- [ ] faltas/atrasos;
- [ ] horas extras por faixa;
- [ ] adicional noturno;
- [ ] banco de horas em ledger;
- [ ] fechamento de período;
- [ ] payload consolidado para folha;
- [ ] telas de espelho e tratamento.

---

## S06 — Férias e afastamentos

**Entrega:** concessão/afastamento com efeitos na folha e eSocial.

- [ ] direitos aquisitivos;
- [ ] programação;
- [ ] concessão;
- [ ] recibo/aviso;
- [ ] abono;
- [ ] cancelamento/remarcação;
- [ ] afastamentos e retornos;
- [ ] anexos/documentos;
- [ ] fatos de folha;
- [ ] projeções eSocial aplicáveis.

---

## S07 — Benefícios, dependentes, pensões e empréstimos

**Entrega:** movimentos mensais auditáveis para folha.

- [ ] catálogo de benefícios;
- [ ] planos/políticas;
- [ ] adesões;
- [ ] dependentes por finalidade;
- [ ] coparticipações;
- [ ] pensões;
- [ ] consignados/eConsignado;
- [ ] importação de movimentos;
- [ ] fechamento por competência;
- [ ] integração com folha/Financeiro.

---

## S08 — SST funcional

**Entrega:** gestão operacional e eventos SST.

- [ ] riscos/exposições;
- [ ] ASO e aptidão;
- [ ] exames;
- [ ] EPI;
- [ ] treinamentos/habilitações;
- [ ] incidentes/CAT;
- [ ] dados clínicos segregados;
- [ ] projeção de eventos SST eSocial;
- [ ] alertas de validade.

---

# S09 — Folha de Pagamento V1 utilizável

**Entrega:** folha mensal calculável, conferível e fechável.

## 9.1 Banco
- [ ] `rh_payroll_periods`;
- [ ] `rh_rubrics`;
- [ ] `rh_rubric_versions`;
- [ ] `rh_payroll_inputs`;
- [ ] `rh_payroll_runs`;
- [ ] `rh_payroll_worker_results`;
- [ ] `rh_payroll_result_lines`;
- [ ] `rh_payroll_bases`;
- [ ] `rh_payroll_closures`;
- [ ] RLS e constraints.

## 9.2 Motor
- [ ] fórmula `FIXED`;
- [ ] fórmula `QUANTITY_X_RATE`;
- [ ] fórmula `PERCENT_OF_BASE`;
- [ ] fórmula `PROGRESSIVE_TABLE`;
- [ ] dependências entre rubricas;
- [ ] ordenação determinística;
- [ ] arredondamento configurável;
- [ ] memória de cálculo;
- [ ] hash da execução;
- [ ] reprocessamento versionado.

## 9.3 Parametrização
- [ ] rubrica com natureza eSocial;
- [ ] `codIncCP`;
- [ ] `codIncIRRF`;
- [ ] `codIncFGTS`;
- [ ] vigência;
- [ ] fórmula;
- [ ] prioridade;
- [ ] reflexos;
- [ ] contabilização;
- [ ] maker-checker de publicação.

## 9.4 Telas
- [ ] Painel da Folha;
- [ ] Competências;
- [ ] Abrir competência;
- [ ] Rubricas;
- [ ] Nova rubrica;
- [ ] Entradas por trabalhador;
- [ ] Calcular folha;
- [ ] Resultado por trabalhador;
- [ ] Memória de cálculo;
- [ ] Conferência;
- [ ] Fechamento;
- [ ] Reabertura;
- [ ] Demonstrativo.

## 9.5 Processamentos
- [ ] mensal;
- [ ] adiantamento;
- [ ] férias;
- [ ] 13º adiantamento;
- [ ] 13º quitação;
- [ ] complementar;
- [ ] retroativa;
- [ ] rescisória.

**Done:** profissional abre competência, inclui/importa entradas, calcula, confere valores individualmente e fecha uma execução preservando memória/histórico.

---

## S10 — Folha V2: encargos, provisões, contabilidade e pagamento

- [ ] bases previdenciária/IRRF/FGTS;
- [ ] encargos patronais;
- [ ] múltiplos vínculos/acumulados;
- [ ] provisões férias/13º/encargos;
- [ ] rateio por obra/centro de custo;
- [ ] contabilização;
- [ ] ordem de pagamento;
- [ ] arquivo bancário/provider quando houver contrato;
- [ ] retorno bancário;
- [ ] conciliação;
- [ ] recibos/publicação ao trabalhador.

---

# S11 — eSocial: adapter real

**Entrega:** produção restrita funcional antes de produção.

### Baseline oficial
- [ ] leiaute S-1.3/NT vigente registrado;
- [ ] XSDs versionados/referenciados;
- [ ] Manual do Desenvolvedor vigente referenciado;
- [ ] mensagens do sistema versionadas.

### Adapter
- [ ] `ESOCIAL_RESTRICTED_SEND_URL`;
- [ ] `ESOCIAL_RESTRICTED_QUERY_URL`;
- [ ] endpoints de produção separados;
- [ ] certificado ICP-Brasil no cofre/secret store;
- [ ] assinatura XMLDSig;
- [ ] envelope SOAP;
- [ ] envio de lote;
- [ ] protocolo;
- [ ] consulta de processamento;
- [ ] parsing de ocorrência;
- [ ] recibos;
- [ ] idempotência;
- [ ] timeout indeterminado;
- [ ] retry seguro;
- [ ] persistência de request/response protegidos.

### Eventos mínimos
- [ ] S-1000;
- [ ] S-1005;
- [ ] S-1010;
- [ ] S-1020;
- [ ] S-2190 quando estratégia permitir;
- [ ] S-2200;
- [ ] S-2205;
- [ ] S-2206;
- [ ] S-2230;
- [ ] S-2299;
- [ ] S-2300/S-2399 para TSV aplicável;
- [ ] S-1200;
- [ ] S-1210;
- [ ] S-1298;
- [ ] S-1299;
- [ ] S-3000 quando permitido;
- [ ] S-5001/S-5002/S-5003;
- [ ] S-5011/S-5012/S-5013.

### Telas
- [ ] fila de eventos;
- [ ] detalhe do evento;
- [ ] validações;
- [ ] lotes;
- [ ] protocolos;
- [ ] rejeições;
- [ ] correção/retificação/exclusão;
- [ ] fechamento/reabertura;
- [ ] totalizadores;
- [ ] saúde do adapter.

**Done:** produção restrita aceita eventos gerados pela Innovar e o sistema armazena protocolo/recibo/retorno e reconcilia com o fato interno.

---

# S12 — DCTFWeb operacional

**Entrega:** acompanhar e operar a DCTFWeb pelos canais oficiais realmente disponíveis.

- [ ] detectar fechamento eSocial aceito;
- [ ] estado `AWAITING_DCTFWEB_UPDATE`;
- [ ] capability registry para Integra Contador;
- [ ] autenticação/contratação documentada e configurável;
- [ ] eventos de última atualização;
- [ ] consulta de declaração quando capability disponível;
- [ ] APIs oficiais de DCTFWeb habilitadas pelo contrato;
- [ ] fallback `PORTAL_ASSISTED`;
- [ ] importação/exportação MIT JSON;
- [ ] validação contra schema do MIT;
- [ ] transmissão/assinatura conforme canal vigente;
- [ ] recibo;
- [ ] débitos;
- [ ] DARF;
- [ ] pagamento;
- [ ] reconciliação folha × eSocial × DCTFWeb;
- [ ] retificação por correção na origem.

### Telas
- [ ] painel DCTFWeb por competência;
- [ ] comparação de apurações;
- [ ] declaração/recibo;
- [ ] débitos/DARFs;
- [ ] MIT;
- [ ] tarefa assistida no e-CAC;
- [ ] reconciliação.

---

# S13 — FGTS Digital operacional

**Entrega:** operação completa ao redor dos canais oficiais disponíveis.

- [ ] receber bases esperadas da folha;
- [ ] correlacionar S-5003/S-5013;
- [ ] conferência por trabalhador;
- [ ] conferência por estabelecimento;
- [ ] divergências;
- [ ] arquivo de remuneração rescisória conforme leiaute oficial;
- [ ] hash/validação do arquivo;
- [ ] `PORTAL_ASSISTED` para guia enquanto não houver API geral pública comprovada;
- [ ] tarefas de guia rápida/parametrizada;
- [ ] vencimentos;
- [ ] pagamento PIX/evidência;
- [ ] conciliação de pagamento;
- [ ] rescisões;
- [ ] competências anteriores;
- [ ] processos trabalhistas quando aplicável;
- [ ] histórico de guia/substituição/estorno/restituição.

### Telas
- [ ] painel FGTS Digital;
- [ ] bases por trabalhador;
- [ ] divergências;
- [ ] arquivos oficiais;
- [ ] guias;
- [ ] pagamentos;
- [ ] tarefa no portal;
- [ ] reconciliação.

---

## S14 — Desligamento e rescisão ponta a ponta

- [ ] caso de desligamento;
- [ ] aviso;
- [ ] data efetiva;
- [ ] cálculo rescisório;
- [ ] aprovação;
- [ ] recibos/documentos;
- [ ] S-2299/S-2399;
- [ ] FGTS rescisório;
- [ ] pagamento;
- [ ] baixa de acessos/ativos;
- [ ] offboarding;
- [ ] retificação/reintegração.

---

## S15 — Documentos, portal do trabalhador e autosserviço

- [ ] documentos privados;
- [ ] versões;
- [ ] assinatura;
- [ ] recibos de pagamento;
- [ ] comprovantes;
- [ ] férias;
- [ ] dados próprios;
- [ ] solicitações;
- [ ] minimização de dados.

---

## S16 — Relatórios e indicadores profissionais

- [ ] headcount/FTE;
- [ ] admissões/desligamentos;
- [ ] turnover;
- [ ] absenteísmo;
- [ ] horas extras/banco;
- [ ] férias;
- [ ] custo da folha;
- [ ] custo por obra/centro de custo;
- [ ] encargos/provisões;
- [ ] benefícios;
- [ ] SST operacional;
- [ ] obrigações por status;
- [ ] eSocial rejeições;
- [ ] DCTFWeb divergências;
- [ ] FGTS divergências;
- [ ] exportações auditadas.

---

## S17 — Qualidade, segurança e homologação real

- [ ] unit tests do motor;
- [ ] golden masters de folha;
- [ ] SQL/RLS tests;
- [ ] cross-tenant abuse tests;
- [ ] E2E das principais jornadas;
- [ ] acessibilidade;
- [ ] segurança de arquivo;
- [ ] logs sem salário/CPF indevidos;
- [ ] produção restrita eSocial;
- [ ] homologação com dados sintéticos;
- [ ] cálculo sombra com folha real autorizada;
- [ ] reconciliação de diferenças;
- [ ] evidence packages.

---

## S18 — Go-live profissional

- [ ] piloto por empresa/estabelecimento;
- [ ] importação de saldos;
- [ ] cutover;
- [ ] treinamento por persona;
- [ ] runbooks;
- [ ] suporte;
- [ ] hypercare;
- [ ] critérios de saída;
- [ ] operação regular.

---

# 4. Backlog de telas obrigatório

## RH
- [ ] `/app/rh`;
- [ ] `/app/rh/pessoas`;
- [ ] `/app/rh/pessoas/novo`;
- [ ] `/app/rh/pessoas/[id]`;
- [ ] `/app/rh/empresas`;
- [ ] `/app/rh/estabelecimentos`;
- [ ] `/app/rh/estrutura`;
- [ ] `/app/rh/admissoes`;
- [ ] `/app/rh/contratos`;
- [ ] `/app/rh/jornada`;
- [ ] `/app/rh/ponto`;
- [ ] `/app/rh/ferias`;
- [ ] `/app/rh/afastamentos`;
- [ ] `/app/rh/beneficios`;
- [ ] `/app/rh/sst`;
- [ ] `/app/rh/desligamentos`;

## Folha
- [ ] `/app/rh/folha`;
- [ ] `/app/rh/folha/competencias`;
- [ ] `/app/rh/folha/competencias/nova`;
- [ ] `/app/rh/folha/competencias/[id]`;
- [ ] `/app/rh/folha/rubricas`;
- [ ] `/app/rh/folha/rubricas/nova`;
- [ ] `/app/rh/folha/entradas`;
- [ ] `/app/rh/folha/calculos`;
- [ ] `/app/rh/folha/conferencia`;
- [ ] `/app/rh/folha/fechamento`;
- [ ] `/app/rh/folha/pagamentos`;
- [ ] `/app/rh/folha/contabilizacao`;

## Obrigações
- [ ] `/app/rh/obrigacoes`;
- [ ] `/app/rh/obrigacoes/esocial`;
- [ ] `/app/rh/obrigacoes/esocial/eventos/[id]`;
- [ ] `/app/rh/obrigacoes/esocial/lotes`;
- [ ] `/app/rh/obrigacoes/esocial/totalizadores`;
- [ ] `/app/rh/obrigacoes/dctfweb`;
- [ ] `/app/rh/obrigacoes/dctfweb/mit`;
- [ ] `/app/rh/obrigacoes/fgts-digital`;
- [ ] `/app/rh/obrigacoes/reconciliacao`;
- [ ] `/app/rh/obrigacoes/integracoes`.

---

# 5. APIs e recursos oficiais — política de implementação

## eSocial
Canal oficial direto: Web Services SOAP com XML/XSD e certificado digital. Produção restrita e produção são ambientes separados. Endpoints e versões devem permanecer configuráveis e versionados.

## DCTFWeb
A DCTFWeb é sensibilizada automaticamente pelos encerramentos bem-sucedidos do eSocial/EFD-Reinf. Serviços API podem ser consumidos via Integra Contador quando contratados/autorizados. MIT possui JSON oficial de importação. Onde a operação não estiver exposta por API contratada, usar `PORTAL_ASSISTED` com evidência e reconciliação.

## FGTS Digital
A base é alimentada governamentalmente a partir do eSocial. Há leiaute oficial para remuneração rescisória. Não presumir API geral de empregador sem documentação oficial. Enquanto a operação estiver apenas no portal, usar `PORTAL_ASSISTED` e controlar a tarefa/evidência dentro da Innovar.

---

# 6. Sequência de execução

A execução deve seguir S00 → S18, mas uma sprint só é concluída quando o software correspondente existe e passa nos seus checks. Itens podem ser implementados em paralelo quando não quebram dependências, porém não recebem `[x]` por antecipação.

**Próxima ação técnica:** implementar S00 + primeira fatia de S01 e S09 no repositório, validando o padrão real de autorização, menus e persistência da Innovar.
