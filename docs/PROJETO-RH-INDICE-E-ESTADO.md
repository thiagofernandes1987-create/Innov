# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.14.0  
**Atualizado em:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Implementação:** não iniciada  
**Produção:** não liberada  

---

## 1. Finalidade

Este arquivo registra o estado atual da especificação funcional, técnica e de planejamento do Projeto RH sem substituir os documentos detalhados.

A especificação principal permanece em `PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`. Cada módulo e decisão arquitetural possui documento próprio para preservar o histórico e evitar que uma atualização de estado apague requisitos anteriores.

---

## 2. Documentos

| Ordem | Documento | Estado |
|---:|---|---|
| 00 | `PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md` | visão e requisitos transversais iniciais registrados |
| ADR-001 | `PROJETO-RH-ADR-001-PESSOA-TRABALHADOR-VINCULO.md` | decisão funcional registrada |
| Módulo 01 | `PROJETO-RH-MODULO-01-CADASTRO-MESTRE.md` | especificação funcional inicial concluída |
| ADR-002 | `PROJETO-RH-ADR-002-TENANT-EMPRESA-ESTABELECIMENTO.md` | decisão funcional registrada |
| Módulo 02 | `PROJETO-RH-MODULO-02-ESTRUTURA-ORGANIZACIONAL.md` | especificação funcional inicial concluída |
| ADR-003 | `PROJETO-RH-ADR-003-ADMISSAO-CASO-AUDITAVEL.md` | decisão funcional registrada |
| Módulo 03 | `PROJETO-RH-MODULO-03-ADMISSAO-PRE-ADMISSAO.md` | especificação funcional inicial concluída |
| ADR-004 | `PROJETO-RH-ADR-004-CONTRATO-VERSOES-E-ALTERACOES.md` | decisão funcional registrada |
| Módulo 04 | `PROJETO-RH-MODULO-04-CONTRATOS-E-ALTERACOES.md` | especificação funcional inicial concluída |
| ADR-005 | `PROJETO-RH-ADR-005-JORNADA-MARCACAO-TRATAMENTO-E-BANCO.md` | decisão funcional registrada |
| Módulo 05 | `PROJETO-RH-MODULO-05-JORNADAS-PONTO-E-BANCO-DE-HORAS.md` | especificação funcional inicial concluída |
| ADR-006 | `PROJETO-RH-ADR-006-FERIAS-AFASTAMENTOS-E-AUSENCIAS.md` | decisão funcional registrada |
| Módulo 06 | `PROJETO-RH-MODULO-06-FERIAS-AFASTAMENTOS-E-LICENCAS.md` | especificação funcional inicial concluída |
| ADR-007 | `PROJETO-RH-ADR-007-BENEFICIOS-DEPENDENTES-E-DESCONTOS.md` | decisão funcional registrada |
| Módulo 07 | `PROJETO-RH-MODULO-07-BENEFICIOS-DEPENDENTES-E-DESCONTOS.md` | especificação funcional inicial concluída |
| ADR-008 | `PROJETO-RH-ADR-008-SST-RISCOS-SAUDE-E-HABILITACAO.md` | decisão funcional registrada |
| Módulo 08 | `PROJETO-RH-MODULO-08-SST-RISCOS-EXAMES-E-HABILITACOES.md` | especificação funcional inicial concluída |
| Anexo M08 | `PROJETO-RH-MODULO-08-ANEXO-CONSTRUCAO-RISCOS-CRITICOS-E-PSICOSSOCIAIS.md` | complemento vinculante concluído |
| ADR-009 | `PROJETO-RH-ADR-009-FOLHA-CALCULO-RUBRICAS-E-FECHAMENTO.md` | decisão funcional registrada |
| Módulo 09 | `PROJETO-RH-MODULO-09-FOLHA-RUBRICAS-CALCULO-E-FECHAMENTO.md` | especificação funcional inicial concluída |
| ADR-010 | `PROJETO-RH-ADR-010-FATO-PROJECAO-RECIBO-TOTALIZADOR-E-OBRIGACAO.md` | decisão funcional registrada |
| Módulo 10 | `PROJETO-RH-MODULO-10-OBRIGACOES-DIGITAIS-E-RECONCILIACAO.md` | especificação funcional inicial concluída |
| ADR-011 | `PROJETO-RH-ADR-011-DESLIGAMENTO-CASO-RESCISAO-E-OFFBOARDING.md` | decisão funcional registrada |
| Módulo 11 | `PROJETO-RH-MODULO-11-DESLIGAMENTOS-RESCISOES-E-OFFBOARDING.md` | especificação funcional inicial concluída |
| ADR-012 | `PROJETO-RH-ADR-012-METRICA-ANALISE-CENARIO-E-DECISAO.md` | decisão funcional registrada |
| Módulo 12 | `PROJETO-RH-MODULO-12-RELATORIOS-PEOPLE-ANALYTICS-E-PLANEJAMENTO.md` | especificação funcional inicial concluída |
| ADR-013 | `PROJETO-RH-ADR-013-MONOLITO-MODULAR-TRANSACOES-E-PROJECOES.md` | decisão técnica registrada |
| Módulo 13 | `PROJETO-RH-MODULO-13-ARQUITETURA-TECNICA-DADOS-APIS-SEGURANCA-E-ROADMAP.md` | especificação técnica inicial concluída |
| ADR-014 | `PROJETO-RH-ADR-014-PLANO-EXECUCAO-EVIDENCIA-E-LIBERACAO.md` | decisão de planejamento registrada |
| Módulo 14 | `PROJETO-RH-MODULO-14-BACKLOG-EXECUTAVEL-SPRINTS-GATES-E-HOMOLOGACAO.md` | planejamento executável inicial concluído |

