# Projeto RH — Módulo 09 — Anexo B — Ciclos Operacionais da Folha

**Versão:** 0.1.0  
**Estado:** especificação funcional detalhada; implementação pendente  
**Data:** 7 de agosto de 2026

## 1. Finalidade

Este anexo descreve a folha como operação de Departamento Pessoal, e não apenas como motor de cálculo.

Todo processamento segue, com variações próprias:

```text
cadastros válidos
→ fatos da competência
→ entradas da folha
→ pré-validação
→ cálculo
→ conferência
→ aprovação
→ fechamento interno
→ projeções digitais
→ pagamento/contabilização
→ totalizadores externos
→ reconciliação
→ encerramento operacional
```

## 2. Cadastros necessários antes de qualquer folha

### 2.1 Empresa empregadora

Entrada:
- organização;
- razão/nome empresarial;
- inscrição e classificação aplicável;
- vigência;
- parâmetros de folha;
- conta/estrutura contábil;
- responsáveis.

Saída:
- empregador habilitado para ciclos de folha e mapeamento externo.

Bloqueios:
- inscrição ausente/inválida;
- classificação sem vigência;
- ausência de configuração obrigatória.

### 2.2 Estabelecimento

Deve guardar estabelecimento do vínculo e inscrição aplicável por vigência. Não será confundido com obra, centro de custo ou lotação tributária.

### 2.3 Lotação tributária

Objeto próprio, versionado e relacionado ao estabelecimento/obra/contexto quando aplicável. Deve possuir mapeamento para o eSocial vigente, especialmente para eventos de tabela e remuneração.

### 2.4 Empregados e trabalhadores sem vínculo

A população da folha aceita:
- empregados com vínculo;
- trabalhadores sem vínculo quando a categoria e o fato exigirem processamento;
- admitidos/desligados no período;
- trabalhadores com retroatividade ou pagamento posterior.

A categoria do trabalhador deve ser snapshot do ciclo, porque interfere em validação de rubricas e eventos externos.

### 2.5 Cargos, funções e sindicatos

Cargo, função e enquadramento sindical/instrumento coletivo permanecem separados. Alterações possuem vigência.

O sindicato ou instrumento não determina automaticamente uma regra de folha; ele é fonte de parâmetros/versionamentos aprovados.

### 2.6 Jornada

A jornada contratual e as escalas vêm do M05. O motor de folha recebe somente fatos consolidados/aprovados: horas normais, extras, noturnas, faltas, atrasos, banco convertido, DSR e outros eventos previstos.

### 2.7 Salário

Salário é histórico de remuneração contratual, não campo mutável único. Cada ciclo congela a versão efetiva na competência.

## 3. Eventos fixos

Tela funcional:
`/app/departamento-pessoal/folha/eventos-fixos`

Operações:
- criar recorrência;
- alterar com nova vigência;
- suspender;
- encerrar;
- simular próximas competências;
- consultar histórico.

Exemplos:
- gratificação fixa;
- pensão em valor fixo/percentual;
- desconto de empréstimo;
- benefício/coparticipação recorrente;
- desconto autorizado.

Saída para a competência:
- `payroll_input` gerado com origem `FIXED_EVENT` e referência à versão da recorrência.

## 4. Eventos variáveis e lançamentos

Tela:
`/app/departamento-pessoal/folha/lancamentos`

Fontes:
- ponto;
- comissão/produção;
- benefícios;
- empréstimos;
- decisões judiciais;
- importação controlada;
- lançamento manual autorizado.

Cada lançamento precisa mostrar:
- trabalhador/vínculo;
- rubrica ou tipo de fato;
- competência de referência;
- quantidade/unidade;
- valor-base;
- origem;
- documento/evidência quando exigido;
- estado de validação.

## 5. Folha mensal

### Entrada

