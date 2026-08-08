# Projeto RH — ADR-017 — Interface, Contexto, Estado e Decisão Assistida

**Estado:** decisão de experiência registrada; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Módulo relacionado:** `PROJETO-RH-MODULO-17-DESIGN-DE-INTERFACE-FLUXOS-COMPONENTES-E-ACESSIBILIDADE.md`

---

## 1. Contexto

Os módulos 01 a 16 definiram domínios, arquitetura, backlog, dados e contratos. A interface agora precisa transformar centenas de estados, permissões, pendências, cálculos, documentos e integrações em fluxos compreensíveis sem:

- reproduzir a estrutura física do banco;
- obrigar o usuário a conhecer códigos técnicos;
- concentrar todo o domínio em uma única tela;
- esconder decisões críticas dentro de menus genéricos;
- misturar cadastro, operação, aprovação e auditoria;
- apresentar dados sensíveis além da finalidade;
- converter dashboards em fonte de verdade;
- usar cor como único indicador;
- produzir formulários extensos sem orientação;
- usar modais para processos longos;
- perder o contexto ao navegar entre pessoa, vínculo, competência e obra;
- permitir que uma ação irreversível pareça uma edição comum;
- esconder estados assíncronos, falhas, retries ou respostas externas incertas.

A plataforma já adotou uma casca superior sem menu lateral permanente, navegação contextual por aplicativo, títulos compactos dentro da área autenticada, temas claro e escuro, foco visível, skip link, alvos de interação mínimos e componentes visuais compartilhados. O RH deverá estender esse padrão, e não criar uma aplicação visual paralela.

---

## 2. Decisão

A experiência do RH será organizada por **contexto de trabalho, objeto principal, estado e próxima decisão**, seguindo a arquitetura:

```text
Aplicativo RH
  → área de trabalho
    → fila ou visão consolidada
      → objeto principal
        → resumo contextual
          → seções progressivas
            → ação permitida
              → confirmação proporcional ao risco
                → resultado, evidência e próxima etapa
```

A interface distinguirá explicitamente:

1. navegação;
2. contexto;
3. resumo;
4. estado;
5. pendência;
6. evidência;
7. ação;
8. decisão;
9. resultado;
10. histórico.

---

## 3. Princípios

### 3.1 A interface seguirá o modelo mental do trabalho

O usuário não navegará por nomes de tabelas ou bounded contexts. As áreas principais serão expressas em linguagem de negócio, como:

- Pessoas;
- Admissões;
- Contratos;
- Jornada;
- Férias e afastamentos;
- Benefícios;
- SST;
- Folha;
- Obrigações;
- Desligamentos;
- Relatórios;
- Configurações.

### 3.2 A barra superior continuará sendo a navegação primária

O RH será registrado como aplicativo da plataforma e utilizará:

- logotipo da plataforma;
- organização ativa;
- nome e ícone do módulo;
- menus contextuais do RH;
- busca global;
- avisos;
- conta e tema.

Não será introduzido menu lateral global permanente. Em telas que exigirem navegação interna extensa, será usada navegação local, tabs, índice de seções ou painel contextual, sem competir com a casca.

### 3.3 A página inicial será uma área de trabalho, não uma vitrine

A página inicial priorizará:

- pendências com prazo;
- aprovações aguardando decisão;
- inconsistências;
- ciclos em andamento;
- alertas de qualidade;
- ações recentes;
- atalhos de alto uso;
- visão resumida do período e escopo atuais.

Indicadores decorativos sem ação associada não ocuparão a primeira dobra.

### 3.4 A unidade principal será o dossiê contextual

Pessoa, vínculo, caso de admissão, período de ponto, ciclo de folha e caso de desligamento terão páginas de dossiê com:

- cabeçalho compacto;
- identificadores necessários;
- estado atual;
- alertas e bloqueios;
- ações permitidas;
- navegação por seções;
- timeline;
- documentos e evidências;
- histórico e auditoria.

### 3.5 Contextos semelhantes não serão fundidos

A interface mostrará separadamente:

- pessoa e vínculo;
- vínculo e contrato;
- programação e ocorrência;
- cálculo e pagamento;
- evento preparado e evento transmitido;
- alerta e decisão;
- cenário e plano aprovado;
- aptidão e diagnóstico;
- valor devido e valor conciliado.

