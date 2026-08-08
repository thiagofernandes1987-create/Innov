# Projeto RH — Módulo 07: Benefícios, Dependentes, Pensão Alimentícia e Descontos Recorrentes

**Versão:** 0.1.0  
**Estado:** especificação funcional inicial concluída; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Objetivo

Especificar o domínio responsável por:

- catálogo e políticas de benefícios;
- planos e fornecedores;
- elegibilidade e adesões;
- titulares e pessoas cobertas;
- relações familiares e papéis por finalidade;
- dependentes tributários e para benefícios;
- beneficiários de seguros e auxílios;
- pensão alimentícia e outras retenções judiciais;
- autorizações de descontos recorrentes;
- contribuições, coparticipações, reembolsos e estornos;
- integração com folha, eSocial, financeiro e centros de custo;
- conciliação entre cadastro, fornecedor, folha e pagamento.

O módulo deverá preservar a origem, a vigência, a fórmula, a autorização, a pessoa destinatária e o resultado financeiro de cada benefício ou desconto.

---

## 2. Escopo

### 2.1 Incluído

- catálogo de benefícios;
- políticas versionadas por empresa, categoria, estabelecimento e vigência;
- planos e tabelas de preço;
- adesão individual e em lote;
- inclusão e exclusão de pessoas cobertas;
- relações familiares e jurídicas;
- papéis de dependência por finalidade;
- beneficiários e percentuais;
- vale-transporte;
- alimentação e refeição;
- assistência médica e odontológica;
- seguro de vida;
- previdência complementar;
- auxílio-creche e benefícios configuráveis;
- empréstimos, consignações e descontos autorizados;
- pensão alimentícia;
- retenções judiciais;
- eventos financeiros por competência;
- integração com rubricas e folha;
- arquivos de fornecedores;
- conciliação e divergências;
- relatórios, auditoria e portal do trabalhador.

### 2.2 Fora do escopo imediato

- cálculo completo da folha;
- contas a pagar completas;
- negociação ou contratação comercial com fornecedores;
- processamento bancário de repasses;
- gestão clínica de saúde;
- indenização securitária;
- decisão jurídica sobre validade de ordem;
- transmissão governamental efetiva;
- automação de regras sem revisão jurídica e trabalhista.

---

## 3. Princípios obrigatórios

1. Benefício não será representado somente por rubrica.
2. Dependente não será um campo simples no empregado.
3. Relação familiar e papel por finalidade serão separados.
4. Alimentando não será sinônimo de dependente.
5. Pessoa coberta não será automaticamente dependente tributário.
6. Beneficiário de seguro não será automaticamente pessoa coberta.
7. Adesão não será inferida pela existência de desconto.
8. Cobrança do fornecedor não criará adesão.
9. Todo desconto terá origem identificada.
10. Alterações serão versionadas por vigência.
11. Eventos financeiros serão imutáveis e reversíveis por novos movimentos.
12. Folha, fornecedor e financeiro serão conciliados, não confundidos.
13. Dados familiares e judiciais terão acesso segregado.
14. Valores legais e tributários serão parametrizados por vigência.
15. Integrações serão idempotentes.

---

## 4. Usuários e responsabilidades

### 4.1 RH

- configurar políticas;
- analisar elegibilidade;
- administrar adesões;
- conferir dependentes e documentos;
- tratar inclusões, exclusões e divergências.

### 4.2 Departamento Pessoal

- validar efeitos em folha;
- administrar descontos recorrentes;
- conferir pensão e retenções;
- acompanhar competências e retroatividades.

### 4.3 Jurídico

- cadastrar e validar ordens judiciais;
- interpretar prioridade, fórmula e vigência;
- controlar documentos e alterações.

### 4.4 Financeiro

- receber cobranças de fornecedores;
- conciliar valores;
- acompanhar repasses e pagamentos;
- distribuir custos por centro de custo.

### 4.5 Gestor

- consultar somente elegibilidade ou disponibilidade operacional autorizada;
- aprovar benefícios quando previsto;
- não acessar composição familiar, ordem judicial ou valores sensíveis.

### 4.6 Trabalhador

- consultar benefícios disponíveis e ativos;
- solicitar adesão ou cancelamento;
- informar pessoas relacionadas;
- anexar documentos;
- consultar descontos e histórico;
- contestar divergências.

### 4.7 Auditor

- consultar versões, documentos, aprovações, arquivos, cálculos, acessos e resultados.

---

## 5. Navegação prevista

