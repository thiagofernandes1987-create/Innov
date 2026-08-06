# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.2.0  
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
- [x] regras, exceções, alertas, relatórios e critérios de aceite do Módulo 02.

### Próximo

- [ ] Módulo 03 — Admissão e Pré-admissão;
- [ ] conferência documental;
- [ ] condições iniciais do vínculo;
- [ ] pendências impeditivas e não impeditivas;
- [ ] aprovação e ativação;
- [ ] cancelamento e retomada;
- [ ] integração com jornada, documentos e obrigações futuras.

### Posterior

- [ ] contratos e alterações;
- [ ] jornadas, escalas e ponto;
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

## 5. Estado técnico

Nenhuma tabela, migration, rota, Server Action, componente, cálculo ou integração foi implementada pelo Projeto RH.

A branch contém apenas documentação funcional.

O primeiro CI do PR reprovou no validador de documentação por uma divergência preexistente na árvore combinada: a numeração de vacinas possui duplicidade a partir de `VACINA-044`. Os documentos do Projeto RH não alteraram vacinas.

Esse bloqueio deverá ser corrigido em escopo próprio para que o CI da `main` volte a representar evidência confiável. O PR de RH não mascarará o problema alterando o validador ou renumerando vacinas sem análise de referências.

---

## 6. Próximo módulo lógico

**Módulo 03 — Admissão, Pré-admissão, Conferência Documental e Ativação do Vínculo.**

Fluxo de alto nível previsto:

```text
Pessoa selecionada
  → Trabalhador ou candidato identificado
  → Pré-admissão
  → Empresa e estabelecimento
  → Cargo, função, lotação e jornada
  → Documentos e condições iniciais
  → Validações e pendências
  → Conferência
  → Aprovação
  → Ativação do vínculo
```

Nenhum vínculo deverá ser ativado quando faltar requisito classificado como impeditivo. Pendências não impeditivas deverão permanecer identificadas, atribuídas e com prazo, sem desaparecer após a ativação.

---

## 7. Controle de versão

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | 05/08/2026 | início do Projeto RH, ADR-001 e Módulo 01 |
| 0.2.0 | 06/08/2026 | ADR-002, Módulo 02 e consolidação do índice |