---

## 3. Decisões consolidadas

### 3.1 Pessoa, usuário, trabalhador e vínculo

```text
Pessoa → Trabalhador → Vínculo → Condições vigentes → Alocações
```

- pessoa não depende de login;
- usuário não comprova vínculo;
- equipe de obra não será cadastro mestre de empregado;
- desligamento não apaga histórico;
- alocação operacional não substitui contrato.

### 3.2 Tenant, empresa e estabelecimento

```text
Organização da plataforma
  └─ Empresa empregadora
       └─ Estabelecimento
```

- `organizations` permanece como tenant e fronteira de autorização;
- empresa empregadora será entidade explícita;
- estabelecimento pertencerá à empresa;
- obra continuará separada do estabelecimento;
- uma organização poderá administrar mais de uma empresa.

### 3.3 Estrutura organizacional

- unidade organizacional, cargo, função, posição e lotação são conceitos distintos;
- reorganizações terão vigência;
- hierarquias não poderão conter ciclos;
- registros utilizados por histórico serão encerrados, não apagados;
- ocupação de posição será derivada de lotações aprovadas.

### 3.4 Centros de custo

- RH não criará catálogo manual paralelo;
- `finance_cost_centers` é a estrutura existente a ser reconciliada;
- a arquitetura alvo terá um centro de custo canônico compartilhado;
- migration futura deverá preservar referências existentes sempre que possível;
- alocação em obra não altera rateio contábil silenciosamente.

### 3.5 Admissão como caso auditável

```text
Pessoa
  → Trabalhador
    → Caso de admissão
      → Checklist, documentos, condições, aprovações e eventos
        → Ativação explícita
          → Vínculo ativo
```

- pré-admissão não será vínculo ativo;
- registro preliminar externo não será tratado como admissão concluída;
- checklist aplicado manterá versão e vigência;
- documento recebido não equivale a documento conferido;
- pendência impeditiva bloqueará ativação;
- dispensa exigirá permissão, justificativa e auditoria;
- ativação será transacional, explícita e idempotente;
- caso cancelado ou rejeitado permanecerá no histórico.

### 3.6 Contrato, versões e alterações

```text
Vínculo
  └─ Contrato
       ├─ Versão contratual atual
       ├─ Versões históricas
       └─ Versões futuras

Solicitação de alteração
  → diferenças
  → validações
  → aprovações
  → documentos
  → aplicação
  → nova versão imutável
```

- vínculo permanece raiz estável;
- condições contratuais serão versões imutáveis;
- vigência e instante de registro serão tempos distintos;
- alteração, correção, retificação externa e reprocessamento são objetos diferentes;
- documento é evidência e não única fonte canônica;
- alteração futura não substituirá antecipadamente a condição atual;
- alteração retroativa gerará impactos explícitos;
- aplicação será transacional e idempotente;
- folha e eventos externos referenciarão a versão utilizada.

### 3.7 Jornada, marcação, tratamento e banco de horas

```text
Jornada contratual versionada
  → Escala planejada
    → Turno concreto
      → Marcações originais
        → Tratamentos aprovados
          → Apuração versionada
            → Banco de horas e eventos para folha
              → Fechamento
```

- jornada contratual não gera marcação automática;
- escala planejada não prova trabalho realizado;
- marcação original será append-only;
- tratamento não altera o evento bruto;
- marcação fora do horário planejado será recebida e sinalizada;
- falta de autorização de sobrejornada não impedirá a marcação;
- eventos offline manterão hora do fato e hora de sincronização;
- Diário de Obras e tarefas servirão como evidência, não como fonte canônica do ponto;
- políticas de apuração possuirão versão e vigência;
- banco de horas exigirá acordo aplicável;
- saldo será derivado de razão imutável de movimentos;
- período fechado somente mudará por reabertura controlada;
- folha receberá lote fechado, versionado e idempotente;
- localização e biometria terão finalidade e autorização segregadas.

### 3.8 Férias, ausências, afastamentos e retorno

```text
Direito de férias
  → programação
  → aviso e ciência
  → cálculo e pagamento
  → gozo

Ausência detectada
  → justificativa ou caso de afastamento
  → documentos e decisões
  → benefício e evento externo
  → retorno explícito
```

- período aquisitivo será distinto da concessão;
- saldo será reproduzível por movimentos imutáveis;
- programação não será tratada como gozo;
- ausência do ponto não será afastamento automático;
- documento recebido não será decisão automática;
- atestado e benefício externo serão objetos diferentes;
- motivo interno e código externo serão mapeados, não unificados;
- férias pagas canceladas gerarão tratamento financeiro;
- sobreposições serão resolvidas por matriz versionada;
- retorno poderá exigir avaliação ocupacional;
- restrição operacional não revelará diagnóstico;
- alteração retroativa produzirá impactos e reprocessamentos;
- eventos externos preservarão payload, recibo e correlação.

### 3.9 Benefícios, dependentes, pensões e descontos

```text
Catálogo de benefício
  → política e elegibilidade
    → plano e preços
      → adesão
        → pessoas cobertas
          → concessões, cobranças e conciliações

Pessoa relacionada
  → papéis independentes por finalidade

Obrigação ou autorização
  → fórmula versionada
    → instrução por competência
      → resultado da folha
        → pagamento ou repasse
```

