# Projeto RH — Módulo 17 — Design de Interface, Fluxos, Componentes, Estados, Acessibilidade e Protótipos

**Versão:** 0.1.0  
**Estado:** especificação de experiência concluída; protótipos executáveis não iniciados  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**ADR vinculante:** `PROJETO-RH-ADR-017-INTERFACE-CONTEXTO-ESTADO-E-DECISAO.md`  
**Anexo vinculante:** `PROJETO-RH-MODULO-17-ANEXO-A-MAPA-DE-TELAS-E-PROTOTIPOS-TEXTUAIS.md`

---

## 1. Finalidade

Este módulo converte os domínios, dados e contratos do Projeto RH em uma arquitetura de experiência coerente com a Innovar Platform.

O objetivo é especificar:

- arquitetura de informação;
- navegação global e local;
- áreas de trabalho;
- filas, listas e dossiês;
- formulários e fluxos multi-etapa;
- ciclos de processamento;
- componentes de domínio;
- estados visuais e assíncronos;
- comportamento responsivo;
- acessibilidade;
- proteção visual de dados sensíveis;
- impressão, exportação e documentos;
- protótipos textuais e critérios para protótipos de alta fidelidade.

Este documento não cria páginas, CSS, componentes React ou arquivos de Figma.

---

## 2. Compatibilidade com a plataforma

O RH reutilizará:

- a casca superior autenticada;
- a seleção de organização;
- a identificação contextual do aplicativo;
- os menus declarados por módulo;
- a busca global;
- avisos e notificações;
- temas claro e escuro;
- tokens de cor, superfície, borda, foco, raio e sombra;
- botões, campos, badges, cards, tabelas e estados vazios existentes;
- cabeçalhos compactos dentro da casca;
- skip link e foco visível;
- alvos de interação mínimos;
- a orientação atual de evitar menu lateral global permanente.

A implementação do RH deverá contribuir com componentes reutilizáveis para a plataforma quando um padrão for útil fora do módulo.

---

## 3. Arquitetura de informação

### 3.1 Aplicativo

Chave proposta: `rh`.

Nome apresentado: **Recursos Humanos**.

Rota raiz proposta:

```text
/app/rh
```

### 3.2 Menus primários propostos

A primeira versão da navegação deverá caber na barra superior e no menu compacto mobile:

1. **Visão geral** — `/app/rh`;
2. **Pessoas** — `/app/rh/pessoas`;
3. **Movimentações** — `/app/rh/movimentacoes`;
4. **Jornada** — `/app/rh/jornada`;
5. **Folha** — `/app/rh/folha`;
6. **SST** — `/app/rh/sst`;
7. **Obrigações** — `/app/rh/obrigacoes`;
8. **Relatórios** — `/app/rh/relatorios`;
9. **Configuração** — `/app/rh/configuracao`.

Quando a largura não comportar todos os itens, o padrão mobile ou menu de overflow deverá preservar:

- item ativo;
- nome do aplicativo;
- acesso por teclado;
- ordem lógica;
- rótulos completos;
- ausência de scroll horizontal invisível.

### 3.3 Áreas secundárias

#### Pessoas

- pessoas;
- trabalhadores;
- vínculos;
- estrutura;
- documentos;
- dependentes;
- benefícios.

#### Movimentações

- admissões;
- alterações contratuais;
- férias;
- afastamentos;
- transferências;
- desligamentos.

#### Jornada

- escalas;
- marcações;
- tratamentos;
- apuração;
- banco de horas;
- fechamento.

#### Folha

- competências;
- ciclos;
- cálculos;
- diferenças;
- aprovações;
- pagamentos;
- demonstrativos.

#### SST

- riscos;
- exposições;
- exames;
- ASOs;
- incidentes;
- EPI;
- treinamentos;
- habilitações.

#### Obrigações

- calendário;
- eventos;
- transmissões;
- totalizadores;
- DCTFWeb;
- FGTS Digital;
- guias;
- reconciliações.

#### Relatórios

- operacionais;
- indicadores;
- planejamento da força de trabalho;
- qualidade dos dados;
- exportações.

#### Configuração

- empresas e estabelecimentos;
- unidades, cargos, funções e posições;
- políticas;
- motivos e mapeamentos;
- rubricas e fórmulas;
- parâmetros;
- integrações;
- permissões e capacidades;
- privacidade e retenção.

---

## 4. Padrões de tela

### 4.1 Área de trabalho

Usada nas páginas iniciais de RH, Folha, SST e Obrigações.

Composição:

1. cabeçalho compacto;
2. seletor de período e escopo;
3. fila de prioridades;
4. ciclos em andamento;
5. alertas de qualidade ou prazo;
6. atalhos operacionais;
7. atividade recente;
8. indicadores acionáveis.

### 4.2 Lista operacional

Composição:

1. título e ação primária;
2. busca;
3. filtros principais;
4. filtros avançados recolhíveis;
5. chips dos filtros aplicados;
6. contador e atualização;
7. tabela ou lista;
8. ação principal por linha;
9. menu de ações secundárias;
10. paginação por cursor ou navegação de resultados.

### 4.3 Dossiê