```text
/app/departamento-pessoal/beneficios
/app/departamento-pessoal/beneficios/catalogo
/app/departamento-pessoal/beneficios/politicas
/app/departamento-pessoal/beneficios/planos
/app/departamento-pessoal/beneficios/adesoes
/app/departamento-pessoal/beneficios/coberturas
/app/departamento-pessoal/dependentes
/app/departamento-pessoal/beneficiarios
/app/departamento-pessoal/pensoes
/app/departamento-pessoal/descontos-recorrentes
/app/departamento-pessoal/conciliacoes
/app/departamento-pessoal/fornecedores
/app/departamento-pessoal/relatorios/beneficios
/app/portal/beneficios
/app/portal/dependentes
/app/portal/descontos
```

---

## 6. Modelo funcional

### 6.1 Catálogo de benefício

Campos mínimos:

- identificador;
- organização;
- código interno;
- nome;
- categoria;
- descrição;
- obrigatório ou opcional;
- permite dependentes;
- produz custo da empresa;
- produz contribuição do trabalhador;
- produz coparticipação;
- integra com folha;
- integra com fornecedor;
- situação;
- vigência;
- classificação e mapeamentos externos.

### 6.2 Política de benefício

Campos mínimos:

- benefício;
- empresa e estabelecimentos aplicáveis;
- categorias e vínculos elegíveis;
- unidades, cargos ou faixas aplicáveis;
- data inicial e final;
- critérios de carência;
- critérios de jornada ou remuneração;
- manutenção durante afastamentos;
- suspensão;
- regras de desligamento;
- titulares e dependentes permitidos;
- documentos obrigatórios;
- subsídio;
- participação do trabalhador;
- limites;
- aprovação;
- origem normativa;
- versão e situação.

### 6.3 Plano

Campos mínimos:

- benefício;
- fornecedor ou operadora;
- código do produto;
- nome comercial;
- abrangência;
- acomodação ou modalidade;
- público elegível;
- datas de comercialização;
- vigência contratual;
- identificadores de integração;
- tabela de preços atual;
- regras de faturamento;
- situação.

### 6.4 Tabela de preços

Cada versão conterá:

- plano;
- vigência;
- critério de faixa;
- faixa etária, salarial ou categoria, quando aplicável;
- preço do titular;
- preço por dependente;
- subsídio;
- contribuição;
- coparticipação;
- taxas;
- origem e documento;
- moeda e arredondamento.

### 6.5 Adesão

Campos mínimos:

- vínculo;
- benefício;
- política aplicada;
- plano;
- data de solicitação;
- vigência pretendida;
- vigência confirmada;
- situação;
- responsável;
- motivo;
- origem;
- autorização ou ciência;
- documentos;
- retorno do fornecedor;
- datas de suspensão e encerramento.

### 6.6 Cobertura

Campos mínimos:

- adesão;
- pessoa coberta;
- papel de titular ou dependente;
- tipo de dependência para o plano;
- início e fim;
- número externo;
- situação;
- carência;
- documentos;
- preço aplicado;
- motivo de inclusão ou exclusão.

### 6.7 Relação entre pessoas

Campos mínimos:

- pessoa principal;
- pessoa relacionada;
- tipo de relação;
- início e fim;
- guarda, tutela ou representação, quando aplicável;
- documentos;
- situação de conferência;
- observações protegidas.

### 6.8 Papel por finalidade

Cada papel conterá:

- relação;
- finalidade;
- data inicial e final;
- situação;
- critérios e documentos;
- origem;
- aprovação;
- mapeamento externo.

Finalidades mínimas:

- dependente para IRRF;
- dependente para salário-família;
- pessoa coberta em benefício;
- beneficiário de seguro;
- beneficiário de auxílio;
- contato de emergência;
- alimentando;
- responsável legal.

### 6.9 Ordem de pensão ou retenção

Campos mínimos:

- vínculo devedor;
- tipo de obrigação;
- processo ou referência;
- órgão ou autoridade;
- data da decisão;
- vigência inicial e final;
- situação;
- prioridade;
- beneficiários;
- fórmula atual;
- bases abrangidas;
- limites;
- dados de repasse;
- documentos;
- observações jurídicas;
- responsável e aprovações.

### 6.10 Fórmula de desconto

Deverá representar:

- tipo fixo, percentual, faixa ou composição;
- base bruta, líquida ou rubricas selecionadas;
- incidência em férias;
- incidência em décimo terceiro;
- incidência em participação;
- incidência em rescisão;
- deduções prévias;
- valor mínimo e máximo;
- arredondamento;
- rateio por beneficiário;
- prioridade;
- vigência;
- texto interpretativo e evidência.

### 6.11 Autorização de desconto recorrente

Campos mínimos:

- vínculo;
- tipo de desconto;
- benefício, contrato ou obrigação de origem;
- forma de autorização;
- data e canal;
- documento ou evidência;
- vigência;
- regra de revogação;
- valor ou fórmula;
- limite total;
- parcelas previstas;
- situação.

### 6.12 Movimento financeiro

Tipos mínimos:

- concessão;
- custo patronal;
- contribuição do trabalhador;
- coparticipação;
- desconto;
- crédito;
- reembolso;
- ajuste;
- diferença retroativa;
- estorno;
- repasse;
- baixa;
- cancelamento compensatório.

Cada movimento conterá competência, pessoa, vínculo, cobertura, plano, fonte, valor, centro de custo, versão de cálculo e referências externas.

---

## 7. Fluxos principais

### 7.1 Configurar benefício

```text
Criar catálogo
  → definir política
  → vincular empresa e população
  → cadastrar plano e fornecedor
  → cadastrar tabela de preços
  → mapear rubricas
  → validar
  → publicar versão
```

### 7.2 Adesão individual

```text
Trabalhador ou RH solicita
  → política é congelada no caso
  → elegibilidade é calculada
  → documentos são coletados
  → pessoas cobertas são conferidas
  → aprovação
  → envio ao fornecedor
  → confirmação
  → ativação
  → geração de movimentos futuros
```

### 7.3 Inclusão de dependente

```text
Selecionar ou cadastrar pessoa relacionada
  → informar relação
  → atribuir papel para o benefício
  → anexar documentos
  → validar regra do plano
  → aprovar
  → enviar ao fornecedor
  → confirmar cobertura
```

A atribuição de papel para o benefício não ativará automaticamente dependência tributária.

### 7.4 Exclusão de cobertura

```text
Solicitação
  → definir data efetiva
  → validar carências e regras
  → aprovar
  → comunicar fornecedor
  → encerrar cobertura
  → cessar movimentos futuros
  → conciliar cobranças posteriores
```

### 7.5 Vale-transporte

```text
Declaração de necessidade e trajeto
  → validação de elegibilidade
  → cálculo de quantidade e custo
  → aprovação
  → concessão por competência
  → contribuição do trabalhador
  → conciliação com faltas, férias e afastamentos conforme política
```

O parâmetro legal aplicável será versionado e não codificado como constante.

### 7.6 Alimentação e refeição

```text
Política e modalidade
  → elegibilidade
  → quantidade ou valor por competência
  → redução por eventos configurados
  → carga ou concessão
  → contribuição do trabalhador
  → conciliação com fornecedor e folha
```

### 7.7 Plano de saúde ou odontológico

```text
Adesão
  → titular e coberturas
  → tabela de preço vigente
  → mensalidade
  → coparticipações recebidas
  → rateio empresa/trabalhador
  → instrução à folha
  → conciliação da fatura
  → divergências e ajustes
```

### 7.8 Seguro e beneficiários

```text
Cobertura do trabalhador
  → cadastro de beneficiários
  → percentuais e vigência
  → validação do total
  → ciência
  → histórico de alterações
```

### 7.9 Pensão alimentícia

```text
Receber ordem ou acordo
  → conferir autenticidade e vigência
  → cadastrar beneficiários
  → traduzir fórmula
  → revisão jurídica
  → homologação operacional
  → gerar instruções por competência
  → folha calcula
  → conferir valor
  → gerar obrigação de repasse
  → conciliar pagamento
```

### 7.10 Desconto recorrente autorizado

```text
Origem contratual ou adesão
  → autorização
  → fórmula ou parcelas
  → validação de limite
  → instruções por competência
  → processamento
  → saldo e parcelas
  → encerramento ou revogação
```

### 7.11 Conciliação de fornecedor

```text
Importar arquivo ou fatura
  → validar estrutura e hash
  → identificar fornecedor e competência
  → casar titular, cobertura e plano
  → comparar preços e vigências
  → comparar folha
  → classificar divergências
  → corrigir cadastro ou gerar ajuste
  → aprovar conciliação
```

---

## 8. Estados

### 8.1 Política

- RASCUNHO;
- EM_VALIDACAO;
- PUBLICADA;
- SUSPENSA;
- ENCERRADA;
- SUBSTITUIDA.

### 8.2 Adesão

- RASCUNHO;
- PENDENTE_DOCUMENTOS;
- PENDENTE_APROVACAO;
- AGUARDANDO_FORNECEDOR;
- ATIVA;
- SUSPENSA;
- EM_DIVERGENCIA;
- REJEITADA;
- CANCELADA;
- ENCERRADA.

### 8.3 Cobertura

- PROPOSTA;
- EM_ANALISE;
- ENVIADA;
- CONFIRMADA;
- ATIVA;
- SUSPENSA;
- EXCLUSAO_PENDENTE;
- ENCERRADA;
- REJEITADA.

### 8.4 Ordem ou desconto

- RASCUNHO;
- EM_REVISAO;
- VIGENTE;
- SUSPENSO;
- ENCERRADO;
- SUBSTITUIDO;
- EM_DIVERGENCIA;
- CANCELADO_COM_HISTORICO.

### 8.5 Conciliação