- relação familiar e papel por finalidade são objetos distintos;
- pessoa coberta não será automaticamente dependente tributário;
- alimentando não será automaticamente dependente;
- beneficiário de seguro não será automaticamente pessoa coberta;
- rubrica não substituirá catálogo, política ou adesão;
- cobrança do fornecedor não criará adesão;
- custo patronal, contribuição e coparticipação serão separados;
- todo desconto possuirá fonte identificada;
- fórmulas e autorizações terão versão e vigência;
- valor não descontado não será considerado quitado;
- estorno será movimento compensatório;
- folha, fornecedor e financeiro serão conciliados;
- dados familiares, judiciais e bancários terão acesso segregado;
- parâmetros legais e externos serão versionados.

### 3.10 Riscos, saúde ocupacional, incidentes e habilitação

```text
Contexto de trabalho
  → perigos e avaliações versionadas
    → medidas e plano de ação
      → grupos e perfis individuais de exposição

Programa médico
  → necessidade de exame
    → atendimento e documentos clínicos protegidos
      → ASO e conclusão operacional

Incidente
  → investigação e ações
    → CAT quando aplicável

EPI + treinamento + aptidão + permissão
  → habilitação operacional
```

- risco, exposição, exame, ASO, EPI, treinamento e autorização são objetos diferentes;
- inventários, avaliações e perfis terão vigência;
- alteração não reescreverá o histórico;
- EPI não substituirá automaticamente controle coletivo;
- entrega não comprovará uso ou eficácia;
- ASO não será prontuário clínico;
- gestores verão aptidão e restrições operacionais, não diagnóstico;
- treinamento concluído não produzirá habilitação sem os demais requisitos;
- certificado vencido poderá suspender a autorização correspondente;
- incidente não criará CAT automaticamente;
- CAT e eventos externos manterão payload, hash, recibo e correlação;
- Diário de Obras será evidência complementar, não fonte canônica de SST;
- acesso clínico e exportações sensíveis terão auditoria reforçada.

### 3.11 Folha, rubricas, cálculo e fechamento

```text
Competência
  → ciclo e população congelada
    → fatos e entradas versionadas
      → rubricas, fórmulas e parâmetros vigentes
        → execução determinística
          → demonstrativos, bases e encargos
            → conferência e aprovação
              → fechamento
                → pagamentos, contabilidade e eventos externos
```

- fato, entrada, rubrica, fórmula e resultado são objetos diferentes;
- rubricas, fórmulas, parâmetros e arredondamentos terão versão e vigência;
- fórmulas serão declarativas e não executarão código arbitrário;
- cálculos e demonstrativos não serão sobrescritos;
- ajuste manual será explícito e aprovado;
- valor devido e pagamento efetivo serão separados;
- remuneração, pagamento e fechamento externo serão projeções distintas;
- folha complementar e diferença retroativa preservarão a folha originária;
- fechamento será atômico;
- reabertura preservará todas as versões anteriores;
- rateio por obra ou centro de custo não alterará o líquido;
- eventos externos manterão payload, hash, recibo e correlação;
- nenhuma faixa, alíquota ou limite de 2026 será regra eterna no código.

### 3.12 Fato, projeção, recibo, totalizador e obrigação

```text
Fato interno aprovado
  → obrigação aplicável
    → projeção versionada
      → validação e aprovação
        → lote e tentativa
          → retorno e recibo
            → totalizador ou declaração
              → débito
                → guia
                  → pagamento
                    → reconciliação
```

- fato interno não depende da disponibilidade externa;
- projeção preservará snapshots e versões de origem;
- payload aprovado será imutável;
- tentativa de transmissão será append-only;
- reenvio técnico, retificação, exclusão e reprocessamento serão distintos;
- recibo não significará totalização, declaração ou quitação;
- totalizador externo não substituirá a memória da folha;
- fechamento do eSocial não será confundido com transmissão da DCTFWeb;
- DCTFWeb será tratada como declaração derivada das escriturações aplicáveis;
- FGTS Digital será reconciliado por trabalhador, competência, débito, guia e pagamento;
- guia emitida não será considerada paga;
- produção e produção restrita terão credenciais e filas segregadas;
- certificados e segredos não aparecerão em logs;
- indisponibilidade externa não apagará fato ou obrigação;
- reconciliações de evento, totalizador, débito, guia e pagamento serão independentes.

### 3.13 Desligamento, rescisão e offboarding

```text
Intenção ou gatilho
  → caso auditável
    → fundamento, proteções e aprovação
      → aviso e projeção
        → término confirmado
          → cálculo rescisório versionado
            → documentos e pagamento
              → eventos e recolhimentos
                → offboarding
                  → conclusão
```

- solicitação de desligamento não encerrará o vínculo;
- razão interna, fundamento jurídico e código externo serão separados;
- aviso, último dia trabalhado, desligamento e projeção terão datas próprias;
- proteções e estabilidades serão avaliadas por regra vigente;
- justa causa exigirá evidências, análise e aprovação segregadas;
- cálculo aprovado será imutável e reproduzível;
- valor devido, pago e declarado permanecerão reconciliáveis;
- documento será evidência, não única fonte canônica;
- S-2299 e S-2399 serão projeções externas;
- FGTS, guia e pagamento terão estados independentes;
- revogação emergencial de acesso não encerrará o vínculo;
- ausência de devolução de ativo não gerará desconto automático;
- caso coletivo não substituirá casos individuais;
- reintegração não apagará o desligamento original;
- conclusão exigirá pendências obrigatórias resolvidas ou formalmente excepcionadas.