- população congelada;
- remuneração vigente;
- eventos fixos;
- eventos variáveis;
- ponto consolidado;
- férias/afastamentos que afetem a competência;
- benefícios/descontos;
- parâmetros legais e convencionais vigentes;
- acumulados necessários.

### Processo

1. validar população;
2. validar vínculos/categorias/lotação;
3. importar fatos dos módulos;
4. gerar eventos fixos;
5. congelar entradas;
6. calcular rubricas primárias;
7. calcular médias/reflexos previstos;
8. formar bases;
9. calcular descontos e encargos;
10. calcular líquido;
11. gerar provisões/rateios;
12. executar crítica automática;
13. recalcular após correções controladas;
14. aprovar execução;
15. fechar internamente;
16. liberar projeções S-1200 e, depois, S-1210 conforme pagamento;
17. reconciliar totalizadores.

### Saídas

- memória por trabalhador;
- demonstrativo;
- bases CP/IRRF/FGTS;
- encargos;
- rateios;
- provisões;
- ordens de pagamento;
- lote contábil;
- eventos digitais;
- relatório de fechamento.

## 6. Adiantamento salarial

Objeto separado da mensal.

Fluxo:
```text
regra/solicitação
→ população elegível
→ calcular adiantamento
→ aprovar
→ pagar
→ gerar entrada de compensação para folha mensal
→ conciliar adiantado × descontado
```

O desconto posterior não apaga o pagamento antecipado.

## 7. Décimo terceiro

### 7.1 Adiantamento

- ciclo próprio;
- população e avos na data de corte;
- rubricas específicas;
- adiantamento rastreável;
- compensação na quitação.

### 7.2 Quitação

Processo:
- recalcular avos anuais;
- incorporar médias conforme regras versionadas;
- descontar adiantamento;
- formar bases próprias de 13º;
- calcular descontos/encargos aplicáveis;
- gerar demonstrativo próprio;
- projetar eventos periódicos com apuração própria.

### 7.3 Complementar

Diferença posterior não reabre silenciosamente o 13º original. Cria processamento complementar vinculado.

## 8. Férias

Origem: concessão aprovada no M06.

Fluxo:
```text
concessão
→ validar período/dias/remuneração
→ calcular remuneração de férias
→ calcular 1/3 e demais componentes
→ aplicar abono pecuniário quando existente
→ aplicar descontos autorizados
→ aprovar
→ gerar recibo/pagamento
→ gerar fatos para competência mensal
→ reconciliar com gozo/cancelamento
```

O sistema distingue:
- direito;
- programação;
- concessão;
- cálculo;
- pagamento;
- gozo;
- reflexo na folha mensal.

## 9. Rescisão

Origem: caso de desligamento aprovado no M11.

Entradas mínimas:
- motivo e datas;
- aviso prévio;
- salário/remuneração;
- saldo de ponto/banco;
- férias vencidas/proporcionais;
- 13º proporcional;
- benefícios/descontos pendentes;
- pensões;
- empréstimos;
- adiantamentos;
- valores já pagos;
- histórico/base necessária de FGTS.

Processo:
1. validar motivo e datas;
2. calcular saldo de salários;
3. calcular verbas de aviso quando aplicáveis;
4. calcular 13º rescisório;
5. calcular férias rescisórias;
6. consumir ajustes/pendências;
7. calcular descontos/encargos parametrizados;
8. produzir bases FGTS rescisórias;
9. conferir limites e líquido;
10. aprovar;
11. fechar cálculo rescisório;
12. projetar S-2299/S-2399 e eventos remuneratórios relacionados conforme categoria e leiaute vigente;
13. reconciliar bases no FGTS Digital;
14. acompanhar guia/indenização compensatória quando aplicável;
15. gerar pagamento e contabilização;
16. finalizar offboarding somente depois dos gates próprios.

## 10. Folha complementar

Usada quando existe fato novo ou diferença depois do processamento originário sem apagar o fechamento anterior.