- RECEBIDA;
- VALIDADA;
- EM_CONCILIACAO;
- COM_DIVERGENCIAS;
- APROVADA;
- REJEITADA;
- REABERTA;
- SUBSTITUIDA.

---

## 9. Requisitos funcionais

### Catálogo e políticas

- **RH-M07-FR-001:** permitir cadastrar catálogo de benefícios por organização.
- **RH-M07-FR-002:** permitir classificar natureza, obrigatoriedade e integrações do benefício.
- **RH-M07-FR-003:** permitir criar políticas por empresa, estabelecimento, categoria, cargo, unidade e vigência.
- **RH-M07-FR-004:** versionar políticas sem alterar adesões históricas.
- **RH-M07-FR-005:** simular elegibilidade em uma data informada.
- **RH-M07-FR-006:** registrar origem legal, coletiva, contratual ou interna da política.
- **RH-M07-FR-007:** publicar política somente após validações e permissões.
- **RH-M07-FR-008:** impedir sobreposição incompatível de políticas para a mesma população.

### Planos e fornecedores

- **RH-M07-FR-009:** cadastrar planos e identificadores do fornecedor.
- **RH-M07-FR-010:** cadastrar tabelas de preço versionadas.
- **RH-M07-FR-011:** suportar preços por titular, dependente, faixa e categoria.
- **RH-M07-FR-012:** suportar subsídio, contribuição, coparticipação e taxas separadas.
- **RH-M07-FR-013:** manter histórico de reajustes.
- **RH-M07-FR-014:** associar documentos e contratos do plano.

### Adesões e coberturas

- **RH-M07-FR-015:** criar adesão individual pelo RH ou portal.
- **RH-M07-FR-016:** criar adesões em lote com relatório de rejeições.
- **RH-M07-FR-017:** congelar a versão da política aplicada ao caso.
- **RH-M07-FR-018:** validar elegibilidade na solicitação e na ativação.
- **RH-M07-FR-019:** coletar ciência, autorização e documentos.
- **RH-M07-FR-020:** controlar confirmação do fornecedor.
- **RH-M07-FR-021:** incluir titular e pessoas cobertas com vigência própria.
- **RH-M07-FR-022:** suspender e reativar adesão sem apagar histórico.
- **RH-M07-FR-023:** encerrar cobertura individual sem encerrar a adesão inteira.
- **RH-M07-FR-024:** detectar cobertura duplicada no mesmo plano e período.

### Pessoas relacionadas

- **RH-M07-FR-025:** cadastrar relação entre pessoas sem duplicar o cadastro mestre.
- **RH-M07-FR-026:** atribuir múltiplos papéis por finalidade e vigência.
- **RH-M07-FR-027:** exigir documentos conforme finalidade.
- **RH-M07-FR-028:** controlar conferência e validade documental.
- **RH-M07-FR-029:** suportar dependência para IRRF separada da cobertura de benefício.
- **RH-M07-FR-030:** suportar dependência para salário-família separada das demais.
- **RH-M07-FR-031:** suportar beneficiários com percentuais por vigência.
- **RH-M07-FR-032:** impedir percentuais incompatíveis com a regra da finalidade.

### Benefícios operacionais

- **RH-M07-FR-033:** administrar declaração, trajeto e concessão de vale-transporte.
- **RH-M07-FR-034:** recalcular concessão por competência conforme eventos configurados.
- **RH-M07-FR-035:** administrar alimentação e refeição por valor, quantidade ou calendário.
- **RH-M07-FR-036:** administrar mensalidades e coparticipações de saúde e odontologia.
- **RH-M07-FR-037:** administrar previdência complementar e contribuições.
- **RH-M07-FR-038:** permitir benefícios configuráveis sem código específico no núcleo.

### Pensão e retenções

- **RH-M07-FR-039:** cadastrar ordem judicial ou acordo homologado com documentos.
- **RH-M07-FR-040:** cadastrar um ou mais alimentandos por obrigação.
- **RH-M07-FR-041:** versionar fórmulas, bases, prioridades, limites e vigências.
- **RH-M07-FR-042:** submeter fórmula a revisão jurídica e operacional.
- **RH-M07-FR-043:** simular cálculo por competência antes da ativação.
- **RH-M07-FR-044:** gerar instruções para salário, férias, décimo terceiro, participação e rescisão conforme regra.
- **RH-M07-FR-045:** registrar valor calculado, descontado, não descontado e repassado.
- **RH-M07-FR-046:** controlar divergência de insuficiência, limite ou ausência de base.
- **RH-M07-FR-047:** suportar alteração retroativa com diferenças explícitas.
- **RH-M07-FR-048:** impedir exclusão física de obrigação utilizada em folha.

### Descontos recorrentes

