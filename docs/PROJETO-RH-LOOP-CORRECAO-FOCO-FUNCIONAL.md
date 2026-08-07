# Projeto RH — Loop de Correção do Foco Funcional

**Estado:** loop ativo  
**Data:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`

## 1. Motivo

A revisão do usuário identificou que a documentação acumulou arquitetura, governança e meta-processos em excesso, enquanto o objetivo principal exige módulos de RH/Departamento Pessoal efetivamente operáveis e integrados às interfaces oficiais aplicáveis.

Este loop corrige esse desvio sem apagar as decisões técnicas já válidas.

## 2. Regra de encerramento

O loop somente pode ser marcado como concluído quando todos os itens abaixo tiverem cobertura explícita, funcional e rastreável.

Para cada capacidade deve existir, conforme aplicável:

- ator;
- entrada;
- tela ou ação;
- validação;
- regra de negócio;
- cálculo ou transformação;
- estado;
- saída;
- integração de origem/destino;
- tratamento de erro;
- retificação/reabertura quando aplicável;
- auditoria;
- relatório ou reconciliação;
- referência oficial datada quando depender de obrigação externa.

## 3. Checklist do núcleo obrigatório

| Item | Documento principal | Estado do loop |
|---|---|---|
| Recursos Humanos | M01–M12 | [ ] auditar funcionalidade integrada |
| Departamento Pessoal | M03–M11 | [ ] auditar funcionalidade integrada |
| folha de pagamento | M09 + anexos corretivos | [ ] aprofundar integralmente |
| gestão de empregados | M01/M02/M04 | [ ] auditar |
| admissão | M03 | [ ] auditar integração eSocial |
| contratos de trabalho | M04 | [ ] auditar integração eSocial |
| jornada | M05 | [ ] auditar integração folha |
| ponto | M05 | [ ] auditar integração folha |
| férias | M06/M09 | [ ] auditar cálculo e eventos |
| afastamentos | M06/M10 | [ ] auditar eSocial/folha |
| benefícios | M07/M09 | [ ] auditar folha |
| medicina e segurança do trabalho | M08/M10 | [ ] auditar eventos SST |
| desligamento | M11/M09/M10 | [ ] auditar rescisão/eSocial/FGTS |
| obrigações trabalhistas e previdenciárias | M10 | [ ] aprofundar integralmente |
| eSocial | M10 + anexo corretivo | [ ] aprofundar canal oficial |
| DCTFWeb | M10 + anexo corretivo | [ ] aprofundar fluxo real |
| FGTS Digital | M10 + anexo corretivo | [ ] aprofundar fluxo real |
| gestão de documentos | M03/M04/M06/M08/M11/M13 | [ ] auditar experiência funcional |
| relatórios gerenciais | M12 + relatórios dos domínios | [ ] auditar |
| indicadores de RH | M12 | [ ] auditar |

## 4. Checklist obrigatório da Folha

| Capacidade | Estado |
|---|---|
| cadastro de empresas | [ ] |
| estabelecimentos | [ ] |
| lotações tributárias | [ ] |
| empregados | [ ] |
| trabalhadores sem vínculo | [ ] |
| cargos | [ ] |
| funções | [ ] |
| sindicatos | [ ] |
| jornadas | [ ] |
| salários | [ ] |
| rubricas | [ ] |
| eventos fixos | [ ] |
| eventos variáveis | [ ] |
| lançamentos | [ ] |
| folha mensal | [ ] |
| adiantamento | [ ] |
| décimo terceiro | [ ] |
| férias | [ ] |
| rescisão | [ ] |
| folha complementar | [ ] |
| diferenças retroativas | [ ] |
| afastamentos | [ ] |
| pensão alimentícia | [ ] |
| empréstimos | [ ] |
| benefícios | [ ] |
| descontos | [ ] |
| encargos | [ ] |
| provisões | [ ] |
| contabilização | [ ] |
| fechamento | [ ] |
| reabertura | [ ] |
| retificação | [ ] |
| recibos | [ ] |
| relatórios | [ ] |
| arquivos e eventos digitais | [ ] |

## 5. Checklist obrigatório da rubrica

Cada rubrica relevante deverá documentar:

- [ ] nome;
- [ ] descrição;
- [ ] natureza;
- [ ] fórmula;
- [ ] base de cálculo;
- [ ] incidência previdenciária parametrizada;
- [ ] incidência IRRF parametrizada;
- [ ] incidência FGTS parametrizada;
- [ ] comportamento em 13º;
- [ ] comportamento em férias;
- [ ] reflexos;
- [ ] uso;
- [ ] parametrização;
- [ ] vínculo versionado com Tabela 03/natureza do eSocial;
- [ ] necessidade de atualização futura.

## 6. Checklist de integração eSocial

- [ ] cadastro e qualificação;
- [ ] validação prévia;
- [ ] geração do evento;
- [ ] assinatura digital;
- [ ] transmissão pelo canal oficial aplicável;
- [ ] protocolo;
- [ ] consulta de processamento;
- [ ] recibo;
- [ ] rejeições;
- [ ] correção;
- [ ] retificação;
- [ ] exclusão quando admitida;
- [ ] fechamento periódico;
- [ ] reabertura;
- [ ] auditoria integral;
- [ ] eventos de tabela;
- [ ] eventos não periódicos;
- [ ] eventos periódicos;
- [ ] totalizadores;
- [ ] advertências versus erros impeditivos.

## 7. Checklist DCTFWeb

- [ ] remuneração/folha → totalizadores;
- [ ] fechamento eSocial/EFD-Reinf → sensibilização automática da DCTFWeb;
- [ ] apuração das contribuições;
- [ ] declaração em andamento;
- [ ] transmissão/assinatura conforme fluxo oficial vigente;
- [ ] constituição dos débitos;
- [ ] DARF/documentos de arrecadação;
- [ ] pagamentos;
- [ ] reabertura da escrituração;
- [ ] retificação da origem;
- [ ] nova DCTFWeb/retificadora;
- [ ] reconciliação folha × eSocial × DCTFWeb;
- [ ] não tratar o software como substituto da Receita Federal.

## 8. Checklist FGTS Digital

- [ ] base originada do eSocial;
- [ ] conferência por trabalhador;
- [ ] conferência por estabelecimento;
- [ ] divergências;
- [ ] alertas;
- [ ] guias;
- [ ] vencimentos;
- [ ] pagamento;
- [ ] conciliação;
- [ ] histórico;
- [ ] relatórios de diferenças;
- [ ] rescisões;
- [ ] remunerações para fins rescisórios;
- [ ] competências anteriores quando aplicável;
- [ ] processos trabalhistas quando aplicável;
- [ ] não confundir com SEFIP/GRRF/Conectividade Social como fluxo corrente padrão.

## 9. Fontes oficiais obrigatórias do loop

- Portal e documentação técnica do eSocial;
- leiautes, XSD, regras e Manual do Desenvolvedor do eSocial;
- Receita Federal — DCTFWeb, manuais, perguntas/respostas e notas orientativas;
- Ministério do Trabalho e Emprego — FGTS Digital, manual e documentação técnica;
- legislação federal e DOU quando a regra depender de base legal;
- CAIXA quando pertinente ao fluxo operacional;
- ANPD e LGPD para privacidade;
- normas oficiais de SST quando pertinente.

## 10. Ciclos do loop

### Ciclo 1 — Folha operacional e rubricas

- [ ] criar catálogo funcional detalhado de rubricas;
- [ ] detalhar todos os processamentos da folha;
- [ ] explicitar entradas/saídas por módulo;
- [ ] corrigir M09.

### Ciclo 2 — eSocial

- [ ] documentar adapters e contratos do Web Service;
- [ ] mapear eventos por origem funcional;
- [ ] documentar assinatura/protocolo/consulta/recibo;
- [ ] documentar retificação/exclusão/reabertura;
- [ ] corrigir M10.

### Ciclo 3 — DCTFWeb e FGTS Digital

- [ ] documentar integração indireta e automática DCTFWeb a partir dos fechamentos;
- [ ] documentar pontos que exigem interação/integração própria quando oficialmente disponíveis;
- [ ] documentar fluxo FGTS baseado nas remunerações e totalizadores do eSocial;
- [ ] documentar guias, pagamentos e reconciliação;
- [ ] corrigir M10.

### Ciclo 4 — Núcleo completo

- [ ] auditar M01–M12 contra a lista obrigatória;
- [ ] corrigir lacunas encontradas;
- [ ] criar matriz de integração entre módulos.

### Ciclo 5 — Auditoria final

- [ ] repetir todos os checklists deste arquivo;
- [ ] registrar PASS/FAIL por item;
- [ ] não declarar concluído com FAIL aberto.