Campos obrigatórios:
- ciclo originário;
- competência de referência;
- motivo;
- fatos novos/corrigidos;
- pessoas afetadas;
- diferença por rubrica/base;
- impacto em pagamento;
- impacto contábil;
- impacto eSocial/DCTFWeb/FGTS.

Resultado = diferença calculada, não cópia integral do ciclo original.

## 11. Diferenças retroativas

Fluxo:
```text
mudança retroativa aprovada
→ identificar competências afetadas
→ reconstruir snapshots históricos com regra correta
→ comparar devido histórico × devido recalculado
→ gerar diferenças por competência/rubrica
→ aprovação
→ folha complementar/retroativa
→ eventos externos corretivos aplicáveis
→ reconciliação
```

Nunca substituir o resultado histórico sem trilha.

## 12. Afastamentos

O M06 fornece ocorrência/afastamento e suas datas. A folha decide efeitos remuneratórios apenas por regra versionada.

Casos funcionais:
- dias remunerados pela empresa;
- suspensão de rubricas;
- manutenção de benefício;
- bases informativas específicas;
- retorno no meio da competência;
- afastamento retroativo;
- conversão de natureza do afastamento.

Alteração do afastamento depois do fechamento gera caso de impacto e eventual retroatividade.

## 13. Pensão alimentícia

Objeto de obrigação próprio com:
- beneficiário;
- processo/documento;
- vigência;
- tipo de base;
- percentual/valor;
- teto/piso quando determinado;
- incidência sobre mensal/13º/férias/PLR conforme ordem;
- prioridade em relação a outros descontos;
- conta de destino;
- evidência e auditoria.

A fórmula da pensão não será inferida de texto livre. Deve ser configurada e aprovada.

## 14. Empréstimos

Separar:
- Crédito do Trabalhador/eConsignado quando aplicável;
- outros consignados;
- empréstimo interno quando permitido pela política.

Cada contrato terá:
- origem/provedor;
- identificador;
- parcela;
- competência;
- margem/regras de desconto aplicáveis;
- saldo;
- prioridade;
- retorno/repasse;
- natureza eSocial versionada.

Parcela recebida duplicada não gera dois descontos.

## 15. Benefícios

Integração M07 → folha:

```text
adesão/cobertura vigente
→ preço/subsídio/coparticipação
→ movimento da competência
→ entrada da folha
→ desconto/informativa
→ demonstrativo
→ repasse ao fornecedor
→ reconciliação fornecedor × folha
```

Cancelar benefício futuro não apaga desconto já fechado.

## 16. Descontos

Todo desconto precisa ter uma fonte autorizadora:
- lei/regra parametrizada;
- ordem judicial;
- contrato;
- adesão a benefício;
- adiantamento;
- empréstimo;
- autorização documentada;
- ajuste aprovado.

Desconto manual sem origem é impeditivo para fechamento oficial.

## 17. Encargos

Encargos patronais são linhas separadas do líquido do empregado.

Devem registrar:
- base;
- parâmetro/alíquota versionada;
- empresa/estabelecimento/lotação;
- trabalhador/categoria quando necessário;
- valor;
- memória;
- destino contábil;
- totalizador externo usado na reconciliação.

## 18. Provisões

Provisão não é pagamento nem dívida externa já constituída.

Provisões iniciais:
- férias;
- adicional de férias;
- 13º;
- encargos associados configurados.

O sistema deve permitir:
- saldo inicial;
- apropriação mensal;
- consumo;
- reversão/ajuste;
- rateio por centro de custo/obra;
- conciliação com contabilização.

## 19. Contabilização

Fluxo:
```text
folha fechada
→ mapear rubrica/base/encargo para regra contábil vigente
→ aplicar rateio
→ gerar lote contábil balanceado
→ validar débitos = créditos
→ aprovar/exportar/postar
→ receber referência do lançamento externo
→ conciliar
```

Reabertura gera lote de estorno/ajuste, não edição do lote antigo.