- **RH-M07-FR-049:** cadastrar autorização e sua evidência.
- **RH-M07-FR-050:** suportar valor fixo, percentual, parcelas e limite total.
- **RH-M07-FR-051:** controlar revogação, suspensão e encerramento.
- **RH-M07-FR-052:** controlar parcelas previstas, processadas, estornadas e pendentes.
- **RH-M07-FR-053:** aplicar prioridade e margem conforme política vigente.
- **RH-M07-FR-054:** não considerar quitado valor que não foi efetivamente descontado.

### Integrações e conciliação

- **RH-M07-FR-055:** gerar eventos versionados para a folha.
- **RH-M07-FR-056:** relacionar resultado da folha à instrução de origem.
- **RH-M07-FR-057:** importar arquivos de fornecedor com idempotência e hash.
- **RH-M07-FR-058:** conciliar cobrança, adesão, cobertura, tabela de preço e folha.
- **RH-M07-FR-059:** classificar divergências e atribuir responsáveis.
- **RH-M07-FR-060:** gerar ajustes compensatórios sem editar movimentos anteriores.
- **RH-M07-FR-061:** gerar obrigação de pagamento ou repasse para o financeiro.
- **RH-M07-FR-062:** associar custos ao catálogo canônico de centros de custo.
- **RH-M07-FR-063:** mapear dependentes, planos, pensões e rubricas para estruturas externas por vigência.
- **RH-M07-FR-064:** preservar payload, recibo, protocolo e retorno de integrações.

### Portal, relatórios e auditoria

- **RH-M07-FR-065:** permitir ao trabalhador consultar benefícios ativos e disponíveis.
- **RH-M07-FR-066:** permitir solicitação de adesão, alteração e cancelamento.
- **RH-M07-FR-067:** permitir consultar pessoas relacionadas e papéis autorizados.
- **RH-M07-FR-068:** exibir descontos por competência com origem e memória resumida.
- **RH-M07-FR-069:** permitir contestação com anexos e acompanhamento.
- **RH-M07-FR-070:** fornecer relatórios de custo, adesão, cobertura, desconto e divergência.
- **RH-M07-FR-071:** auditar criação, alteração, aprovação, consulta e exportação.
- **RH-M07-FR-072:** mascarar dados sensíveis conforme perfil.

---

## 10. Regras de negócio

- **RH-M07-BR-001:** uma política publicada será imutável; correções criarão nova versão.
- **RH-M07-BR-002:** adesão ativa exigirá política e plano vigentes na data efetiva.
- **RH-M07-BR-003:** elegibilidade será verificada novamente na ativação.
- **RH-M07-BR-004:** cobertura não poderá iniciar antes da adesão, salvo exceção auditada suportada pelo plano.
- **RH-M07-BR-005:** pessoa coberta deverá existir no cadastro mestre.
- **RH-M07-BR-006:** relação familiar não implicará finalidade automática.
- **RH-M07-BR-007:** dependência tributária exigirá papel específico e vigência.
- **RH-M07-BR-008:** alimentando não será criado como dependente automaticamente.
- **RH-M07-BR-009:** beneficiários de seguro serão independentes de dependentes de saúde.
- **RH-M07-BR-010:** exclusão de cobertura não apagará cobranças anteriores.
- **RH-M07-BR-011:** reajuste futuro não alterará competências fechadas.
- **RH-M07-BR-012:** tabela de preço aplicada será registrada no movimento.
- **RH-M07-BR-013:** cobrança sem cobertura correspondente gerará divergência.
- **RH-M07-BR-014:** cobertura sem cobrança esperada gerará alerta configurável.
- **RH-M07-BR-015:** contribuição patronal e do trabalhador serão valores separados.
- **RH-M07-BR-016:** coparticipação não será somada silenciosamente à mensalidade.
- **RH-M07-BR-017:** desconto exigirá origem e vigência válidas.
- **RH-M07-BR-018:** revogação produzirá encerramento, não remoção da autorização.
- **RH-M07-BR-019:** ordem judicial prevalecerá conforme prioridade configurada e revisão competente.
- **RH-M07-BR-020:** fórmula de pensão será imutável após utilização.
- **RH-M07-BR-021:** alteração de fórmula criará nova versão.
- **RH-M07-BR-022:** bases de cálculo serão resolvidas por rubricas e incidências versionadas.
- **RH-M07-BR-023:** cálculo retroativo não reescreverá folha histórica.
- **RH-M07-BR-024:** diferença retroativa produzirá evento em competência de ajuste conforme processo aprovado.
- **RH-M07-BR-025:** valor não descontado manterá situação pendente ou não atendida.
- **RH-M07-BR-026:** saldo de parcelas será derivado de movimentos.
- **RH-M07-BR-027:** estorno referenciará o movimento original.
- **RH-M07-BR-028:** desconto duplicado na mesma competência e chave será bloqueado.
- **RH-M07-BR-029:** importação repetida do mesmo arquivo não duplicará itens.
- **RH-M07-BR-030:** arquivo substituto preservará o arquivo anterior.
- **RH-M07-BR-031:** conciliação aprovada será versionada.
- **RH-M07-BR-032:** reabertura exigirá justificativa e permissão.
- **RH-M07-BR-033:** centro de custo será referenciado, não copiado.
- **RH-M07-BR-034:** alteração de lotação futura poderá mudar rateio somente na vigência correspondente.
- **RH-M07-BR-035:** gestor não visualizará composição familiar ou valor de pensão.
- **RH-M07-BR-036:** documentos judiciais terão acesso jurídico e de folha segregado.
- **RH-M07-BR-037:** dados bancários de beneficiário serão mascarados.
- **RH-M07-BR-038:** logs não conterão documentos, diagnósticos ou dados bancários completos.
- **RH-M07-BR-039:** exportação de dados sensíveis exigirá permissão e auditoria.
- **RH-M07-BR-040:** parâmetros legais terão data de início e fim.
- **RH-M07-BR-041:** mapeamento externo não substituirá classificação interna.
- **RH-M07-BR-042:** falha de integração não alterará o estado canônico sem registro de pendência.
- **RH-M07-BR-043:** eventos enviados serão correlacionados por identificador estável.
- **RH-M07-BR-044:** exclusão de trabalhador não removerá histórico de benefícios.
- **RH-M07-BR-045:** desligamento acionará política explícita de encerramento ou manutenção.
- **RH-M07-BR-046:** afastamento acionará regra configurada de manutenção, suspensão ou recálculo.
- **RH-M07-BR-047:** férias poderão afetar concessões por competência conforme política versionada.
- **RH-M07-BR-048:** ausência no ponto não cancelará benefício sem regra aprovada.
- **RH-M07-BR-049:** alteração contratual não modificará adesão histórica.
- **RH-M07-BR-050:** qualquer decisão excepcional exigirá motivo, responsável e evidência.

