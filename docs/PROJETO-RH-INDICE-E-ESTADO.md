# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.4.0  
**Atualizado em:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Implementação:** não iniciada  
**Produção:** não liberada  

---

## 1. Finalidade

Este arquivo registra o estado atual da especificação funcional do Projeto RH sem substituir os documentos detalhados.

A especificação principal permanece em `PROJETO-RH-ESPECIFICACAO-FUNCIONAL.md`. Cada módulo possui documento próprio para evitar que atualizações de estado apaguem requisitos anteriores.

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

---

## 4. Progresso funcional

### Concluído

- [x] visão de produto;
- [x] mapa preliminar dos domínios;
- [x] perfis e capacidades iniciais;
- [x] requisitos transversais iniciais;
- [x] Cadastro Mestre;
- [x] decisão Pessoa × Usuário × Trabalhador × Vínculo;
- [x] decisão Tenant × Empresa × Estabelecimento;
- [x] Empresas e Estabelecimentos;
- [x] Unidades Organizacionais;
- [x] Cargos e Funções;
- [x] Posições e Quadro Planejado;
- [x] Lotações;
- [x] Centros de Custo e Rateios;
- [x] integração conceitual com Obras, Equipes e Financeiro;
- [x] decisão Admissão como Caso Auditável;
- [x] Admissão e Pré-admissão;
- [x] convite seguro e coleta externa;
- [x] checklist documental versionado;
- [x] conferência e solicitações de correção;
- [x] condições propostas;
- [x] aprovações e exceções;
- [x] estados de eventos digitais;
- [x] gate de ativação e idempotência;
- [x] cancelamento, rejeição, expiração e reabertura controlada;
- [x] decisão Contrato × Versão × Alteração × Documento;
- [x] contratos e versões contratuais;
- [x] histórico por vigência e instante de registro;
- [x] alterações futuras, imediatas e retroativas;
- [x] correção e retificação controladas;
- [x] alterações de remuneração, cargo, função, posição, unidade, estabelecimento, local, jornada e modalidade;
- [x] prorrogação, conversão e contratos a prazo;
- [x] documentos, ciência e assinatura;
- [x] impactos derivados e integração externa;
- [x] regras, exceções, alertas, relatórios e critérios de aceite do Módulo 04.

### Próximo

- [ ] Módulo 05 — Jornadas, Horários, Escalas, Controle de Ponto e Banco de Horas;
- [ ] jornada contratual;
- [ ] horários e escalas;
- [ ] marcações e ocorrências;
- [ ] apuração;
- [ ] autorizações;
- [ ] banco de horas;
- [ ] reflexos em folha;
- [ ] integração com obras e diário de campo.

### Posterior

- [ ] férias;
- [ ] afastamentos;
- [ ] benefícios;
- [ ] dependentes e pensão;
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

A baseline oficial diferencia fato novo contratual de correção de informação enviada incorretamente. Campos, prazos, obrigatoriedades e interpretações deverão ser verificados novamente antes da implementação, homologação e produção.

---

## 6. Estado técnico

Nenhuma tabela, migration, rota, Server Action, componente, cálculo ou integração foi implementada pelo Projeto RH.

A branch contém apenas documentação funcional.

O CI do PR reprova no validador de documentação por uma divergência preexistente na árvore combinada: a numeração de vacinas possui duplicidade a partir de `VACINA-044`. Os documentos do Projeto RH não alteraram vacinas.

Esse bloqueio deverá ser corrigido em escopo próprio para que o CI da `main` volte a representar evidência confiável. O PR de RH não mascarará o problema alterando o validador ou renumerando vacinas sem análise de referências.

---

## 7. Próximo módulo lógico

**Módulo 05 — Jornadas, Horários, Escalas, Controle de Ponto e Banco de Horas.**

Fluxo de alto nível previsto:

```text
Jornada contratual versionada
  → horário ou escala planejada
  → marcações e evidências
  → ocorrências e justificativas
  → apuração
  → aprovação
  → banco de horas ou evento para folha
```

O próximo módulo deverá impedir duas confusões:

1. marcação operacional não reescreve a jornada contratual;
2. alteração contratual de jornada não apaga escalas, marcações ou apurações históricas.

---

## 8. Controle de versão

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 05/08/2026 | início do Projeto RH, ADR-001 e Módulo 01 |
| 0.2.0 | 06/08/2026 | ADR-002, Módulo 02 e consolidação do índice |
| 0.3.0 | 06/08/2026 | ADR-003, Módulo 03 e baseline oficial de admissão |
| 0.4.0 | 06/08/2026 | ADR-004, Módulo 04 e baseline de contratos e alterações |
