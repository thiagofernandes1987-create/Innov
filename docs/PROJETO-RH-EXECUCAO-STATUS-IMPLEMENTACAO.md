# Projeto RH — Estado Factual da Implementação

**Data-base:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**PR:** #42  
**Regra:** este arquivo registra somente código realmente criado e evidência realmente executada. Planejamento e especificação não contam como implementação.

## 1. Escala

- `[x] VALIDADO` — código implementado e gate específico executado com sucesso no head correspondente;
- `[~] IMPLEMENTADO` — código criado, mas gate do head mais recente ainda não confirmado;
- `[>] PARCIAL` — existe vertical funcional, mas faltam capacidades para uso completo do módulo;
- `[ ] PENDENTE` — ainda não existe implementação suficiente para operação profissional.

## 2. Fundação do aplicativo

- [x] VALIDADO — aplicativo `rh` registrado no launcher;
- [x] VALIDADO — navegação contextual RH;
- [x] VALIDADO — autorização `requireCapability("rh", ...)`;
- [x] VALIDADO — RLS com `has_module_permission`;
- [x] VALIDADO — proteção cross-tenant por FKs compostas;
- [x] VALIDADO — workflow `RH Functional` separado das dívidas globais preexistentes;
- [x] VALIDADO — migrations RH passam pelo validador estrutural;
- [x] VALIDADO — typecheck e lint do escopo RH passaram no gate dedicado antes das últimas expansões governamentais.

## 3. Pessoas, empregados e estrutura

- [x] VALIDADO — `rh_people`;
- [x] VALIDADO — `rh_workers`;
- [x] VALIDADO — `rh_employments`;
- [x] VALIDADO — criação transacional pessoa → trabalhador → vínculo;
- [x] VALIDADO — lista de pessoas;
- [x] VALIDADO — formulário de novo trabalhador;
- [x] VALIDADO — dossiê individual;
- [x] VALIDADO — empresas empregadoras;
- [x] VALIDADO — estabelecimentos;
- [x] VALIDADO — lotações tributárias;
- [x] VALIDADO — cargos e CBO;
- [x] VALIDADO — funções;
- [x] VALIDADO — sindicatos/categorias;
- [x] VALIDADO — jornadas contratuais;
- [x] VALIDADO — condições do vínculo por vigência;
- [x] VALIDADO — intervalo temporal semiaberto e bloqueio de sobreposição;
- [x] VALIDADO — salário vigente associado à condição.

## 4. Admissão

- [x] VALIDADO — caso de admissão separado do vínculo;
- [x] VALIDADO — formulário completo de pré-admissão;
- [x] VALIDADO — checklist obrigatório;
- [x] VALIDADO — estratégia eSocial `S-2200` / `S-2190 → S-2200` registrada;
- [x] VALIDADO — ativação bloqueada com checklist pendente;
- [x] VALIDADO — ativação transacional e idempotente;
- [x] VALIDADO — criação da condição inicial do vínculo;
- [>] PARCIAL — projeção automática do XML S-2190/S-2200 ainda não implementada;
- [>] PARCIAL — assinatura XMLDSig automática ainda não implementada;
- [>] PARCIAL — aceite eSocial ainda não bloqueia/autoriza automaticamente a ativação conforme política configurada.

## 5. Folha de pagamento

### 5.1 Núcleo

- [x] VALIDADO — competências;
- [x] VALIDADO — tipos de processamento no modelo;
- [x] VALIDADO — lançamentos por trabalhador e rubrica;
- [x] VALIDADO — rubricas com identidade estável e versões;
- [x] VALIDADO — fórmulas `MANUAL`, `FIXED`, `QUANTITY_X_RATE`, `PERCENT_OF_AMOUNT`;
- [x] VALIDADO — cálculo individual e em lote;
- [x] VALIDADO — memória/trace por linha;
- [x] VALIDADO — bruto, descontos e líquido;
- [x] VALIDADO — fechamento atômico;
- [x] VALIDADO — recálculo proibido após fechamento;
- [x] VALIDADO — vigência de rubrica e sobreposição protegidas;
- [x] VALIDADO — rubrica criada transacionalmente;

### 5.2 Motor parametrizado V2