### 3.6 Ações serão apresentadas conforme estado e capacidade

Uma ação será exibida somente quando:

- o estado permitir;
- a capability estiver presente;
- o escopo estiver autorizado;
- os pré-requisitos mínimos existirem.

A interface não dependerá de esconder botões como única barreira de segurança; a autorização continuará no servidor e no banco.

### 3.7 A interface explicará por que uma ação está indisponível

Quando útil e seguro, a ação desabilitada ou o painel de bloqueios mostrará:

- requisito pendente;
- estado incompatível;
- falta de aprovação;
- período fechado;
- conflito temporal;
- indisponibilidade externa;
- qualidade insuficiente;
- restrição de privacidade.

Não serão revelados detalhes de políticas ou dados que o usuário não pode conhecer.

### 3.8 Complexidade será revelada progressivamente

A tela mostrará primeiro:

- situação;
- impacto;
- próxima ação;
- prazo;
- responsável.

Detalhes técnicos, memórias extensas, payloads, versões e trilhas completas ficarão em seções expansíveis ou áreas de auditoria autorizadas.

### 3.9 Modais terão escopo curto

Modais serão usados para:

- confirmação;
- escolha pequena;
- justificativa curta;
- visualização rápida;
- alteração atômica.

Processos extensos, formulários multi-etapa, cálculos, documentos e análises serão páginas ou painéis dedicados. Todo modal terá nome acessível, foco inicial coerente, contenção de foco e forma visível de fechamento.

### 3.10 Formulários serão orientados a tarefas

Formulários terão:

- título da tarefa;
- contexto atual;
- instruções essenciais;
- grupos semânticos;
- labels persistentes;
- exemplos quando necessários;
- obrigatoriedade textual;
- validação próxima ao campo;
- resumo de erros;
- preservação de dados após falha;
- ações primária e secundária claras.

Placeholder não substituirá label.

### 3.11 Etapas longas usarão stepper somente quando houver sequência real

Stepper será usado quando:

- a ordem for obrigatória;
- cada etapa tiver objetivo próprio;
- o usuário puder compreender progresso e pendências;
- o salvamento parcial for seguro.

Tabs não serão usadas para simular etapas sequenciais.

### 3.12 Tabs representarão seções irmãs

Tabs serão usadas para áreas de mesmo nível, como:

- resumo;
- contrato;
- jornada;
- benefícios;
- documentos;
- histórico.

A URL deverá preservar a seção quando isso melhorar compartilhamento, retorno e navegação.

### 3.13 Tabelas e grids terão usos distintos

Tabela HTML será o padrão para leitura tabular e ações por linha. Grid interativo será reservado para casos que realmente exigirem navegação de célula, edição tabular intensa ou grande quantidade de controles.

No mobile, tabelas poderão:

- priorizar colunas;
- permitir rolagem controlada;
- oferecer cartões equivalentes;
- abrir detalhes por linha.

Não será removida informação essencial sem alternativa.

### 3.14 Estados serão comunicados por texto, forma e cor

Todo estado terá:

- rótulo textual;
- cor de apoio;
- ícone ou forma quando útil;
- explicação acessível;
- ação ou próximo passo quando aplicável.

Cores não serão codificadas de maneira divergente entre módulos.

### 3.15 Ações destrutivas terão confirmação proporcional

A confirmação dependerá do impacto:

- baixo: confirmação simples ou desfazer;
- médio: resumo das consequências e justificativa;
- alto: revisão de dados, bloqueios, dupla aprovação ou autenticação reforçada;
- externo/irreversível: confirmação explícita, snapshot, idempotência e evidência.

Botões destrutivos não serão a ação visual dominante por padrão.

### 3.16 O sistema distinguirá processamento síncrono e assíncrono

Após uma ação assíncrona, a interface mostrará:

- solicitação recebida;
- identificador ou correlação;
- estado atual;
- última atualização;
- possibilidade de atualizar;
- resultado ou erro sanitizado;
- próxima ação segura.

O usuário não deverá repetir uma transmissão porque a tela parece parada.