Aplicável a pessoa, vínculo, admissão, contrato, afastamento, acidente, folha, transmissão e desligamento.

Composição:

1. identidade e contexto;
2. estado principal;
3. alertas e bloqueios;
4. ações permitidas;
5. resumo;
6. tabs ou índice de seções;
7. conteúdo da seção;
8. timeline;
9. documentos e evidências;
10. auditoria autorizada.

### 4.4 Processo multi-etapa

Aplicável a admissão, concessão de férias, fechamento de folha, transmissão e desligamento.

Composição:

1. contexto persistente;
2. progresso;
3. etapas concluídas, atual e bloqueadas;
4. conteúdo da etapa;
5. salvamento parcial;
6. erros da etapa;
7. voltar e continuar;
8. revisão final;
9. confirmação proporcional ao risco;
10. resultado e próxima etapa.

### 4.5 Ciclo operacional

Aplicável a ponto, folha, obrigações e analytics.

Composição:

1. competência e escopo;
2. estado do ciclo;
3. qualidade das entradas;
4. execução atual;
5. diferenças;
6. aprovações;
7. fechamento;
8. efeitos externos;
9. reconciliação;
10. histórico de reaberturas ou reprocessamentos.

### 4.6 Configuração versionada

Composição:

1. catálogo;
2. estado e vigência;
3. versão atual;
4. versões futuras;
5. dependências;
6. impacto;
7. editor;
8. revisão de diferenças;
9. aprovação;
10. publicação.

---

## 5. Fluxos prioritários

### 5.1 Encontrar uma pessoa e entender a situação atual

```text
Busca global ou Pessoas
  → resultado minimizado
    → dossiê da pessoa
      → vínculos
        → vínculo selecionado
          → resumo, pendências e próximas ações
```

### 5.2 Concluir uma admissão

```text
Fila de admissões
  → caso
    → dados pessoais
      → vínculo e contrato
        → documentos
          → checklist
            → validações
              → revisão
                → ativação
                  → resultado e obrigações geradas
```

### 5.3 Tratar marcação de ponto

```text
Fila de inconsistências
  → pessoa e dia
    → marcações originais
      → escala prevista
        → evidências
          → tratamento proposto
            → aprovação quando necessária
              → reapuração
```

### 5.4 Conceder férias

```text
Pessoa ou fila de férias
  → direitos e saldo
    → período proposto
      → conflitos e cobertura
        → cálculo
          → aviso e ciência
            → aprovação
              → programação confirmada
```

### 5.5 Emitir ASO

```text
Necessidade de exame
  → convocação
    → atendimento
      → conteúdo clínico restrito
        → conclusão ocupacional
          → ASO
            → aptidão/restrição operacional minimizada
```

### 5.6 Fechar folha

```text
Competência
  → qualidade das entradas
    → população e snapshots
      → cálculo sombra/oficial
        → diferenças e alertas
          → conferência
            → aprovação
              → fechamento
                → pagamentos e obrigações
```

### 5.7 Transmitir evento governamental

```text
Obrigação
  → projeção
    → validação
      → aprovação
        → fila de transmissão
          → tentativa
            → recibo ou estado incerto
              → totalização
                → reconciliação
```

### 5.8 Concluir desligamento

```text
Caso
  → fundamento e proteções
    → aviso e datas
      → cálculo
        → documentos
          → aprovação
            → término efetivo
              → pagamento e eventos
                → offboarding
                  → conclusão
```

### 5.9 Planejar força de trabalho por obra

```text
Horizonte e obras
  → demanda
    → capacidade
      → lacunas
        → cenário
          → comparação
            → aprovação
              → propostas para fluxos canônicos
```

---

## 6. Componentes transversais

### 6.1 `RhScopeBar`

Mostra e permite alterar, conforme permissão:

- organização;
- empresa;
- estabelecimento;
- unidade;
- obra;
- competência;
- período.

A troca de escopo deverá atualizar URL ou estado compartilhável quando apropriado e avisar sobre dados não salvos.

### 6.2 `RhContextHeader`

Contém:

- nome principal;
- identificador secundário mascarado;
- vínculo ou competência ativa;
- estado;
- alertas;
- ação primária;
- menu de ações secundárias.

### 6.3 `RhStatusBadge`

Possui:

- texto;
- classe semântica;
- ícone opcional;
- descrição acessível;
- mapeamento centralizado.

### 6.4 `RhBlockingIssues`

Agrupa bloqueios por:

- impeditivos;
- requerem aprovação;
- alertas;
- informativos.

Cada item informa responsável, origem e ação segura.

### 6.5 `RhDecisionPanel`

Apresenta:

- decisão solicitada;
- resumo do impacto;
- evidências;
- conflitos;
- aprovar, rejeitar ou devolver;
- justificativa;
- autenticação reforçada quando exigida.

### 6.6 `RhTimeline`

Mostra eventos de negócio em ordem temporal com:

- data do fato;
- data do registro quando diferente;
- ator;
- tipo;
- resumo;
- documento ou evidência;
- correlação;
- filtros.

### 6.7 `RhVersionHistory`

Compara versões e vigências sem editar a versão publicada.