### 3.14 Métrica, análise, cenário e decisão

```text
Fato canônico
  → definição versionada de métrica
    → execução reproduzível
      → observação agregada
        → relatório ou dashboard
          → análise
            → cenário ou previsão
              → recomendação
                → decisão humana registrada
```

- analytics não será fonte canônica dos fatos;
- dashboard não será definição de métrica;
- métrica e observação serão objetos diferentes;
- toda observação manterá versão, fontes, filtros, população, corte e qualidade;
- pessoa, vínculo, posição, headcount e FTE não serão confundidos;
- fato, vigência, registro, processamento e publicação terão tempos próprios;
- correção retroativa não apagará a observação originalmente publicada;
- grupos pequenos serão suprimidos ou generalizados conforme política versionada;
- dados sensíveis terão finalidade, acesso e agregação reforçados;
- relatório operacional e relatório estatístico terão contratos diferentes;
- exportação será distinta de visualização e terá auditoria própria;
- usuários de negócio não executarão SQL arbitrário;
- correlação não será apresentada como causalidade;
- modelos terão versões, explicabilidade, testes de viés e monitoramento de drift;
- decisão relevante não será tomada exclusivamente por automação;
- score único de trabalhador, ranking por atestados ou acidentes e inferência de emoção serão proibidos;
- cenário não será posição, contratação, orçamento ou ação aprovada;
- planejamento de obras considerará capacidade, competência, segurança, qualidade, método e contexto;
- recomendações somente originarão propostas para fluxos canônicos;
- decisões humanas e divergências em relação ao modelo serão auditáveis.

### 3.15 Arquitetura técnica, transações e projeções

```text
Interface Next.js
  → comando ou consulta tipada
    → autorização e validação
      → RPC ou transação de domínio
        → estado canônico e trilha
          → outbox e jobs
            → integração externa
              → projeção reconstruível
```

- o RH permanecerá no monólito modular nesta fase;
- bounded contexts possuirão ownership explícito de tabelas;
- contexto não gravará diretamente em tabela interna de outro contexto;
- Server Components serão padrão de leitura;
- Server Actions coordenarão comandos internos autenticados;
- Route Handlers serão usados para APIs, webhooks e downloads;
- invariantes multi-tabela ficarão em RPCs transacionais;
- `SECURITY DEFINER` terá `search_path`, autorização e grants mínimos;
- capacidades de domínio complementarão as capacidades genéricas existentes;
- RLS e grants serão explícitos e default deny;
- dados clínicos, judiciais, jobs e payloads protegidos poderão usar schemas privados;
- fatos e outbox serão confirmados na mesma transação;
- consumidores e integrações serão idempotentes;
- entrega externa será tratada como pelo menos uma vez;
- timeout externo poderá exigir estado incerto e reconciliação;
- migrations serão append-only e usarão expand/contract;
- backfills terão dry-run, checkpoint, idempotência e reconciliação;
- feature flags controlarão rollout, sem substituir autorização;
- folha iniciará em cálculo sombra;
- analytics começará com projeções PostgreSQL governadas;
- microserviços, particionamento e data warehouse dependerão de evidência de escala;
- produção dependerá de gates, rollback, backup/restore e operação assistida.

### 3.16 Plano, execução, evidência e liberação

```text
Objetivo do produto
  → épico
    → história ou enabler
      → tarefas e testes
        → implementação
          → evidências reproduzíveis
            → homologação técnica
              → aceite funcional
                → decisão de liberação
                  → operação assistida
```

- planejamento não será evidência de entrega;
- sprint será unidade lógica e não promessa de prazo;
- backlog será rastreável aos requisitos e critérios dos módulos 01 a 13;
- dependências formarão grafo acíclico;
- Sprint 00 saneará branch, mergeabilidade, CI, vacinas, ledger e ambientes;
- nenhuma migration RH começará antes do Gate G00;
- Definition of Ready será obrigatória;
- Definition of Done incluirá código, segurança, testes, documentação, CI e evidências;
- implementado, verificado, homologado, aceito, liberado e estabilizado serão estados distintos;
- homologação usará dados artificiais e cleanup;
- folha oficial dependerá de cálculo sombra e reconciliação;
- obrigações digitais dependerão de produção restrita;
- estimativas serão relativas até existir capacidade observada;
- gate crítico não será autodeclarado pelo implementador;
- merge não autorizará produção automática;
- rollout será gradual, reversível e assistido.

---

## 4. Progresso funcional, técnico e de planejamento

### Concluído