---

## 11. Cenários de exceção

### 11.1 Dependente duplicado

Bloquear inclusão pela combinação de pessoa, plano e período. Exibir cobertura existente e permitir análise de migração.

### 11.2 Fatura após exclusão

Manter a cobrança, abrir divergência e não reativar a cobertura automaticamente.

### 11.3 Cobertura ativa sem retorno do fornecedor

Manter estado `AGUARDANDO_FORNECEDOR` ou `EM_DIVERGENCIA`; não afirmar cobertura confirmada.

### 11.4 Ordem judicial incompleta

Bloquear ativação e encaminhar ao Jurídico. Não interpretar fórmula por suposição.

### 11.5 Duas ordens conflitantes

Criar bloqueio de prioridade e decisão auditável. Não escolher pela data de cadastro.

### 11.6 Margem insuficiente

Registrar valor calculado, valor atendido e diferença. Não marcar a obrigação como quitada.

### 11.7 Folha reaberta

Gerar nova versão das instruções e relacionar diferenças. Não alterar lote anterior.

### 11.8 Reajuste retroativo do fornecedor

Importar como diferença, validar vigência e produzir ajuste; não reescrever movimentos já conciliados.

### 11.9 Cancelamento após carga do benefício

Criar movimento de ajuste conforme política e capacidade operacional. Preservar concessão original.

### 11.10 Relação familiar encerrada

Encerrar papéis futuros conforme decisão competente; não excluir histórico ou coberturas já processadas.

---

## 12. Alertas

- política próxima do fim;
- tabela de preços vencida;
- reajuste sem aprovação;
- adesão pendente de fornecedor;
- documento de dependente vencendo;
- cobertura sem cobrança;
- cobrança sem cobertura;
- diferença de preço;
- desconto sem autorização vigente;
- ordem judicial sem revisão;
- obrigação próxima do encerramento;
- valor não descontado;
- repasse não conciliado;
- percentuais de beneficiários inválidos;
- arquivo duplicado ou inconsistente;
- divergência aberta acima do SLA.

---

## 13. Relatórios

- benefícios por empresa, plano e situação;
- adesões e coberturas por competência;
- elegíveis não aderentes;
- custos patronais e do trabalhador;
- custos por centro de custo e obra;
- mensalidades e coparticipações;
- divergências de fornecedor;
- dependentes por finalidade;
- documentos pendentes;
- pensões e retenções vigentes;
- valores calculados, descontados, não atendidos e repassados;
- descontos recorrentes e parcelas;
- ajustes retroativos;
- histórico de reajustes;
- acessos e exportações sensíveis.

Relatórios gerenciais não exibirão diagnóstico, documento judicial ou dados bancários completos.

---

## 14. Permissões

