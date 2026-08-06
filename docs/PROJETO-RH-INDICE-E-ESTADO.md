# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.9.0  
**Atualizado em:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Implementação:** não iniciada  
**Produção:** não liberada  

---

## 1. Finalidade

Este arquivo registra o estado atual da especificação funcional do Projeto RH sem substituir os documentos detalhados.

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

---

## 4. Progresso funcional

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
- [x] CAT e eventos S-2210, S-2220 e S-2240;
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
- [x] permissões, auditoria, relatórios e testes do Módulo 09.

### Próximo

- [ ] Módulo 10 — Obrigações Digitais e Reconciliação Governamental;
- [ ] catálogo versionado de obrigações e leiautes;
- [ ] agenda e matriz de aplicabilidade;
- [ ] eventos não periódicos e periódicos;
- [ ] lotes, filas, recibos e totalizadores;
- [ ] eSocial, FGTS Digital, DCTFWeb e integrações correlatas;
- [ ] reaberturas, retificações e exclusões;
- [ ] divergências entre cadastro, folha, pagamento e declarações;
- [ ] dossiê de conformidade por competência.

### Posterior

- [ ] desligamentos e rescisões;
- [ ] relatórios consolidados;
- [ ] plano de implementação.

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

---

## 6. Estado técnico

Nenhuma tabela, migration, rota, Server Action, componente, coletor, motor de fórmula, cálculo de folha ou integração foi implementada pelo Projeto RH.

A branch contém apenas documentação funcional.

O CI do PR reprova no validador de documentação por uma divergência preexistente na árvore combinada: a numeração de vacinas possui duplicidade a partir de `VACINA-044`. Os documentos do Projeto RH não alteraram vacinas.

Esse bloqueio deverá ser corrigido em escopo próprio para que o CI da `main` volte a representar evidência confiável. O PR de RH não mascarará o problema alterando o validador ou renumerando vacinas sem análise de referências.

---

## 7. Próximo módulo lógico

**Módulo 10 — Obrigações Digitais, Eventos Trabalhistas, Totalizadores e Reconciliação Governamental.**

Fluxo de alto nível previsto:

```text
Fato interno aprovado
  → obrigação aplicável e versão do leiaute
  → projeção canônica
  → validação
  → lote e transmissão
  → recibo, retorno e totalizadores
  → reconciliação
  → retificação, exclusão ou reabertura quando necessária
  → dossiê de conformidade
```

O próximo módulo deverá distinguir:

1. fato interno e declaração externa;
2. obrigação e versão do leiaute;
3. evento, lote e transmissão;
4. aceite técnico e conformidade do conteúdo;
5. recibo, totalizador, guia e pagamento;
6. retificação, exclusão e reabertura;
7. divergência e plano de correção;
8. ambiente de produção restrita e produção.

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
