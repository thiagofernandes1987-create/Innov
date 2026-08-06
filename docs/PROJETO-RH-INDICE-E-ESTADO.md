# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.13.0  
**Atualizado em:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Implementação:** não iniciada  
**Produção:** não liberada  

---

## 1. Finalidade

Este arquivo registra o estado atual da especificação funcional e técnica do Projeto RH sem substituir os documentos detalhados.

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

---

## 4. Progresso funcional e técnico

### Concluído

- [x] Módulos funcionais 01 a 12 e ADRs 001 a 012;
- [x] requisitos transversais, estados, permissões e critérios de aceite;
- [x] integração conceitual com Obras, Equipes, Financeiro, Estoque, Documentos, Relatórios e Auditoria;
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
- [x] gates e ondas de implementação do Módulo 13.

### Próximo

- [ ] Módulo 14 — Backlog Executável, Épicos, Sprints, Dependências, Gates e Plano de Homologação;
- [ ] decomposição das ondas em épicos e histórias;
- [ ] Definition of Ready e Definition of Done;
- [ ] dependências técnicas e funcionais;
- [ ] sequência de migrations e backfills;
- [ ] plano de testes por sprint;
- [ ] evidências e critérios de bloqueio;
- [ ] pilotos, rollout e operação assistida;
- [ ] estimativas e capacidade sem inventar datas;
- [ ] critérios para iniciar implementação.

### Posterior

- [ ] protótipos e design system;
- [ ] execução das migrations;
- [ ] implementação dos módulos;
- [ ] homologação por onda;
- [ ] operação assistida e evolução contínua.

---

## 5. Baselines oficiais consultadas

### 5.1 Funcional, trabalhista e governamental

Em 5 e 6 de agosto de 2026 foram verificadas as baselines oficiais registradas nos módulos 01 a 12, incluindo CLT, eSocial S-1.3, FGTS Digital, DCTFWeb, normas de SST, LGPD, não discriminação e orientações oficiais relacionadas a admissão, contratos, jornada, afastamentos, benefícios, folha, desligamentos e People Analytics.

Cada módulo detalhado preserva as fontes e ressalvas aplicáveis. Regras, prazos, códigos, leiautes, alíquotas, interpretações e versões deverão ser revalidados antes da implementação, homologação e produção.

### 5.2 Arquitetura técnica

Em 6 de agosto de 2026 foram verificados:

- arquitetura canônica e README do repositório;
- registry de módulos e camada atual de autorização;
- `package.json` e `tsconfig.json` da branch;
- padrão existente de Server Actions e RPCs;
- documentação oficial do Next.js App Router, Server Components, Server Actions e Route Handlers;
- documentação oficial do Supabase sobre Data API, grants, RLS, papéis, chaves públicas e secretas;
- documentação atual do PostgreSQL sobre Row Level Security, locks e particionamento.

A baseline confirma o uso do monólito modular, do App Router, de TypeScript estrito, de PostgreSQL/Supabase, de RLS, de RPCs transacionais, de migrations append-only e de Service Role restrita ao servidor. Versões, defaults de grants, chaves, APIs e recomendações deverão ser revalidados antes da implementação e produção.

---

## 6. Estado técnico

Nenhuma tabela, migration, rota, Server Action, componente, motor de fórmula, cálculo de folha, cálculo rescisório, conector governamental, certificado, fila, transmissão, guia, pagamento, offboarding, camada semântica, métrica executável, dashboard, exportação, modelo preditivo, cenário executável, outbox ou worker do RH foi implementado.

A branch contém documentação funcional e técnica.

O CI do PR reprova no validador de documentação por uma divergência preexistente na árvore combinada: a numeração de vacinas possui duplicidade a partir de `VACINA-044`. Os documentos do Projeto RH não alteraram vacinas.

Esse bloqueio deverá ser corrigido em escopo próprio para que o CI da `main` volte a representar evidência confiável. O PR de RH não mascarará o problema alterando o validador ou renumerando vacinas sem análise de referências.

---

## 7. Próximo módulo lógico

**Módulo 14 — Backlog Executável, Épicos, Sprints, Dependências, Gates e Plano de Homologação.**

```text
Arquitetura funcional e técnica
  → épicos e histórias ordenadas
    → dependências e gates
      → sprints com testes e evidências
        → piloto e cálculo sombra
          → homologação por onda
            → rollout gradual
              → operação assistida
```

O próximo módulo deverá distinguir épico, história, tarefa e spike; Definition of Ready e Definition of Done; entrega documental e executável; dependência bloqueante e paralelizável; estimativa e compromisso; teste planejado e evidência executada; homologação técnica e aceite funcional; feature concluída e feature liberada.

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