- `rh.benefits.view`;
- `rh.benefits.manage_catalog`;
- `rh.benefits.manage_policies`;
- `rh.benefits.manage_plans`;
- `rh.benefits.manage_prices`;
- `rh.benefits.create_enrollment`;
- `rh.benefits.approve_enrollment`;
- `rh.benefits.manage_coverage`;
- `rh.relationships.view`;
- `rh.relationships.manage`;
- `rh.relationships.view_documents`;
- `rh.support_orders.view`;
- `rh.support_orders.manage`;
- `rh.support_orders.approve_formula`;
- `rh.recurring_deductions.manage`;
- `rh.provider_billing.import`;
- `rh.provider_billing.reconcile`;
- `rh.benefits.export_sensitive`;
- `rh.benefits.view_costs`;
- `rh.benefits.audit`.

A permissão de visualizar benefícios não concederá acesso automático a pensões ou documentos familiares.

---

## 15. Auditoria

Eventos mínimos:

- catálogo criado ou alterado;
- política publicada, suspensa ou substituída;
- plano ou preço alterado;
- adesão solicitada, aprovada, rejeitada, suspensa ou encerrada;
- cobertura incluída ou excluída;
- relação ou papel criado, alterado ou encerrado;
- documento consultado ou exportado;
- beneficiário alterado;
- ordem recebida, revisada, ativada ou substituída;
- fórmula aprovada;
- autorização registrada ou revogada;
- instrução gerada;
- desconto processado, não atendido ou estornado;
- arquivo importado;
- conciliação aprovada ou reaberta;
- ajuste retroativo criado;
- relatório sensível exportado.

---

## 16. Integrações

### 16.1 Cadastro Mestre

Reutilizará pessoa, trabalhador e vínculo. Não duplicará identidades.

### 16.2 Contratos

Elegibilidade poderá usar versão contratual vigente. Mudança contratual produzirá reavaliação, não edição retroativa.

### 16.3 Férias e afastamentos

Políticas poderão manter, suspender ou recalcular concessões por período.

### 16.4 Ponto

Eventos de ausência poderão alimentar regras somente após fechamento ou status configurado.

### 16.5 Folha

Receberá instruções versionadas e retornará resultados por competência.

### 16.6 Financeiro

Receberá obrigações de fornecedor e repasses, preservando correlação.

### 16.7 Centros de custo

Usará o catálogo canônico compartilhado. Não criará centros paralelos.

### 16.8 eSocial e fiscal

Mapeará dependentes, pensões, planos e rubricas conforme versão oficial vigente, sem acoplamento do modelo interno ao leiaute.

### 16.9 Documentos

Armazenará arquivos com classificação, hash, retenção e permissões específicas.

---

## 17. Segurança, privacidade e retenção

- criptografia de dados bancários e documentos sensíveis;
- mascaramento de CPF, conta e processo em listagens;
- segregação entre RH, folha, jurídico e financeiro;
- trilha de consulta de documentos;
- expiração de links temporários;
- verificação de malware em uploads;
- retenção por finalidade e obrigação;
- exclusão lógica quando legalmente permitida;
- anonimização em ambientes de teste;
- proibição de dados reais em fixtures públicas;
- controle de exportação em massa;
- alertas para acesso anômalo.

---

## 18. Requisitos não funcionais

- consultas por competência deverão ser reproduzíveis;
- importações deverão suportar retomada e idempotência;
- processamento em lote deverá produzir relatório item a item;
- cálculos usarão precisão decimal definida;
- datas e competências não dependerão do fuso do navegador;
- alterações concorrentes usarão controle otimista;
- documentos terão hash e metadados de origem;
- APIs terão contratos versionados;
- cálculos e conciliações terão memória de execução;
- eventos de integração usarão outbox transacional;
- falhas parciais não poderão deixar movimentos sem origem.

---

## 19. Critérios de aceite