- [x] visão de produto e mapa preliminar dos domínios;
- [x] perfis, capacidades e requisitos transversais iniciais;
- [x] Cadastro Mestre;
- [x] decisão Pessoa × Usuário × Trabalhador × Vínculo;
- [x] decisão Tenant × Empresa × Estabelecimento;
- [x] empresas, estabelecimentos e estrutura organizacional;
- [x] unidades, cargos, funções, posições e lotações;
- [x] centros de custo e rateios;
- [x] integração conceitual com Obras, Equipes e Financeiro;
- [x] decisão Admissão como Caso Auditável;
- [x] admissão, pré-admissão, checklist, conferência e ativação;
- [x] decisão Contrato × Versão × Alteração × Documento;
- [x] contratos, versões, alterações, documentos e impactos;
- [x] decisão Jornada × Escala × Marcação × Tratamento × Apuração × Banco;
- [x] políticas de jornada, escalas, marcações, tratamentos, apuração e banco de horas;
- [x] fechamento, reabertura e integração com folha;
- [x] integração com Obras, Diário de Obras, Equipes, Tarefas e custos;
- [x] decisão Direito de Férias × Concessão × Ausência × Afastamento × Benefício × Retorno;
- [x] políticas e motivos de férias e afastamentos;
- [x] períodos aquisitivos e movimentos de saldo;
- [x] férias individuais, fracionamento e abono;
- [x] aviso, ciência, cálculo, pagamento e gozo;
- [x] remarcação, cancelamento e férias coletivas;
- [x] ausências, justificativas e reconciliação com ponto;
- [x] casos de afastamento, documentos e prorrogações;
- [x] benefícios e decisões externas;
- [x] eventos governamentais e correlação com SST;
- [x] retorno, aptidão e restrições operacionais;
- [x] matriz de sobreposição;
- [x] decisão Benefício × Plano × Adesão × Cobertura × Dependente × Alimentando × Desconto;
- [x] catálogo de benefícios e políticas por vigência;
- [x] planos, fornecedores e tabelas de preço;
- [x] adesões, coberturas, inclusões e exclusões;
- [x] relações entre pessoas e papéis por finalidade;
- [x] dependentes tributários e de benefícios;
- [x] beneficiários de seguro e auxílios;
- [x] vale-transporte, alimentação, saúde, odontologia e benefícios configuráveis;
- [x] pensão alimentícia e retenções judiciais;
- [x] descontos recorrentes e autorizações;
- [x] movimentos financeiros e estornos;
- [x] arquivos e conciliação de fornecedores;
- [x] integração com folha, financeiro, eSocial e centros de custo;
- [x] permissões, auditoria, relatórios e testes do Módulo 07;
- [x] decisão Risco × Exposição × Saúde × Incidente × EPI × Treinamento × Habilitação;
- [x] contextos de trabalho e inventários de riscos;
- [x] avaliações, medições, medidas e plano de ação;
- [x] grupos e perfis individuais de exposição;
- [x] programa médico e necessidades de exame;
- [x] convocações, exames, ASOs, aptidão e restrições;
- [x] segregação e auditoria de dados clínicos;
- [x] incidentes, investigação e ações corretivas;
- [x] CAT e eventos S-2210, S-2220, S-2221 e S-2240;
- [x] catálogo, estoque, entrega, inspeção e troca de EPI;
- [x] treinamentos, certificados e reciclagens;
- [x] habilitações e permissões de trabalho;
- [x] integração com Obras, RH, ponto, afastamentos, folha e Financeiro;
- [x] construção, riscos críticos, terceiros, emergência e fatores psicossociais;
- [x] permissões, alertas, relatórios e testes do Módulo 08;
- [x] decisão Folha × Fato × Entrada × Rubrica × Fórmula × Resultado × Pagamento;
- [x] calendários, competências e tipos de processamento;
- [x] ciclos e população congelada;
- [x] catálogo e versões de rubricas;
- [x] motor declarativo de fórmulas;
- [x] parâmetros e tabelas por vigência;
- [x] contratos de entrada e idempotência;
- [x] cálculo individual e em lote;
- [x] bases, incidências, encargos e rateios;
- [x] memória de cálculo e explicabilidade;
- [x] folhas mensal, férias, décimo terceiro e complementar;
- [x] retroatividades e diferenças;
- [x] ajustes manuais, conferência e aprovação;
- [x] fechamento e reabertura;
- [x] demonstrativos e portal do trabalhador;
- [x] pagamentos e retorno bancário;
- [x] Contabilidade, custos, obras e centros de custo;
- [x] eventos S-1010, S-1200, S-1210, S-1298 e S-1299;
- [x] FGTS Digital, totalizadores e reconciliações;
- [x] permissões, auditoria, relatórios e testes do Módulo 09;
- [x] decisão Fato × Obrigação × Projeção × Tentativa × Recibo × Totalizador × Débito × Guia × Pagamento;
- [x] catálogo de sistemas, eventos, leiautes e regras;
- [x] inscrições externas, CNO, ambientes e certificados;
- [x] calendário de obrigações e prazos;
- [x] projeções, hashes, idempotência e validações;
- [x] aprovações, lotes, filas e tentativas;
- [x] retornos, recibos e processamento assíncrono;
- [x] retificações, exclusões e reenvios;
- [x] períodos, pré-fechamento, fechamento e reabertura;
- [x] totalizadores por trabalhador e contribuinte;
- [x] reconciliação em camadas;
- [x] DCTFWeb, declarações, DARFs e pagamentos;
- [x] FGTS Digital, débitos, guias e saldos;
- [x] contingências e indisponibilidades;
- [x] permissões, auditoria, relatórios e testes do Módulo 10;
- [x] decisão Desligamento × Aviso × Término × Cálculo × Pagamento × Evento × Offboarding;
- [x] catálogo de motivos, fundamentos e mapeamentos externos;
- [x] casos, triagem, proteções e aprovações;
- [x] pedido de demissão, acordo, justa causa e contratos a termo;
- [x] aviso prévio e projeções;
- [x] ocorrência de término e encerramento temporal do vínculo;
- [x] cálculo rescisório, memória e ajustes;
- [x] documentos, assinatura, entrega e ciência;
- [x] pagamentos, retornos, complementos e estornos;
- [x] FGTS rescisório e seguro-desemprego;
- [x] eventos S-2299, S-2399, S-1210 e S-2298;
- [x] offboarding de acessos, ativos, EPIs e responsabilidades;
- [x] desligamentos coletivos e programas;
- [x] reintegrações, correções e diferenças posteriores;
- [x] permissões, auditoria, relatórios e testes do Módulo 11;
- [x] decisão Fato × Métrica × Observação × Análise × Cenário × Recomendação × Decisão;
- [x] catálogo e versões de métricas;
- [x] dimensões conformadas e temporalidade;
- [x] contratos de fontes, qualidade e reconciliação;
- [x] execuções, observações, snapshots e linhagem;
- [x] relatórios operacionais e estatísticos;
- [x] dashboards, alertas, assinaturas e exportações;
- [x] privacidade, agregação, supressão e dados sensíveis;
- [x] People Analytics, explicabilidade, viés e drift;
- [x] revisão humana e contestação de recomendações;
- [x] indicadores de quadro, movimentação, jornada, ausências, benefícios, SST, folha e conformidade;
- [x] planejamento de força de trabalho por empresa, unidade e obra;
- [x] demanda, capacidade, lacunas, custos e cenários;
- [x] integração de propostas com módulos canônicos;
- [x] permissões, auditoria, relatórios e testes do Módulo 12;
- [x] inventário da stack, arquitetura e convenções atuais;
- [x] análise de gaps técnicos do RH;
- [x] decisão de monólito modular e bounded contexts;
- [x] estrutura alvo de rotas, actions, componentes e `lib/rh`;
- [x] ownership de dados e contratos entre contextos;
- [x] padrões de comando, consulta, evento e job;
- [x] transações, RPCs, idempotência e concorrência;
- [x] outbox, filas, retries, dead letter e reconciliação;
- [x] estratégia de schemas, RLS, grants e capacidades;
- [x] segregação de dados clínicos, judiciais e financeiros;
- [x] Storage privado, hashes, retenção e legal hold;
- [x] adapters externos, webhooks e resposta incerta;
- [x] arquitetura do motor declarativo de folha;
- [x] estratégia inicial de analytics no PostgreSQL;
- [x] migrations append-only, expand/contract e backfills;
- [x] reconciliação, rollback e feature flags;
- [x] ambientes, observabilidade, testes e validadores;
- [x] gates e ondas de implementação do Módulo 13;
- [x] decisão Plano × Execução × Evidência × Homologação × Liberação;
- [x] Definition of Ready e Definition of Done;
- [x] estados de planejamento, implementação, homologação e estabilização;
- [x] 15 épicos e 120 itens executáveis;
- [x] 33 sprints lógicas sem datas inventadas;
- [x] 11 gates do saneamento à estabilização;
- [x] dependências críticas e sequência de ondas;
- [x] plano de homologação em doze camadas;
- [x] ambientes, fixtures, cleanup e evidências;
- [x] estratégia de branches e PRs;
- [x] regras de folha sombra e produção restrita;
- [x] plano de piloto, rollout e operação assistida;
- [x] 80 regras de planejamento e 55 critérios de aceite do Módulo 14.