## 20. Fechamento

Fechamento interno exige:
- população validada;
- todos os trabalhadores em estado válido;
- parâmetros/rubricas vigentes;
- conferências obrigatórias;
- diferenças justificadas;
- aprovação;
- rateios quando obrigatórios;
- execução com hash fixado.

Fechamento interno não significa S-1299 aceito.

## 21. Reabertura

Fluxo:
```text
solicitação
→ motivo/impacto
→ verificar pagamentos/eventos/contabilidade já produzidos
→ aprovar
→ reabrir internamente
→ corrigir/recacular
→ novo fechamento interno
→ executar retificações/reabertura externa necessárias
→ reconciliar tudo novamente
```

## 22. Retificação

Retificação é um **caso** que conecta:
- fato corrigido;
- competência;
- folha afetada;
- evento externo original;
- evento retificador/exclusor;
- DCTFWeb/FGTS afetados;
- pagamento/contabilidade afetados;
- resultado final conciliado.

## 23. Recibos

### Recibo de pagamento ao trabalhador

Versão do demonstrativo + data/meio + valor + hash.

### Recibo eSocial

Fica no M10 e referencia a projeção da folha. Não será confundido com recibo salarial.

### Comprovante financeiro

Evidência de pagamento; não altera o cálculo.

## 24. Relatórios obrigatórios da folha

- folha analítica por trabalhador;
- folha sintética por empresa/estabelecimento;
- resumo por rubrica;
- bases CP/IRRF/FGTS;
- encargos patronais;
- descontos e consignações;
- benefícios;
- férias;
- 13º;
- rescisões;
- complementares/retroativos;
- provisões;
- rateio por centro de custo/obra;
- líquido e arquivo de pagamento;
- contabilização;
- divergências de totalizadores;
- eventos eSocial originados;
- reconciliação DCTFWeb;
- reconciliação FGTS Digital.

## 25. Arquivos e eventos digitais

O módulo de folha **gera projeções canônicas**, mas a transmissão pertence ao M10.

Saídas para M10:
- rubricas/versionamento → S-1010 quando aplicável;
- remuneração → S-1200 e eventos equivalentes conforme categoria;
- pagamentos → S-1210;
- abertura/reabertura/fechamento → sinais para S-1298/S-1299;
- rescisão → fatos para eventos do M11/M10;
- bases e memória para reconciliação com totalizadores.

## 26. Matriz de integrações de entrada e saída

| Origem/destino | Entrada na folha | Saída da folha |
|---|---|---|
| M01 Pessoas | identidade/trabalhador | status de participação no ciclo |
| M02 Organização | empresa, estabelecimento, posição, lotação, centro de custo | custos/rateios |
| M03 Admissão | vínculo ativado | primeira competência/remuneração |
| M04 Contratos | salário, jornada contratual, alterações | impacto retroativo quando detectado |
| M05 Ponto | horas/faltas/adicionais/banco | inconsistências e consumo de fatos |
| M06 Férias/Afastamentos | concessões e afastamentos | cálculo/pagamento/reflexos |
| M07 Benefícios | adesões/movimentos | descontos/repasse/reconciliação |
| M08 SST | fatos remuneratórios autorizados | custos/alertas sem diagnóstico |
| M11 Desligamento | caso, datas e verbas de origem | cálculo rescisório/bases |
| Financeiro | retornos bancários | ordens de pagamento |
| Contabilidade | contas/regras | lote contábil |
| M10 Obrigações | totalizadores/retornos | projeções e bases |

## 27. Critério de completude funcional

Um processamento não poderá ser considerado funcionalmente especificado se faltar qualquer um destes itens:

- origem dos dados;
- tela/ação operacional;
- cálculo;
- estado;
- aprovação;
- saída financeira/contábil quando aplicável;
- evento digital quando aplicável;
- reconciliação;
- correção/reabertura;
- auditoria.