### 6.8 `RhAsyncOperationStatus`

Mostra:

- estado;
- progresso quando real;
- última atualização;
- correlação;
- tentativas;
- erro sanitizado;
- reconciliação;
- ação disponível.

### 6.9 `RhSensitiveField`

Apresenta valor mascarado e, quando permitido:

- botão de revelar;
- propósito;
- tempo limitado;
- registro de acesso;
- cópia controlada.

### 6.10 `RhCalculationTrace`

Explica cálculos com:

- rubrica;
- expressão humana;
- entradas;
- base;
- taxa;
- arredondamento;
- resultado;
- versão da regra;
- origem.

### 6.11 `RhReconciliationPanel`

Compara:

- interno;
- projetado;
- transmitido;
- aceito;
- totalizado;
- pago;
- diferença;
- ação.

### 6.12 `RhDataQualitySummary`

Informa completude, atualidade, inconsistências, cobertura e bloqueios antes de cálculos ou relatórios.

---

## 7. Formulários

### 7.1 Organização

Formulários extensos serão divididos por objetivo, não pela tabela de origem.

Exemplo de cadastro de pessoa:

1. identificação;
2. contato;
3. endereço;
4. documentos;
5. relações;
6. privacidade;
7. revisão.

### 7.2 Labels e ajuda

- label persistente para todo campo;
- ajuda curta ao lado ou abaixo;
- exemplo somente quando necessário;
- máscara não substituirá explicação;
- obrigatoriedade indicada em texto;
- termos técnicos terão definição contextual.

### 7.3 Validação

- validação estrutural no cliente para feedback rápido;
- validação autoritativa no servidor;
- erro junto ao campo;
- resumo de erros no início;
- foco no resumo após falha quando adequado;
- links do resumo para os campos;
- preservação dos valores válidos;
- não revelar regra ou dado restrito.

### 7.4 Autosave

Autosave somente será usado quando:

- o estado puder ser salvo como rascunho;
- o usuário receber confirmação discreta;
- conflitos de versão forem tratados;
- não houver efeito jurídico ou externo;
- a recuperação for clara.

### 7.5 Saída com alterações pendentes

A interface avisará antes de perder dados não salvos em:

- navegação interna;
- fechamento de painel;
- troca de contexto;
- atualização;
- retorno do navegador quando tecnicamente possível.

---

## 8. Tabelas, listas e filtros

### 8.1 Tabela padrão

Usada para leitura e seleção de registros.

Deverá possuir:

- caption ou nome acessível;
- cabeçalhos semânticos;
- ordenação identificada;
- estado vazio;
- estado de loading;
- erro;
- ações por linha;
- colunas prioritárias;
- paginação por cursor quando necessária.

### 8.2 Data grid

Somente para edição tabular intensa ou navegação de célula. Deverá implementar integralmente o padrão de teclado escolhido; não será usado apenas por aparência.

### 8.3 Filtros

Filtros serão:

- previsíveis;
- compartilháveis quando útil;
- visíveis após aplicados;
- removíveis individualmente;
- limpáveis em conjunto;
- compatíveis com teclado;
- sem disparar consultas pesadas a cada tecla sem debounce ou ação explícita.

### 8.4 Seleção em massa

Deverá indicar:

- registros selecionados na página;
- seleção total entre páginas, quando suportada;
- escopo;
- ação;
- consequências;
- itens incompatíveis;
- resultado parcial.

Ação em massa de alto risco exigirá revisão dedicada.

---

## 9. Estados de interface

Toda tela ou componente de dados deverá especificar:

1. inicial;
2. carregando;
3. carregamento parcial;
4. vazio inicial;
5. vazio após filtro;
6. sucesso;
7. aviso;
8. erro recuperável;
9. erro impeditivo;
10. acesso negado;
11. dado desatualizado;
12. conflito de versão;
13. processamento assíncrono;
14. estado externo incerto;
15. indisponibilidade externa;
16. offline ou conexão degradada quando aplicável.

### 9.1 Loading

- skeleton somente quando refletir estrutura real;
- spinner com rótulo para ação curta;
- progresso percentual apenas se calculável;
- não simular progresso;
- anunciar mudanças relevantes sem excesso.

### 9.2 Vazio

Distinguir:

- ainda não existem dados;
- o filtro não encontrou resultados;
- o usuário não possui escopo;
- a integração ainda não sincronizou;
- o ciclo ainda não foi criado.

### 9.3 Erro

Erro deve informar:

- o que não foi concluído;
- se houve ou não alteração;
- o que pode ser feito;
- correlation ID quando útil ao suporte;
- dados preservados;
- ação de tentar novamente somente quando segura.

---

## 10. Responsividade

### 10.1 Desktop amplo

Priorizar:

- tabelas densas;
- comparação lado a lado;
- painéis contextuais;
- memória de cálculo;
- dashboards e cenários.

### 10.2 Notebook

Evitar:

- cabeçalhos excessivos;
- colunas fixas desnecessárias;
- painéis simultâneos que reduzam o conteúdo principal;
- scroll horizontal da página.

### 10.3 Tablet