- [x] VALIDADO — bases declarativas;
- [x] VALIDADO — composição de bases por rubrica e fator;
- [x] VALIDADO — teste negativo provou e corrigiu contaminação de base;
- [x] VALIDADO — parâmetros versionados por vigência;
- [x] VALIDADO — fórmulas `PERCENT_OF_BASE`, `BRACKET_DEDUCTION`, `MARGINAL_PROGRESSIVE`;
- [x] VALIDADO — cálculo progressivo determinístico;
- [x] VALIDADO — interface para bases, membros e parâmetros;
- [x] VALIDADO — interface para rubrica automática derivada;
- [x] VALIDADO — template oficial de referência INSS 2026 versionado como dado;
- [x] VALIDADO — template oficial de referência IRRF 2026 preserva tabela + redução específica;
- [x] VALIDADO — combinação incompatível do IRRF 2026 com cálculo simplificado é bloqueada;
- [>] PARCIAL — regra completa de redução mensal do IRRF 2026 ainda precisa de fórmula específica executável;
- [>] PARCIAL — dependentes/deduções de IRRF ainda não alimentam automaticamente a base;
- [>] PARCIAL — múltiplos vínculos/acumulados previdenciários ainda não estão completos;
- [>] PARCIAL — férias, 13º, rescisão, complementar e retroativos existem como tipos, mas não possuem todos os algoritmos especializados completos;
- [>] PARCIAL — provisões e contabilização ainda não possuem ciclo operacional completo;
- [>] PARCIAL — ordem/pagamento bancário e retorno ainda não estão implementados no RH.

## 6. eSocial

### 6.1 Transporte

- [x] VALIDADO — endpoints oficiais separados de Produção Restrita e Produção;
- [x] VALIDADO — Produção bloqueada por padrão;
- [x] VALIDADO — mTLS via PFX ou PEM no servidor;
- [x] VALIDADO — allowlist `*.esocial.gov.br`;
- [x] VALIDADO — evento precisa estar individualmente assinado antes do lote;
- [x] VALIDADO — lote 1–50 eventos;
- [x] VALIDADO — mesmo ambiente, grupo, empregador e transmissor por lote;
- [x] VALIDADO — persistência de evento, lote e tentativa;
- [x] VALIDADO — protocolo persistido após resposta do envio;
- [x] VALIDADO — timeout tratado como resultado indeterminado;
- [x] VALIDADO — separação de rejeição de negócio e erro técnico;
- [x] VALIDADO — tela de fila de eventos/lotes;
- [x] VALIDADO — tela de envio e consulta de lote;
- [x] VALIDADO — XML bruto não é exibido por padrão no dossiê do evento;

### 6.2 Processamento individual

- [~] IMPLEMENTADO — parser de resultados por `Id` do evento;
- [~] IMPLEMENTADO — extração de recibo individual;
- [~] IMPLEMENTADO — extração de código/descrição/ocorrências;
- [~] IMPLEMENTADO — RPC para persistir `ACCEPTED`, `REJECTED`, `PROCESSING`, `UNKNOWN` por evento;
- [~] IMPLEMENTADO — lote finalizado a partir dos estados dos filhos;
- [~] IMPLEMENTADO — action de consulta que aplica os retornos individuais;
- [~] IMPLEMENTADO — testes Vitest e PostgreSQL próprios criados; gates mais recentes precisam ser confirmados antes de virar `VALIDADO`;
- [>] PARCIAL — a tela de lote ainda precisa ser ligada explicitamente à nova action individual caso o gate revele que o action antigo permanece conectado;

### 6.3 Geração dos eventos

- [ ] PENDENTE — gerador S-1000;
- [ ] PENDENTE — gerador S-1005;
- [ ] PENDENTE — gerador S-1010;
- [ ] PENDENTE — gerador S-1020;
- [ ] PENDENTE — gerador S-2190;
- [ ] PENDENTE — gerador S-2200;
- [ ] PENDENTE — gerador S-2205/S-2206;
- [ ] PENDENTE — gerador S-2230;
- [ ] PENDENTE — geradores SST;
- [ ] PENDENTE — S-2299/S-2399;
- [ ] PENDENTE — S-1200/S-1210;
- [ ] PENDENTE — S-1298/S-1299;
- [ ] PENDENTE — validação automática contra XSD por versão;
- [ ] PENDENTE — assinatura XMLDSig automática por evento.

## 7. DCTFWeb