### 3.17 Estado externo incerto terá apresentação própria

Quando o sistema não souber se o provedor processou a solicitação, a interface exibirá estado como “Confirmação pendente” ou “Situação externa a reconciliar”, sem classificar como sucesso ou falha definitiva.

### 3.18 Dados sensíveis serão minimizados visualmente

A interface aplicará:

- mascaramento;
- revelação sob ação autorizada;
- ausência de dados clínicos em resumos gerais;
- bloqueio de previews indevidos;
- aviso antes de exportar;
- prevenção contra shoulder surfing quando razoável;
- não persistência desnecessária em URL, título, breadcrumb ou notificações.

### 3.19 O portal do trabalhador será separado da área administrativa

O trabalhador verá somente:

- seus próprios dados autorizados;
- documentos e demonstrativos;
- solicitações e pendências próprias;
- explicações de cálculo permitidas;
- canais de correção ou contestação.

A navegação não reproduzirá a complexidade administrativa.

### 3.20 Acessibilidade será requisito de arquitetura

A interface buscará conformidade com WCAG 2.2 nível AA e os padrões WAI-ARIA aplicáveis, incluindo:

- navegação por teclado;
- foco visível;
- ordem lógica;
- landmarks;
- headings hierárquicos;
- labels e descrições;
- mensagens de erro em texto;
- notificações acessíveis;
- contraste;
- alvos adequados;
- redução de movimento;
- zoom e reflow;
- alternativas para gráficos e visualizações.

ARIA não substituirá HTML semântico.

### 3.21 O design system existente será a base

Serão reutilizados e normalizados:

- tokens de cor e superfície;
- tipografia;
- espaçamentos;
- botões;
- campos;
- badges;
- cards;
- tabelas;
- estados vazios;
- avisos;
- casca superior;
- padrões de foco;
- temas claro e escuro.

Novos componentes deverão nascer por necessidade recorrente comprovada.

### 3.22 Protótipo não será tratado como software entregue

Wireframes, fluxos e protótipos servirão para validar:

- arquitetura de informação;
- compreensão;
- sequência;
- densidade;
- estados;
- acessibilidade;
- terminologia.

Protótipo aprovado não comprovará autorização, persistência, transação, integração ou segurança implementadas.

---

## 4. Arquitetura de informação do aplicativo

Menus primários propostos:

1. **Visão geral**;
2. **Pessoas**;
3. **Movimentações**;
4. **Jornada**;
5. **Folha**;
6. **SST**;
7. **Obrigações**;
8. **Relatórios**;
9. **Configuração**.

Para evitar excesso na barra superior, a implementação poderá agrupar áreas relacionadas em menus de segundo nível, desde que:

- o rótulo seja previsível;
- a página inicial da área ofereça atalhos claros;
- nenhuma função crítica fique escondida em um menu “Mais” sem contexto;
- a navegação mobile permaneça utilizável.

---

## 5. Padrões de página

### 5.1 Área de trabalho

```text
Cabeçalho compacto + período/escopo
  → pendências prioritárias
    → filas e ciclos
      → indicadores acionáveis
        → atividade recente
```

### 5.2 Lista operacional

```text
Título + ação primária
  → busca e filtros
    → filtros aplicados
      → tabela ou lista
        → paginação/cursor
          → ações por linha
```

### 5.3 Dossiê

```text
Identidade + estado + ações
  → alertas/bloqueios
    → resumo
      → tabs/seções
        → timeline e evidências
```

### 5.4 Processo multi-etapa

```text
Contexto
  → progresso
    → etapa atual
      → validação
        → revisão
          → confirmação
            → resultado
```

### 5.5 Ciclo de processamento

```text
Competência + escopo + estado
  → qualidade das entradas
    → execução
      → diferenças
        → aprovação
          → fechamento/transmissão
            → reconciliação
```

### 5.6 Configuração

```text
Catálogo
  → versão/vigência
    → detalhe
      → impacto e dependências
        → revisão
          → publicação
```

---

## 6. Componentes de domínio previstos