- filtros em painel recolhível;
- ações principais persistentes sem cobrir conteúdo;
- tabelas com colunas prioritárias;
- dossiê em seções empilhadas;
- menus compatíveis com toque.

### 10.4 Mobile

Priorizar tarefas realmente úteis em campo ou autosserviço:

- consultar situação;
- registrar ou tratar marcação;
- anexar documento;
- confirmar ciência;
- consultar escala;
- consultar demonstrativo;
- registrar incidente;
- verificar habilitação;
- concluir checklist simples.

Folha completa, parametrização extensa e análise tabular poderão oferecer experiência limitada ou recomendar desktop, sem bloquear tarefas urgentes que precisam ser móveis.

### 10.5 Reflow e zoom

A interface deverá funcionar a 400% de zoom e em largura equivalente a 320 CSS pixels, salvo exceções justificadas para conteúdo bidimensional essencial, que deverão ter alternativa ou rolagem controlada no componente.

---

## 11. Acessibilidade

### 11.1 Estrutura

- um `h1` por página;
- hierarquia de headings;
- landmarks;
- skip link;
- título de página coerente;
- idioma correto;
- ordem de leitura compatível com a visual.

### 11.2 Teclado

- todas as ações operáveis;
- foco visível;
- ausência de armadilhas;
- Escape fecha overlays quando seguro;
- retorno do foco ao elemento de origem;
- atalhos não conflitam com tecnologias assistivas;
- grids interativos seguem padrão completo.

### 11.3 Formulários

- labels associados;
- `fieldset` e `legend` para grupos;
- ajuda referenciada;
- erros em texto;
- `aria-invalid` e descrições quando aplicável;
- status de salvamento anunciado;
- required comunicado visual e semanticamente.

### 11.4 Modais e popovers

- nome acessível;
- descrição quando necessária;
- foco inicial adequado;
- contenção de foco;
- botão de fechar visível;
- conteúdo de fundo inerte;
- sem modal dentro de modal salvo justificativa excepcional.

### 11.5 Tabs

- `tablist`, `tab`, `tabpanel`;
- estado selecionado;
- relações `aria-controls` e `aria-labelledby`;
- teclado conforme ativação manual ou automática;
- conteúdo importante acessível por URL quando necessário.

### 11.6 Gráficos

- título e resumo;
- dados tabulares equivalentes;
- não depender de cor;
- tooltip acessível quando houver;
- padrões ou rótulos adicionais;
- interpretação e limitações.

### 11.7 Movimento

- respeitar `prefers-reduced-motion`;
- evitar animações contínuas;
- não usar movimento como única indicação;
- permitir pausa quando aplicável.

### 11.8 Temas

Todos os estados e componentes serão testados nos temas claro e escuro, incluindo hover, foco, disabled, erro, sucesso, warning e seleção.

---

## 12. Privacidade visual

### 12.1 Mascaramento

Exemplos:

- CPF: `***.***.***-12`;
- conta: `•••• 4321`;
- telefone: final parcial conforme finalidade;
- e-mail: mascaramento em listas quando identificação completa não for necessária.

### 12.2 Revelação

Revelar dado sensível poderá exigir:

- capability;
- finalidade;
- ação explícita;
- expiração;
- auditoria;
- bloqueio de cópia quando justificável.

### 12.3 Notificações

Notificações não incluirão diagnóstico, valor integral de folha, documento completo ou fundamento judicial sensível.

### 12.4 URLs e breadcrumbs

Não transportarão CPF, nome clínico, diagnóstico, conta bancária ou conteúdo sensível.

---

## 13. Documentos, impressão e exportação

### 13.1 Viewer

O visualizador deverá informar:

- tipo;
- versão;
- estado;
- assinatura;
- hash quando autorizado;
- classificação;
- download permitido;
- expiração.

### 13.2 Impressão

Telas imprimíveis deverão:

- remover navegação;
- manter contexto;
- indicar data e hora;
- indicar versão;
- preservar quebras;
- não imprimir controles interativos;
- aplicar mascaramento conforme o usuário.

### 13.3 Exportação

Antes de exportar, a interface mostrará:

- escopo;
- filtros;
- colunas;
- sensibilidade;
- finalidade;
- expiração;
- aviso de responsabilidade.

---

## 14. Busca global e busca local

A busca global poderá localizar, conforme permissão:

- pessoas;
- trabalhadores;
- vínculos;
- casos;
- competências;
- documentos;
- transmissões.

Resultados deverão ser minimizados e agrupados por tipo. A busca não exibirá dados clínicos, judiciais ou financeiros sensíveis em snippets.

Buscas locais deverão preservar filtros e oferecer busca por identificadores adequados, sem exigir CPF completo quando outro identificador suficiente existir.

---

## 15. Notificações e central de trabalho

Notificações serão acionáveis e classificadas em:

- ação necessária;
- prazo próximo;
- decisão aguardando;
- processamento concluído;
- falha ou divergência;
- informação.

A notificação deverá apontar para o contexto correto e não apenas para a página inicial do módulo.

Alertas persistentes permanecerão na fila até resolução, dispensa autorizada ou expiração. Toast não será usado para informação que exige decisão posterior.

