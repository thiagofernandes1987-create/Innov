# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.6.0  
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
- [x] permissões, auditoria, relatórios e testes do Módulo 06.

### Próximo

- [ ] Módulo 07 — Benefícios, Dependentes, Pensão Alimentícia e Descontos Recorrentes;
- [ ] catálogo de benefícios e planos;
- [ ] elegibilidade por vigência;
- [ ] adesão, inclusão e exclusão;
- [ ] dependentes e documentos;
- [ ] pensão alimentícia e ordens;
- [ ] coparticipações e descontos;
- [ ] integração com folha e fornecedores;
- [ ] impactos de afastamento, férias e desligamento.

### Posterior

- [ ] medicina e segurança;
- [ ] folha;
- [ ] rubricas e fórmulas;
- [ ] obrigações digitais;
- [ ] desligamentos;
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

A baseline atual diferencia direito, concessão, ausência, afastamento e evento externo. Campos, prazos, motivos, documentos, instrumentos coletivos e interpretações deverão ser verificados novamente antes da implementação, homologação e produção.

---

## 6. Estado técnico

Nenhuma tabela, migration, rota, Server Action, componente, coletor, cálculo ou integração foi implementada pelo Projeto RH.

A branch contém apenas documentação funcional.

O CI do PR reprova no validador de documentação por uma divergência preexistente na árvore combinada: a numeração de vacinas possui duplicidade a partir de `VACINA-044`. Os documentos do Projeto RH não alteraram vacinas.

Esse bloqueio deverá ser corrigido em escopo próprio para que o CI da `main` volte a representar evidência confiável. O PR de RH não mascarará o problema alterando o validador ou renumerando vacinas sem análise de referências.

---

## 7. Próximo módulo lógico

**Módulo 07 — Benefícios, Dependentes, Pensão Alimentícia e Descontos Recorrentes.**

Fluxo de alto nível previsto:

```text
Política e plano
  → elegibilidade por vínculo e vigência
  → adesão e dependentes
  → aprovação e fornecedor
  → cobrança, coparticipação ou desconto
  → evento para folha
  → alteração, suspensão ou encerramento
```

O próximo módulo deverá distinguir:

1. catálogo de benefício;
2. plano e fornecedor;
3. regra de elegibilidade;
4. adesão do titular;
5. inclusão de dependente;
6. cobrança do fornecedor;
7. desconto em folha;
8. ordem judicial de pensão;
9. efeito de férias, afastamento e desligamento.

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