### Próximo

- [ ] Módulo 15 — Design de Dados Detalhado, Catálogo de Tabelas, Campos, Chaves, Constraints, RLS e Ordem de Migrations;
- [ ] catálogo físico por bounded context;
- [ ] tipos, nulabilidade, PKs e FKs;
- [ ] uniques, checks e exclusões temporais;
- [ ] índices e padrões de consulta;
- [ ] ownership, grants e matriz de RLS;
- [ ] schemas privados e dados sensíveis;
- [ ] Storage e metadados documentais;
- [ ] ordem expand/contract de migrations;
- [ ] backfills, reconciliações e testes SQL esperados.

### Posterior

- [ ] protótipos e design system;
- [ ] execução do Sprint 00 após autorização;
- [ ] execução das migrations;
- [ ] implementação dos módulos;
- [ ] homologação por onda;
- [ ] operação assistida e evolução contínua.

---

## 5. Baselines oficiais consultadas

### 5.1 Admissão

Em 6 de agosto de 2026 foram verificadas fontes oficiais do Portal eSocial:

- Leiautes da versão S-1.3, Nota Técnica 06/2026;
- regras da versão S-1.3;
- Manual WEB Geral, capítulos de registro preliminar e admissão.

A documentação mantém eventos distintos para registro preliminar e admissão completa.

### 5.2 Contratos e alterações

Em 6 de agosto de 2026 foram verificadas:

- Consolidação das Leis do Trabalho em texto compilado;
- documentação técnica do eSocial S-1.3;
- Manual WEB Geral, capítulo de alteração de contrato;
- eventos de admissão, alteração cadastral, alteração contratual e alteração de trabalhador sem vínculo.

A baseline oficial diferencia fato novo contratual de correção de informação enviada incorretamente.

### 5.3 Jornadas e ponto

Em 6 de agosto de 2026 foram verificadas:

- CLT compilada, incluindo duração, compensação, jornadas especiais e registro de horário;
- Decreto nº 10.854/2021;
- Portaria MTP nº 671/2021 na página oficial consolidada;
- página oficial de Registro Eletrônico de Ponto;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- campos e tipos de horário contratual.

A baseline atual exige preservação fiel das marcações no controle eletrônico e diferencia jornada contratual do fato registrado.

### 5.4 Férias e afastamentos

Em 6 de agosto de 2026 foram verificadas:

- CLT compilada, especialmente regras de férias, ausências justificadas, maternidade e suspensão contratual;
- orientações do Ministério do Trabalho e Emprego sobre férias;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual WEB Geral, seção S-2230;
- orientações oficiais sobre afastamentos e benefícios por incapacidade.

A baseline atual diferencia direito, concessão, ausência, afastamento e evento externo.

### 5.5 Benefícios, dependentes e descontos

Em 6 de agosto de 2026 foram verificadas:

- documentação técnica do eSocial S-1.3 até NT 06/2026 e notas orientativas publicadas;
- Tabela 07 de tipos de dependente;
- grupos de dependentes, plano de saúde e pensão alimentícia;
- Tabela 03 de naturezas de rubricas;
- tabela de tributação de 2026 da Receita Federal;
- Lei nº 7.418/1985 e Decreto nº 10.854/2021 para vale-transporte;
- Lei nº 6.321/1976, Lei nº 14.442/2022 e regulamentação vigente do PAT;
- texto compilado da CLT para descontos salariais.

A baseline oficial diferencia dependência, cobertura, beneficiário, rubrica, desconto e pagamento.

### 5.6 Segurança e saúde no trabalho

Em 6 de agosto de 2026 foram verificadas:

- página oficial de Normas Regulamentadoras vigentes;
- NR-1 e materiais oficiais de GRO/PGR;
- NR-6 e orientações oficiais sobre EPI e CA;
- NR-7 e PCMSO;
- NR-10, NR-12, NR-17, NR-18, NR-33 e NR-35;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação do eSocial consolidado até NO 11/2026;
- Manual WEB Geral de SST;
- eventos S-2210, S-2220, S-2221 e S-2240.

A baseline oficial diferencia gerenciamento de riscos, monitoramento da saúde, comunicação de acidente e exposição a agentes. Requisitos, textos consolidados, prazos, tabelas, códigos, cargas horárias e interpretações deverão ser verificados novamente antes da implementação, homologação e produção.

### 5.7 Folha de pagamento

Em 6 de agosto de 2026 foram verificadas:

- documentação técnica do eSocial S-1.3 até NT 06/2026;
- eventos S-1010, S-1200, S-1210, S-1298 e S-1299;
- regras de remuneração, pagamento, exclusão, fechamento e reabertura;
- tabelas previdenciárias vigentes desde janeiro de 2026;
- tabelas de tributação do imposto de renda de 2026;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- notas orientativas e documentação técnica correlata.

A baseline oficial diferencia tabela de rubricas, remuneração devida, pagamento efetivo e fechamento periódico. Faixas, valores, incidências, códigos, prazos e interpretações deverão ser novamente validados antes da implementação, homologação e produção.

### 5.8 Obrigações digitais e reconciliação

Em 6 de agosto de 2026 foram verificadas:

- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação do eSocial consolidado até NO 11/2026;
- eventos S-1298, S-1299, S-3000 e totalizadores S-5001, S-5002, S-5003, S-5011, S-5012 e S-5013;
- regras de transmissão durante o processamento do fechamento;
- regras de exclusão e retificação em períodos fechados;
- orientações da Receita Federal publicadas em 2026 sobre integração entre eSocial, EFD-Reinf e DCTFWeb;
- serviço e Manual de Orientação da DCTFWeb;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- comunicados de 2026 sobre FGTS de processos trabalhistas.

A baseline oficial confirma que o encerramento bem-sucedido das escriturações sensibiliza automaticamente a DCTFWeb; que correções em escriturações encerradas exigem reabertura, retificação e novo encerramento; e que o FGTS Digital utiliza remunerações declaradas no eSocial para individualizar débitos e gerar guias.

Leiautes, regras, endpoints, certificados, prazos, códigos e interpretações deverão ser novamente validados antes da implementação, homologação e produção.

### 5.9 Desligamentos e rescisões

Em 6 de agosto de 2026 foram verificadas:

- CLT compilada, especialmente arts. 477, 479, 480, 482, 483, 484-A e 487 a 491;
- Lei nº 12.506/2011;
- Lei nº 8.036/1990 e regulamentação do FGTS;
- documentação técnica do eSocial S-1.3 até NT 06/2026;
- regras e orientações dos eventos S-2298, S-2299, S-2399, S-1210 e S-3000;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- leiaute de Remunerações para Fins Rescisórios versão 1.2;
- orientações oficiais sobre seguro-desemprego.

A baseline oficial diferencia comunicação do desligamento, aviso, verbas devidas, pagamento, evento de desligamento, recolhimento do FGTS, acesso ao seguro-desemprego e reintegração. Prazos, motivos, verbas, códigos, incidências, instrumentos coletivos e interpretações deverão ser novamente validados antes da implementação, homologação e produção.

### 5.10 People Analytics, privacidade e não discriminação

Em 6 de agosto de 2026 foram verificadas:

- Lei Geral de Proteção de Dados Pessoais em texto compilado;
- definições de dado pessoal, dado sensível, anonimização e relatório de impacto;
- princípios de finalidade, adequação, necessidade, qualidade, transparência, segurança, prevenção, não discriminação e prestação de contas;
- requisitos para tratamento de dados sensíveis;
- direito de solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado que afetem interesses;
- deveres de registro, segurança desde a concepção e governança;
- Lei nº 9.029/1995 sobre práticas discriminatórias e limitativas na relação de trabalho;
- Agenda Regulatória da ANPD 2025–2026;
- Mapa de Temas Prioritários da ANPD 2026–2027, incluindo direitos dos titulares e inteligência artificial e tecnologias emergentes.