---

## 16. Requisitos de interface

### Arquitetura e navegação

- **RI-001:** registrar o RH como aplicativo separado na casca quando a implementação for autorizada.
- **RI-002:** usar menus contextuais declarados e validados.
- **RI-003:** manter Visão geral como rota raiz.
- **RI-004:** indicar menu ativo com texto, estilo e `aria-current`.
- **RI-005:** preservar navegação utilizável em telas estreitas.
- **RI-006:** não introduzir menu lateral global permanente.
- **RI-007:** oferecer navegação local quando o dossiê exigir muitas seções.
- **RI-008:** permitir link direto para seções importantes.
- **RI-009:** preservar contexto ao retornar de detalhes para listas.
- **RI-010:** avisar antes de trocar contexto com dados não salvos.
- **RI-011:** manter breadcrumbs somente quando acrescentarem contexto.
- **RI-012:** não incluir dados sensíveis em breadcrumbs ou título.
- **RI-013:** integrar busca global com resultados minimizados.
- **RI-014:** limitar resultados de busca por permissão e escopo.
- **RI-015:** oferecer busca local em listas extensas.

### Áreas de trabalho e listas

- **RI-016:** exibir fila de prioridades na visão geral.
- **RI-017:** ordenar prioridades por prazo, impacto e estado configurável.
- **RI-018:** permitir filtrar prioridades por empresa, unidade, obra e responsável.
- **RI-019:** distinguir indicadores acionáveis de métricas informativas.
- **RI-020:** abrir o contexto correto a partir de cada pendência.
- **RI-021:** oferecer estado vazio inicial com próxima ação.
- **RI-022:** oferecer estado vazio por filtro com limpeza dos filtros.
- **RI-023:** mostrar última atualização de dados relevantes.
- **RI-024:** sinalizar fonte atrasada ou incompleta.
- **RI-025:** permitir salvar visões autorizadas.
- **RI-026:** exibir chips para filtros aplicados.
- **RI-027:** permitir remover filtros individualmente.
- **RI-028:** usar ordenação determinística.
- **RI-029:** oferecer paginação por cursor em listas extensas.
- **RI-030:** preservar seleção e filtros ao retornar de um registro quando seguro.

### Dossiês e contexto

- **RI-031:** oferecer dossiê separado de pessoa e vínculo.
- **RI-032:** mostrar vínculo ativo selecionado sem esconder outros vínculos.
- **RI-033:** apresentar estado principal no cabeçalho.
- **RI-034:** apresentar bloqueios antes das ações críticas.
- **RI-035:** mostrar ação primária conforme estado e capability.
- **RI-036:** agrupar ações secundárias sem esconder ações urgentes.
- **RI-037:** disponibilizar timeline de eventos.
- **RI-038:** distinguir data do fato e data do registro.
- **RI-039:** apresentar documentos e evidências relacionados.
- **RI-040:** oferecer histórico de versões.
- **RI-041:** comparar versões lado a lado ou por diff legível.
- **RI-042:** indicar vigência atual, futura e encerrada.
- **RI-043:** mostrar origem e confiança de dados importados.
- **RI-044:** permitir copiar identificadores não sensíveis.
- **RI-045:** mascarar identificadores sensíveis por padrão.

### Formulários e fluxos

- **RI-046:** dividir formulários extensos por tarefa.
- **RI-047:** usar labels persistentes.
- **RI-048:** identificar obrigatoriedade em texto.
- **RI-049:** agrupar campos relacionados semanticamente.
- **RI-050:** fornecer ajuda contextual.
- **RI-051:** validar formato no cliente e regra no servidor.
- **RI-052:** apresentar erros junto aos campos.
- **RI-053:** apresentar resumo de erros.
- **RI-054:** preservar valores após falha.
- **RI-055:** mover foco de forma coerente após erro.
- **RI-056:** permitir rascunho quando o domínio suportar.
- **RI-057:** indicar salvamento em andamento e concluído.
- **RI-058:** tratar conflito de versão sem sobrescrever silenciosamente.
- **RI-059:** usar stepper apenas em sequência real.
- **RI-060:** permitir revisão final antes de ação crítica.

### Decisões e confirmações

- **RI-061:** apresentar impacto da decisão.
- **RI-062:** apresentar evidências relevantes.
- **RI-063:** exigir justificativa quando a regra determinar.
- **RI-064:** separar aprovar, rejeitar e devolver.
- **RI-065:** permitir dupla aprovação quando configurada.
- **RI-066:** usar confirmação proporcional ao risco.
- **RI-067:** exigir confirmação explícita para transmissão externa.
- **RI-068:** não usar botão destrutivo como ação dominante.
- **RI-069:** informar se a ação pode ser desfeita.
- **RI-070:** apresentar resultado e próxima etapa.

### Processamento e integrações