- [~] IMPLEMENTADO — cadastro/acompanhamento por competência;
- [~] IMPLEMENTADO — estados da declaração;
- [~] IMPLEMENTADO — marcação de fechamento eSocial/EFD-Reinf;
- [~] IMPLEMENTADO — MIT como estado separado;
- [~] IMPLEMENTADO — snapshot externo com ID, recibo, débitos e pagamentos;
- [~] IMPLEMENTADO — itens de reconciliação interno × externo;
- [~] IMPLEMENTADO — divergência explícita e ação necessária;
- [~] IMPLEMENTADO — telas de lista e detalhe;
- [~] IMPLEMENTADO — testes de banco e gate dedicado criados; aguardar resultado do head mais recente;
- [ ] PENDENTE — adapter real Integra Contador depende de contratação/credenciais/capabilities disponibilizadas;
- [ ] PENDENTE — geração/validação completa do MIT JSON pelo schema oficial;
- [ ] PENDENTE — consulta/transmissão automática de DCTFWeb onde a capability oficial contratada permitir;
- [ ] PENDENTE — integração automática DARF/pagamento por serviço oficial disponível.

## 8. FGTS Digital

- [~] IMPLEMENTADO — período operacional derivado da folha calculada;
- [~] IMPLEMENTADO — projeção por trabalhador;
- [~] IMPLEMENTADO — base esperada configurável;
- [~] IMPLEMENTADO — valor esperado vindo de rubrica configurada, sem alíquota hard-coded na RPC;
- [~] IMPLEMENTADO — registro de base/valor externo por trabalhador;
- [~] IMPLEMENTADO — cálculo de divergência;
- [~] IMPLEMENTADO — guia por canal `PORTAL_ASSISTED`, `OFFICIAL_FILE_IMPORT` ou `DIRECT_API`;
- [~] IMPLEMENTADO — pagamento parcial e total com evidência;
- [~] IMPLEMENTADO — telas de lista e detalhe;
- [~] IMPLEMENTADO — testes de banco e gate dedicado criados; aguardar resultado do head mais recente;
- [ ] PENDENTE — geração do arquivo oficial de remunerações rescisórias;
- [ ] PENDENTE — importação automática do resultado/arquivo oficial;
- [ ] PENDENTE — captura automática de guias somente se API oficial futura/contratada existir;
- [ ] PENDENTE — integração financeira automática da guia/pagamento.

## 9. Módulos ainda não transformados em verticais profissionais completas

- [ ] PENDENTE — jornada/escala operacional completa;
- [ ] PENDENTE — ponto/marcação/tratamento/apuração/banco de horas;
- [ ] PENDENTE — férias completas e cálculo especializado;
- [ ] PENDENTE — afastamentos e retorno;
- [ ] PENDENTE — benefícios e fornecedor/coparticipação;
- [ ] PENDENTE — SST/ASO/EPI/treinamentos e geradores eSocial;
- [ ] PENDENTE — desligamento/rescisão/offboarding ponta a ponta;
- [ ] PENDENTE — documentos RH completos em todas as jornadas;
- [ ] PENDENTE — recibos/portal do trabalhador;
- [ ] PENDENTE — relatórios gerenciais sobre as tabelas implementadas;
- [ ] PENDENTE — indicadores de RH executáveis;
- [ ] PENDENTE — pagamentos/contabilidade/provisões de folha completos;
- [ ] PENDENTE — homologação real Produção Restrita eSocial com certificado de teste/empresa;
- [ ] PENDENTE — piloto profissional com dados controlados;
- [ ] PENDENTE — produção.

## 10. Dívidas externas ao RH que permanecem visíveis

- CI canônico do repositório continua afetado pela numeração preexistente das vacinas;
- typecheck global continua afetado por erros preexistentes de Planejamento/Projetos/Launcher;
- essas dívidas não são mascaradas pelo workflow RH;
- o gate RH dedicado existe justamente para distinguir falha do módulo RH de falha histórica do monólito.

## 11. Próxima ordem de execução

1. confirmar gates do parser/resultado individual e DCTFWeb/FGTS;
2. ligar consulta da tela eSocial ao processamento individual validado;
3. gerar/validar/assinar automaticamente S-1010, S-1005 e S-1020;
4. ligar admissão aos S-2190/S-2200;
5. implementar ponto → folha;
6. implementar férias/afastamentos → folha/eSocial;
7. implementar benefícios → folha;
8. implementar SST → eSocial;
9. implementar desligamento → rescisão/eSocial/FGTS;
10. completar folha especializada, provisões, contabilidade e pagamentos;
11. implementar MIT JSON e capabilities contratadas DCTFWeb;
12. gerar arquivo oficial rescisório FGTS;
13. relatórios, indicadores e portal do trabalhador;
14. homologação Produção Restrita;
15. piloto e produção.