A implementação deverá revalidar legislação, regulamentação e orientações vigentes, especialmente para decisões automatizadas, inteligência artificial, tratamentos de alto risco, anonimização, pseudonimização, biometria, saúde, relatórios de impacto e exercício de direitos dos titulares.

### 5.11 Arquitetura técnica

Em 6 de agosto de 2026 foram verificadas:

- arquitetura canônica e README do repositório;
- registry de módulos e camada atual de autorização;
- `package.json` e `tsconfig.json` da branch;
- padrão existente de Server Actions e RPCs;
- documentação oficial do Next.js App Router, Server Components, Server Actions e Route Handlers;
- documentação oficial do Supabase sobre Data API, grants, RLS, papéis, chaves públicas e secretas;
- documentação atual do PostgreSQL sobre Row Level Security, locks e particionamento.

A baseline confirma o uso do monólito modular, do App Router, de TypeScript estrito, de PostgreSQL/Supabase, de RLS, de RPCs transacionais, de migrations append-only e de Service Role restrita ao servidor. Versões, defaults de grants, chaves, APIs e recomendações deverão ser revalidados antes da implementação e produção.

### 5.12 Planejamento executável e homologação

Em 6 de agosto de 2026 foram reconciliados:

- o roadmap oficial da Innovar Platform;
- a regra de que planejamento não equivale a funcionalidade entregue;
- Definitions of Done já utilizadas nas etapas 17 a 21;
- validadores, migrations append-only, testes SQL com `ROLLBACK`, evidências, artifacts, cleanup e gates existentes;
- o inventário canônico e o estado atual dos aplicativos;
- a arquitetura e as ondas definidas no Módulo 13.

O planejamento do RH adota sprints lógicas sem datas, Definition of Ready, Definition of Done multidimensional, gates formais, cálculo sombra, produção restrita, piloto, rollout gradual e estabilização. Datas e capacidade deverão ser definidas somente após o saneamento da base e confirmação da equipe.

---

## 6. Estado técnico

Nenhuma tabela, migration, rota, Server Action, componente, motor de fórmula, cálculo de folha, cálculo rescisório, conector governamental, certificado, fila, transmissão, guia, pagamento, offboarding, camada semântica, métrica executável, dashboard, exportação, modelo preditivo, cenário executável, outbox ou worker do RH foi implementado.

Nenhuma história, sprint, issue, milestone, data ou gate do Módulo 14 foi iniciado ou aprovado para execução.

A branch contém documentação funcional, técnica e de planejamento.

O CI do PR possui uma divergência preexistente na árvore combinada relacionada à numeração de vacinas a partir de `VACINA-044`. Os documentos do Projeto RH não alteraram vacinas.

Esse bloqueio deverá ser investigado no Sprint 00 para que a `main` e o PR voltem a oferecer evidência confiável. O PR de RH não mascarará o problema alterando o validador ou renumerando vacinas sem análise de referências.

---

## 7. Próximo módulo lógico

**Módulo 15 — Design de Dados Detalhado, Catálogo de Tabelas, Campos, Chaves, Constraints, RLS e Ordem de Migrations.**

Fluxo de alto nível previsto:

```text
Arquitetura e backlog aprovados
  → catálogo físico por contexto
    → tabelas, campos e chaves
      → constraints e temporalidade
        → índices e RLS
          → ordem expand/contract
            → backfills e reconciliação
              → testes SQL esperados
```

O próximo módulo deverá distinguir:

1. entidade funcional e tabela física;
2. dado canônico e projeção;
3. coluna obrigatória e dado ainda desconhecido;
4. FK, unique, check e exclusão temporal;
5. índice de integridade e índice de desempenho;
6. RLS, grant, capability e finalidade;
7. schema público, privado, clínico e técnico;
8. migration planejada e migration executada.

---

## 8. Controle de versão

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 05/08/2026 | início do Projeto RH, ADR-001 e Módulo 01 |
| 0.2.0 | 06/08/2026 | ADR-002, Módulo 02 e consolidação do índice |
| 0.3.0 | 06/08/2026 | ADR-003, Módulo 03 e baseline oficial de admissão |
| 0.4.0 | 06/08/2026 | ADR-004, Módulo 04 e baseline de contratos e alterações |
| 0.5.0 | 06/08/2026 | ADR-005, Módulo 05 e baseline de jornadas e ponto |
| 0.6.0 | 06/08/2026 | ADR-006, Módulo 06 e baseline de férias e afastamentos |
| 0.7.0 | 06/08/2026 | ADR-007, Módulo 07 e baseline de benefícios, dependentes e descontos |
| 0.8.0 | 06/08/2026 | ADR-008, Módulo 08 e baseline de SST, riscos, saúde e habilitações |
| 0.9.0 | 06/08/2026 | ADR-009, Módulo 09 e baseline de folha, rubricas, cálculo e fechamento |
| 0.10.0 | 06/08/2026 | ADR-010, Módulo 10 e baseline de obrigações digitais e reconciliação |
| 0.11.0 | 06/08/2026 | ADR-011, Módulo 11 e baseline de desligamentos, rescisões e offboarding |
| 0.12.0 | 06/08/2026 | ADR-012, Módulo 12 e baseline de People Analytics, privacidade e planejamento |
| 0.13.0 | 06/08/2026 | ADR-013, Módulo 13 e arquitetura técnica, segurança, migrations e roadmap |
| 0.14.0 | 06/08/2026 | ADR-014, Módulo 14 e backlog executável, sprints, gates e homologação |