- **RI-071:** mostrar estado de operação assíncrona.
- **RI-072:** mostrar correlation ID quando útil.
- **RI-073:** mostrar última atualização e tentativas autorizadas.
- **RI-074:** distinguir sucesso, falha e estado externo incerto.
- **RI-075:** impedir retry perigoso enquanto houver reconciliação pendente.
- **RI-076:** permitir atualização manual segura do estado.
- **RI-077:** apresentar erro externo sanitizado.
- **RI-078:** mostrar recibo e protocolo quando disponíveis.
- **RI-079:** apresentar diferenças de reconciliação.
- **RI-080:** permitir navegar do erro à origem interna autorizada.

### Folha e cálculos

- **RI-081:** apresentar competência e tipo de ciclo.
- **RI-082:** apresentar população e qualidade das entradas.
- **RI-083:** distinguir cálculo sombra e oficial.
- **RI-084:** mostrar diferenças entre execuções.
- **RI-085:** explicar cálculo por rubrica.
- **RI-086:** apresentar bases, taxas e arredondamentos.
- **RI-087:** distinguir devido, pago e declarado.
- **RI-088:** mostrar aprovações e fechamento.
- **RI-089:** apresentar efeitos de reabertura.
- **RI-090:** oferecer demonstrativo acessível e imprimível.

### SST e dados sensíveis

- **RI-091:** separar conteúdo clínico de conclusão ocupacional.
- **RI-092:** mostrar somente aptidão e restrição operacional a gestores.
- **RI-093:** exigir capacidade específica para prontuário.
- **RI-094:** registrar revelação de dado sensível quando aplicável.
- **RI-095:** impedir dados clínicos em notificações comuns.
- **RI-096:** mostrar validade de treinamento e habilitação.
- **RI-097:** destacar bloqueio operacional sem revelar diagnóstico.
- **RI-098:** permitir registro mobile de incidente com salvamento seguro.
- **RI-099:** apresentar ações corretivas e responsáveis.
- **RI-100:** oferecer visão agregada de SST sem identificar indevidamente.

### Responsividade, acessibilidade e qualidade

- **RI-101:** funcionar por teclado.
- **RI-102:** manter foco visível.
- **RI-103:** usar HTML semântico antes de ARIA.
- **RI-104:** implementar modais com foco controlado.
- **RI-105:** implementar tabs conforme padrão acessível.
- **RI-106:** usar tabela semântica para leitura tabular.
- **RI-107:** usar grid somente com interação completa.
- **RI-108:** fornecer alternativa tabular para gráficos.
- **RI-109:** não depender somente de cor.
- **RI-110:** respeitar redução de movimento.
- **RI-111:** funcionar nos temas claro e escuro.
- **RI-112:** suportar zoom e reflow.
- **RI-113:** manter alvos de toque adequados.
- **RI-114:** não produzir scroll horizontal da página.
- **RI-115:** adaptar tabelas sem remover informação essencial.
- **RI-116:** preservar tarefa urgente no mobile.
- **RI-117:** testar com leitor de tela em fluxos críticos.
- **RI-118:** executar automação de acessibilidade no CI futuro.
- **RI-119:** documentar exceções de acessibilidade.
- **RI-120:** impedir aprovação visual sem estados de erro, vazio, loading e acesso negado.

---

## 17. Regras de interface