1. Política futura não altera elegibilidade histórica.
2. Trabalhador inelegível não ativa adesão sem exceção aprovada.
3. Pessoa coberta não vira dependente tributário automaticamente.
4. Dependente tributário pode existir sem cobertura de plano.
5. Alimentando não aparece como dependente comum sem papel específico.
6. Beneficiário de seguro possui percentuais e histórico independentes.
7. Inclusão duplicada no mesmo plano e período é bloqueada.
8. Exclusão de cobertura preserva cobranças anteriores.
9. Reajuste aplica somente à vigência correspondente.
10. Tabela de preço usada fica registrada no movimento.
11. Fatura sem cobertura gera divergência.
12. Cobertura sem fatura gera alerta configurável.
13. Coparticipação não altera a mensalidade original.
14. Contribuição patronal e do trabalhador são separadas.
15. Adesão não é criada por importação de fatura.
16. Arquivo repetido não duplica itens.
17. Ordem de pensão exige documento e revisão.
18. Fórmula aprovada não pode ser editada após uso.
19. Nova fórmula preserva a anterior.
20. Simulação mostra bases, percentuais e limites.
21. Mais de um alimentando é rateado conforme versão aprovada.
22. Valor não descontado permanece identificado.
23. Margem insuficiente não quita obrigação.
24. Estorno cria movimento inverso referenciado.
25. Desconto recorrente exige autorização ou fonte válida.
26. Revogação encerra vigência sem apagar eventos.
27. Parcelas são derivadas de movimentos processados.
28. Folha retorna vínculo com a instrução de origem.
29. Reabertura gera nova versão e diferenças.
30. Retroatividade não reescreve competência fechada.
31. Financeiro recebe obrigação correlacionada.
32. Centro de custo é referenciado pelo catálogo canônico.
33. Gestor não visualiza valores de pensão.
34. RH sem permissão jurídica não abre ordem completa.
35. Exportação sensível gera auditoria.
36. Trabalhador consulta origem resumida do desconto.
37. Contestação preserva anexos e respostas.
38. Desligamento aplica política de encerramento versionada.
39. Afastamento aplica política sem editar adesão histórica.
40. Integração externa falha sem corromper o estado canônico.

---

## 20. Estratégia de testes

### 20.1 Unitários

- elegibilidade;
- vigência;
- tabelas de preço;
- rateio de subsídio;
- fórmulas de desconto;
- percentuais de beneficiários;
- parcelas e saldo;
- chaves de idempotência.

### 20.2 Integração

- cadastro mestre;
- contratos;
- férias e afastamentos;
- ponto;
- folha;
- financeiro;
- centros de custo;
- documentos;
- eventos externos.

### 20.3 Concorrência

- duas aprovações da mesma adesão;
- inclusão simultânea da mesma cobertura;
- importação repetida;
- reajuste durante conciliação;
- reabertura durante envio à folha;
- alteração de ordem durante fechamento.

### 20.4 Segurança

- acesso cruzado entre tenants;
- acesso de gestor a documentos;
- exportação sem permissão;
- exposição de CPF e dados bancários em logs;
- links expirados;
- arquivos maliciosos;
- enumeração de beneficiários.

### 20.5 Ponta a ponta

- adesão a plano com dependente;
- concessão de vale-transporte;
- carga de alimentação com afastamento parcial;
- mensalidade e coparticipação;
- pensão com dois beneficiários;
- desconto parcelado e estorno;
- fatura com divergência;
- reajuste retroativo;
- desligamento e encerramento de coberturas.

---

## 21. Sequência recomendada de implementação

1. pessoas relacionadas e papéis por finalidade;
2. catálogo e políticas;
3. planos e tabelas de preço;
4. adesões e coberturas;
5. movimentos financeiros;
6. descontos recorrentes;
7. pensão e retenções;
8. integração com folha;
9. arquivos e conciliação de fornecedores;
10. integração financeira;
11. portal do trabalhador;
12. relatórios e auditoria;
13. integrações externas e homologação.

Nenhuma etapa deverá iniciar migrations definitivas antes da reconciliação com o inventário real do repositório e da revisão do modelo de dados.

---

## 22. Riscos

- cadastro duplicado de dependentes;
- desconto sem fonte válida;
- interpretação incorreta de ordem judicial;
- cobrança após exclusão;
- divergência entre fornecedor e folha;
- parâmetros legais fixos no código;
- exposição de composição familiar;
- duplicidade por importação;
- retroatividade sem reprocessamento;
- integração financeira sem correlação;
- acoplamento direto ao leiaute externo;
- ausência de política para afastamento ou desligamento.

---

## 23. Baseline oficial

Em 6 de agosto de 2026 foram consultados:

- documentação técnica do eSocial S-1.3, consolidada até a NT 06/2026 e notas orientativas publicadas;
- Tabela 07 de tipos de dependente;
- estruturas de dependentes, pensão alimentícia, plano de saúde e deduções nos eventos aplicáveis;
- Tabela 03 de naturezas de rubricas;
- tabela de tributação de 2026 da Receita Federal;
- Lei nº 7.418/1985 e Decreto nº 10.854/2021 para vale-transporte;
- Lei nº 6.321/1976, Lei nº 14.442/2022 e regulamentação vigente do PAT;
- texto compilado da CLT para descontos salariais.

Valores, limites, incidências, códigos, documentos e interpretações deverão ser verificados novamente antes da implementação, homologação e produção.

---

## 24. Estado honesto

Este documento é especificação funcional. Não foram implementados:

- tabelas;
- migrations;
- telas;
- cálculos;
- integrações de folha;
- importações de fornecedor;
- conciliações;
- eventos governamentais;
- pagamentos ou repasses;
- testes automatizados.
