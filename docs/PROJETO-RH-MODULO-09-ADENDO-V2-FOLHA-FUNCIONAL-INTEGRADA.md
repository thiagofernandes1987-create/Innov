# Projeto RH — Módulo 09 — Adendo V2 — Folha Funcional e Integrada

**Estado:** vinculante sobre o M09 0.1.0; implementação pendente  
**Data:** 7 de agosto de 2026

## 1. Motivo

A revisão funcional identificou que o M09 original possuía boa cobertura de requisitos e arquitetura de cálculo, mas não detalhava com uniformidade suficiente a operação completa de todos os itens obrigatórios da folha.

Este adendo corrige o nível de especificação. Em caso de diferença de profundidade ou interpretação, este adendo e seus anexos prevalecem sobre formulações mais genéricas do M09 original.

## 2. Documentos vinculantes

O Módulo 09 passa a ser composto obrigatoriamente por:

1. `PROJETO-RH-MODULO-09-FOLHA-RUBRICAS-CALCULO-E-FECHAMENTO.md` — base;
2. `PROJETO-RH-MODULO-09-ANEXO-A-CATALOGO-FUNCIONAL-DE-RUBRICAS.md` — rubricas e incidências parametrizadas;
3. `PROJETO-RH-MODULO-09-ANEXO-B-CICLOS-OPERACIONAIS-DA-FOLHA.md` — processamentos ponta a ponta;
4. `PROJETO-RH-MODULO-09-ANEXO-C-CADASTROS-MESTRES-DO-DP-E-FOLHA.md` — empresas, estabelecimentos, lotações, TSV, sindicatos e cadastros dependentes;
5. `PROJETO-RH-ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO.md` — integrações com os demais módulos;
6. anexos do M10 para o ciclo externo eSocial/DCTFWeb/FGTS Digital.

Nenhum item listado como obrigatório pelo usuário pode ser considerado coberto apenas porque aparece nominalmente no documento base; deve existir fluxo operacional no conjunto acima.

## 3. Escopo funcional obrigatório do M09

O módulo deve operar e integrar:

- empresas;
- estabelecimentos;
- lotações tributárias;
- empregados;
- trabalhadores sem vínculo;
- cargos;
- funções;
- sindicatos/instrumentos coletivos;
- jornadas;
- salários/histórico salarial;
- rubricas;
- eventos fixos;
- eventos variáveis;
- lançamentos;
- folha mensal;
- adiantamento;
- décimo terceiro;
- férias;
- rescisão;
- folha complementar;
- diferenças retroativas;
- afastamentos;
- pensão alimentícia;
- empréstimos;
- benefícios;
- descontos;
- encargos;
- provisões;
- contabilização;
- fechamento;
- reabertura;
- retificação;
- recibos;
- relatórios;
- arquivos e eventos digitais.

## 4. Contrato de completude de um processamento

Um processamento de folha só é funcionalmente completo quando documenta:

```text
origens canônicas
→ validações cadastrais
→ população
→ entradas fixas e variáveis
→ regra/rubrica/fórmula/versão
→ cálculo e memória
→ bases e encargos
→ críticas
→ aprovação
→ fechamento interno
→ demonstrativo/pagamento
→ contabilização/provisões
→ projeções externas
→ totalizadores
→ reconciliação
→ correção/reabertura/retificação
→ auditoria
```

## 5. Rubricas

Cada rubrica relevante deve possuir identidade e versão, e documentar:

- nome e descrição;
- natureza interna e natureza eSocial;
- fórmula;
- base;
- códigos oficiais de incidência previdenciária, IRRF e FGTS vigentes;
- comportamento em mensal, 13º, férias e rescisão;
- reflexos;
- uso;
- parametrização;
- contabilização;
- vigência;
- versão;
- fonte;
- responsável e aprovador.

Incidência não é constante de código nem booleano simplificado.

## 6. Regra tributária e contábil

A especificação não constitui consultoria contábil individualizada. As incidências e fórmulas do catálogo são perfis funcionais para construção do software.

Antes de uma versão virar `EFFECTIVE`, o sistema exigirá validação contra:
- legislação aplicável;
- leiaute e regras vigentes do eSocial;
- manuais oficiais;
- instrumento coletivo/decisão aplicável;
- situação concreta da empresa.

## 7. Integração externa

O M09 não transmite diretamente ao governo. Ele produz fatos e projeções aprovados para o M10.

```text
M09 cálculo canônico
→ M10 eSocial
→ totalizadores
→ DCTFWeb/FGTS Digital
→ M10 reconciliação
→ M09 recebe divergências sem ter o histórico sobrescrito
```

## 8. Definition of Done da especificação M09

A especificação da folha será considerada funcionalmente corrigida quando a auditoria do loop confirmar PASS para todos os 35 itens obrigatórios, para a estrutura de rubricas e para as integrações externas dependentes.

Isso não significa software implementado nem folha homologada.