- **RUI-001:** a interface não será fonte canônica de estado.
- **RUI-002:** esconder botão não será controle de autorização.
- **RUI-003:** menu exibirá apenas rotas existentes e autorizadas.
- **RUI-004:** o item ativo será identificável sem depender só de cor.
- **RUI-005:** a barra superior continuará sendo navegação global.
- **RUI-006:** navegação local não duplicará toda a navegação global.
- **RUI-007:** página inicial priorizará trabalho pendente.
- **RUI-008:** KPI sem ação ou interpretação não ocupará prioridade visual.
- **RUI-009:** cada tela terá um objetivo principal.
- **RUI-010:** cada ação crítica terá consequência explícita.
- **RUI-011:** pessoa e vínculo não serão apresentados como equivalentes.
- **RUI-012:** contrato e versão contratual permanecerão distinguíveis.
- **RUI-013:** programação e ocorrência terão estados próprios.
- **RUI-014:** cálculo e pagamento não compartilharão um único status.
- **RUI-015:** transmissão e aceitação externa não compartilharão um único status.
- **RUI-016:** cenário e plano aprovado permanecerão separados.
- **RUI-017:** aptidão não revelará diagnóstico.
- **RUI-018:** dashboard não permitirá alterar fato canônico diretamente.
- **RUI-019:** ação indisponível será explicada quando seguro.
- **RUI-020:** detalhe técnico será progressivo.
- **RUI-021:** modal não conterá processo longo.
- **RUI-022:** modal terá fechamento visível.
- **RUI-023:** diálogo destrutivo devolverá foco adequadamente.
- **RUI-024:** placeholder não substituirá label.
- **RUI-025:** required não será comunicado somente por asterisco.
- **RUI-026:** erro não será comunicado somente por cor.
- **RUI-027:** erro de servidor preservará os dados válidos.
- **RUI-028:** mensagem técnica bruta não será exibida ao usuário.
- **RUI-029:** correlation ID não conterá dado pessoal.
- **RUI-030:** autosave não executará efeito jurídico ou externo.
- **RUI-031:** stepper exigirá sequência real.
- **RUI-032:** tabs não representarão etapas obrigatórias.
- **RUI-033:** URL preservará seção quando útil.
- **RUI-034:** tabela será padrão para dados tabulares estáticos.
- **RUI-035:** grid exigirá teclado completo.
- **RUI-036:** seleção em massa explicará o escopo.
- **RUI-037:** ação em massa crítica terá revisão.
- **RUI-038:** filtro não ampliará acesso.
- **RUI-039:** visão salva não armazenará permissão.
- **RUI-040:** dado atrasado será sinalizado.
- **RUI-041:** skeleton refletirá estrutura plausível.
- **RUI-042:** progresso percentual não será inventado.
- **RUI-043:** estado vazio inicial e por filtro serão diferentes.
- **RUI-044:** retry só será oferecido quando idempotente ou seguro.
- **RUI-045:** resposta externa incerta não será marcada como falha definitiva.
- **RUI-046:** toast não substituirá pendência persistente.
- **RUI-047:** notificação apontará para o contexto correto.
- **RUI-048:** notificação não exibirá dado clínico ou financeiro integral.
- **RUI-049:** dado sensível será mascarado por padrão.
- **RUI-050:** revelar dado sensível será ação explícita.
- **RUI-051:** CPF não será usado como rótulo principal.
- **RUI-052:** dados sensíveis não irão para URL.
- **RUI-053:** exportação terá confirmação e finalidade.
- **RUI-054:** impressão respeitará o mesmo mascaramento da tela.
- **RUI-055:** portal do trabalhador será minimizado.
- **RUI-056:** gestor não verá prontuário clínico.
- **RUI-057:** interface mobile não será versão reduzida sem priorização.
- **RUI-058:** tarefa urgente de campo terá caminho mobile quando aplicável.
- **RUI-059:** tela desktop não dependerá de hover.
- **RUI-060:** alvo de toque seguirá o mínimo do design system.
- **RUI-061:** foco permanecerá visível nos dois temas.
- **RUI-062:** ordem de foco seguirá a ordem lógica.
- **RUI-063:** nenhum overlay criará armadilha de teclado.
- **RUI-064:** ícone sem texto terá nome acessível.
- **RUI-065:** texto visível e nome acessível serão coerentes.
- **RUI-066:** gráfico terá equivalente textual ou tabular.
- **RUI-067:** cor de status será centralizada.
- **RUI-068:** componente novo justificará reutilização ou especificidade.
- **RUI-069:** CSS específico não duplicará token global sem necessidade.
- **RUI-070:** protótipo não será marcado como implementação.
- **RUI-071:** protótipo usará dados fictícios.
- **RUI-072:** teste de usabilidade não usará dado pessoal real.
- **RUI-073:** aprovação de protótipo não substituirá teste de segurança.
- **RUI-074:** acessibilidade será verificada antes do aceite visual.
- **RUI-075:** temas claro e escuro serão homologados.
- **RUI-076:** estados loading, vazio, erro e negado serão prototipados.
- **RUI-077:** textos críticos passarão por revisão de linguagem.
- **RUI-078:** termos legais terão ajuda contextual e não interpretação automática.
- **RUI-079:** a interface não prometerá prazo externo não confirmado.
- **RUI-080:** toda implementação revalidará a casca e o design system vigentes.

---

## 18. Critérios de aceite