- `RhWorkspaceSummary`;
- `RhPriorityQueue`;
- `RhScopeBar`;
- `RhContextHeader`;
- `RhStatusBadge`;
- `RhBlockingIssues`;
- `RhDecisionPanel`;
- `RhApprovalTimeline`;
- `RhEvidenceList`;
- `RhVersionHistory`;
- `RhEffectivePeriod`;
- `RhCompetencePicker`;
- `RhMoneyBreakdown`;
- `RhCalculationTrace`;
- `RhReconciliationPanel`;
- `RhExternalStatus`;
- `RhSensitiveField`;
- `RhDocumentViewer`;
- `RhStepFlow`;
- `RhAsyncOperationStatus`;
- `RhDataQualitySummary`;
- `RhPrivacyNotice`;
- `RhAuditDrawer`;
- `RhEmptyState`;
- `RhErrorSummary`.

Os nomes são indicativos. Antes de criar componentes específicos, deverá ser verificado se o padrão já existe na plataforma.

---

## 7. Consequências positivas

- menor carga cognitiva;
- navegação consistente com a plataforma;
- decisões críticas mais visíveis;
- redução de erros por estado ou contexto;
- melhor entendimento de processos assíncronos;
- separação visual de dados sensíveis;
- acessibilidade verificável;
- componentes reutilizáveis;
- experiência coerente em desktop e mobile;
- validação antecipada dos fluxos antes do código.

---

## 8. Custos aceitos

- inventário amplo de telas e estados;
- prototipação antes da implementação;
- testes com teclado e leitores de tela;
- revisão de terminologia;
- componentes adicionais de domínio;
- tratamento explícito de loading, erro, vazio e estado incerto;
- maior disciplina em confirmações e permissões;
- necessidade de validar versões mobile e impressão.

---

## 9. Alternativas rejeitadas

### 9.1 Copiar a estrutura do banco para o menu

Rejeitada porque bounded contexts e tabelas não representam o modelo mental do usuário.

### 9.2 Dashboard com muitos KPIs como página inicial

Rejeitada porque prioriza números sem ação, aumenta ruído e pode esconder pendências críticas.

### 9.3 Menu lateral exclusivo do RH

Rejeitada porque duplicaria a navegação da plataforma, consumiria largura e criaria uma experiência paralela.

### 9.4 Um formulário único para todo o cadastro

Rejeitada por densidade, risco de perda de dados e dificuldade de autorização e validação por seção.

### 9.5 Modais para processos complexos

Rejeitada por problemas de espaço, foco, histórico, recuperação e navegação.

### 9.6 Ocultar ação sem explicar bloqueio

Rejeitada porque o usuário não aprende o estado nem sabe como prosseguir.

### 9.7 Exibir todos os detalhes técnicos

Rejeitada porque aumenta carga cognitiva e exposição de dados sem necessidade.

### 9.8 Criar componentes visuais próprios para cada módulo

Rejeitada por fragmentar o design system e elevar custo de manutenção.

---

## 10. Baseline verificada em 6 de agosto de 2026

Foram considerados:

- casca e navegação atuais da Innovar Platform;
- tokens, temas, foco, skip link, controles e padrões de página existentes;
- menu contextual declarado por aplicativo;
- telas operacionais existentes de Financeiro;
- WCAG 2.2;
- WAI-ARIA Authoring Practices para dialog, tabs, table, grid e toolbar;
- tutoriais WAI sobre labels, agrupamento, validação e notificações de formulários.

A implementação deverá testar os componentes com HTML semântico, teclado, zoom, reflow, temas, leitores de tela e automação de acessibilidade.

---

## 11. Regra de implementação

Esta ADR não autoriza:

- adicionar o aplicativo ao registry;
- criar menus ou rotas;
- instalar biblioteca de componentes;
- alterar o CSS global;
- criar páginas, formulários ou protótipos executáveis;
- adicionar dados reais;
- iniciar o Sprint 00;
- executar migrations;
- alterar a `main`;
- marcar o PR como pronto.

---

## 12. Decisão final

O Projeto RH adotará a casca e o design system da Innovar Platform, organizando a experiência por contexto, dossiê, estado, pendência e próxima decisão. A complexidade será revelada progressivamente; operações críticas terão confirmação e evidência proporcionais; dados sensíveis serão minimizados; e acessibilidade será tratada como requisito estrutural, não como correção posterior.