- **CAI-001:** o RH aparece como aplicativo somente para usuário autorizado.
- **CAI-002:** a barra identifica organização, módulo e menu ativo.
- **CAI-003:** o menu compacto funciona por teclado e toque.
- **CAI-004:** a visão geral apresenta pendências acionáveis antes de KPIs decorativos.
- **CAI-005:** uma pendência abre o registro e a seção corretos.
- **CAI-006:** filtros permanecem visíveis e removíveis.
- **CAI-007:** voltar do detalhe preserva o contexto da lista.
- **CAI-008:** pessoa com dois vínculos permite selecionar o vínculo sem duplicar a pessoa.
- **CAI-009:** dossiê mostra estado, bloqueios e ações permitidas.
- **CAI-010:** ação não autorizada não aparece e também falha no servidor.
- **CAI-011:** bloqueio explicável informa o requisito pendente.
- **CAI-012:** versão atual e histórica são distinguíveis.
- **CAI-013:** timeline distingue fato e registro.
- **CAI-014:** formulário mantém labels quando preenchido.
- **CAI-015:** erro de campo possui texto e associação semântica.
- **CAI-016:** resumo de erros leva ao campo correspondente.
- **CAI-017:** falha de servidor preserva entradas válidas.
- **CAI-018:** conflito de versão não sobrescreve o registro silenciosamente.
- **CAI-019:** stepper permite entender etapa atual e bloqueios.
- **CAI-020:** confirmação crítica apresenta impacto e dados revisados.
- **CAI-021:** rejeição e devolução não são confundidas.
- **CAI-022:** operação assíncrona apresenta estado e atualização.
- **CAI-023:** estado externo incerto não oferece reenvio cego.
- **CAI-024:** erro técnico é sanitizado e inclui correlação quando útil.
- **CAI-025:** cálculo de folha distingue sombra e oficial.
- **CAI-026:** memória de cálculo mostra regra, entradas e arredondamento.
- **CAI-027:** devido, pago e declarado aparecem separados.
- **CAI-028:** gestor não acessa diagnóstico em tela de SST.
- **CAI-029:** prontuário exige capacidade específica.
- **CAI-030:** dado sensível aparece mascarado na lista.
- **CAI-031:** revelação autorizada é registrada.
- **CAI-032:** notificação não contém dado sensível integral.
- **CAI-033:** exportação mostra escopo, filtros e finalidade.
- **CAI-034:** impressão mantém versão e data de emissão.
- **CAI-035:** tabela possui cabeçalhos e nome acessível.
- **CAI-036:** grid interativo possui navegação de teclado documentada.
- **CAI-037:** tabs funcionam conforme o padrão de teclado escolhido.
- **CAI-038:** modal mantém foco, fecha com ação visível e devolve foco.
- **CAI-039:** fluxo crítico é concluído apenas com teclado.
- **CAI-040:** foco é visível nos temas claro e escuro.
- **CAI-041:** estado não depende somente de cor.
- **CAI-042:** gráfico possui alternativa tabular.
- **CAI-043:** interface respeita redução de movimento.
- **CAI-044:** página funciona em zoom de 400% sem perda essencial.
- **CAI-045:** largura equivalente a 320 CSS pixels não produz scroll horizontal da página.
- **CAI-046:** tabela larga rola dentro do componente ou possui alternativa.
- **CAI-047:** tarefa mobile de campo mantém ações essenciais.
- **CAI-048:** estado vazio inicial oferece próxima ação.
- **CAI-049:** estado vazio por filtro oferece limpar filtros.
- **CAI-050:** loading não anuncia progresso fictício.
- **CAI-051:** acesso negado não revela existência ou conteúdo indevido.
- **CAI-052:** protótipos utilizam dados fictícios.
- **CAI-053:** protótipos cobrem sucesso, erro, vazio, loading e bloqueio.
- **CAI-054:** aprovação do protótipo é registrada separadamente da implementação.
- **CAI-055:** nenhum componente, rota ou CSS é criado apenas pela aprovação desta especificação.

---

## 19. Estratégia de prototipação

### 19.1 Baixa fidelidade

Validar:

- arquitetura de informação;
- navegação;
- sequência;
- hierarquia;
- densidade;
- terminologia;
- estados.

### 19.2 Média fidelidade

Validar:

- componentes;
- responsividade;
- comportamento de filtros;
- formulários;
- confirmações;
- dados sensíveis;
- teclado e foco conceitual.

### 19.3 Alta fidelidade

Validar:

- tokens reais;
- temas;
- tipografia;
- espaçamento;
- contraste;
- estados interativos;
- conteúdo realista fictício;
- microinterações reduzidas;
- equivalência com componentes existentes.

### 19.4 Protótipo navegável

Fluxos mínimos:

1. localizar pessoa e vínculo;
2. concluir admissão;
3. tratar inconsistência de ponto;
4. programar férias;
5. emitir conclusão ocupacional;
6. revisar cálculo de folha;
7. acompanhar transmissão externa;
8. concluir desligamento;
9. consultar demonstrativo no portal;
10. comparar cenário de força de trabalho.

---

## 20. Testes de experiência

### 20.1 Revisão heurística

- consistência;
- visibilidade do estado;
- correspondência com o mundo real;
- prevenção de erros;
- controle do usuário;
- reconhecimento em vez de memorização;
- flexibilidade;
- ajuda e recuperação.

### 20.2 Teste de tarefas

Métricas:

- conclusão;
- erro;
- abandono;
- tempo observado;
- necessidade de ajuda;
- compreensão do estado;
- confiança declarada.

Tempo não será usado isoladamente para avaliar usuários ou trabalhadores.

### 20.3 Acessibilidade

- teclado;
- leitor de tela;
- zoom;
- reflow;
- contraste;
- temas;
- redução de movimento;
- automação;
- inspeção semântica.

### 20.4 Conteúdo

- linguagem direta;
- rótulos consistentes;
- mensagens de erro acionáveis;
- ausência de culpa;
- precisão jurídica sem juridiquês desnecessário;
- termos externos explicados.

---

## 21. Estado honesto

Foram definidos arquitetura de informação, padrões de tela, fluxos, componentes, requisitos, regras, critérios e protótipos textuais.

Não foram criados:

- aplicativo no registry;
- menus;
- rotas;
- páginas;
- componentes React;
- CSS;
- Storybook;
- arquivo Figma;
- imagem de tela;
- protótipo clicável;
- teste de usabilidade executado;
- teste de acessibilidade executado;
- código produtivo.

---

## 22. Conclusão

O Módulo 17 define uma experiência orientada a trabalho, contexto, estado e decisão. O RH será visualmente parte da Innovar Platform, com complexidade progressiva, proteção de dados sensíveis, suporte a processos assíncronos e acessibilidade desde o desenho.

A próxima etapa deverá definir a estratégia de qualidade, testes, observabilidade, segurança operacional, evidências e critérios objetivos de liberação antes do início da implementação.
