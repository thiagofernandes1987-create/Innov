# ADR-010 — Separação entre Fato Interno, Projeção, Transmissão, Recibo, Totalizador e Obrigação

**Projeto:** Projeto RH  
**Estado:** proposta aceita para orientar a especificação; implementação pendente  
**Data:** 6 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  

---

## 1. Contexto

O Projeto RH produz fatos trabalhistas, cadastrais, contratuais, remuneratórios e de segurança que podem gerar obrigações perante sistemas externos. Esses sistemas possuem finalidades, ciclos, leiautes, regras e estados próprios.

Misturar o fato interno com o evento transmitido criaria riscos graves:

- um erro de comunicação poderia apagar ou alterar o fato real;
- um recibo aceito poderia ser confundido com quitação financeira;
- um totalizador externo poderia sobrescrever a memória de cálculo da folha;
- uma guia emitida poderia ser considerada paga sem retorno financeiro;
- uma retificação poderia apagar o evento original;
- o fechamento do eSocial poderia ser tratado como transmissão da DCTFWeb;
- a DCTFWeb poderia ser tratada como calculadora da folha;
- o FGTS Digital poderia ser tratado como cadastro mestre de remuneração;
- ambientes de produção e produção restrita poderiam compartilhar credenciais ou filas;
- uma indisponibilidade externa poderia interromper a operação interna;
- a empresa perderia a capacidade de explicar a origem de um débito ou divergência.

A arquitetura precisa preservar a verdade interna, gerar projeções reproduzíveis, transmitir de forma idempotente e reconciliar respostas externas sem acoplamento destrutivo.

---

## 2. Decisão

O Projeto RH adotará objetos canônicos separados e conectados.

### 2.1 Fato interno

É o acontecimento aprovado no domínio de origem, como:

- admissão;
- alteração contratual;
- afastamento;
- acidente;
- remuneração;
- pagamento;
- desligamento;
- processo trabalhista;
- condição ambiental;
- exame ocupacional.

O fato interno não depende da disponibilidade do sistema governamental e não será reescrito pelo retorno externo.

### 2.2 Obrigação aplicável

É a conclusão de que determinado fato, sujeito, inscrição, período e regra exigem uma comunicação, declaração, fechamento, guia ou pagamento.

A obrigação guardará:

- fundamento e versão normativa;
- sistema de destino;
- tipo de obrigação;
- sujeito e inscrição;
- período ou data do fato;
- prazo calculado;
- dependências;
- criticidade;
- responsável;
- estado.

### 2.3 Projeção externa

É a representação do fato interno conforme um leiaute e versão específicos.

A projeção guardará:

- tipo de evento;
- versão do leiaute;
- ambiente;
- origem interna;
- versões e snapshots utilizados;
- payload canônico;
- payload serializado;
- hash;
- chave idempotente;
- validações;
- dependências;
- aprovação.

Uma nova versão do fato ou do leiaute produzirá nova projeção. A projeção anterior permanecerá imutável.

### 2.4 Lote ou envelope

É o agrupamento técnico de projeções para transmissão. Não será usado como fonte de verdade dos fatos agrupados.

### 2.5 Tentativa de transmissão

É cada interação com o sistema externo, com instante, canal, certificado, ambiente, resposta técnica, correlação e resultado.

Tentativas serão append-only. Repetir uma tentativa não alterará a projeção original.

### 2.6 Recibo ou protocolo

É a evidência de recepção ou processamento fornecida pelo sistema externo.

Recibo aceito não significa automaticamente:

- fechamento concluído;
- totalizador recebido;
- declaração transmitida;
- débito constituído;
- guia emitida;
- pagamento efetuado;
- reconciliação concluída.

### 2.7 Retorno de processamento

É a resposta técnica ou de negócio vinculada a uma tentativa, podendo conter aceite, rejeição, advertência, código, mensagem e orientação.

O texto externo será preservado, mas não controlará diretamente estados internos de outros domínios.

### 2.8 Totalizador externo

É o resultado calculado pelo sistema governamental a partir dos eventos aceitos.

Totalizadores serão importados como snapshots imutáveis e comparados com os resultados internos. Não substituirão a memória de cálculo da folha.

### 2.9 Declaração ou apuração consolidada

Representa a consolidação externa resultante de escriturações e fechamentos, como a DCTFWeb. Será acompanhada e reconciliada, não calculada artificialmente pelo Projeto RH.

### 2.10 Débito externo

É o valor constituído ou apresentado pelo sistema competente, identificado por origem, código, período, inscrição, trabalhador quando aplicável e estado.

### 2.11 Guia

É o documento de arrecadação emitido para um ou mais débitos. Guia não é débito e emissão não é pagamento.

### 2.12 Pagamento e liquidação

São os movimentos financeiros e retornos que comprovam pagamento, rejeição, estorno, compensação ou liquidação parcial.

### 2.13 Item de reconciliação

É a comparação auditável entre valores ou estados internos e externos, com dimensões como:

- trabalhador;
- vínculo;
- estabelecimento ou inscrição;
- lotação tributária;
- competência;
- tipo de evento;
- rubrica;
- código de receita;
- base;
- contribuição;
- FGTS;
- IRRF;
- pagamento.

---

## 3. Modelo conceitual

```text
Fato interno aprovado
  → obrigação aplicável
    → projeção versionada
      → validação e aprovação
        → lote/envelope
          → tentativa de transmissão
            → retorno e recibo
              → totalizador ou apuração externa
                → débito
                  → guia
                    → pagamento
                      → reconciliação
```

```text
Fato interno
  ≠ projeção externa
  ≠ evento transmitido
  ≠ recibo
  ≠ totalizador
  ≠ declaração
  ≠ débito
  ≠ guia
  ≠ pagamento
```

---

## 4. Princípios obrigatórios

1. O fato interno permanecerá sob responsabilidade do domínio que o produziu.
2. Sistemas externos não serão fonte única da verdade trabalhista interna.
3. Toda projeção referenciará versões e snapshots de origem.
4. Payload aprovado será imutável.
5. Alteração de conteúdo exigirá nova projeção.
6. Tentativas de transmissão serão append-only.
7. Reenvio técnico do mesmo payload usará a mesma identidade lógica quando permitido.
8. Retificação será diferente de reenvio.
9. Exclusão externa não apagará o fato interno.
10. Recibo será armazenado com integridade e correlação.
11. Aceite técnico e aceite de negócio serão estados distintos quando o protocolo permitir.
12. Totalizadores externos serão historizados por consulta e período.
13. Divergência não será corrigida por edição direta do totalizador.
14. Correção deverá ocorrer no fato ou evento de origem apropriado.
15. Período fechado exigirá reabertura quando a regra externa determinar.
16. Reabertura, retificação e novo fechamento formarão um caso auditável.
17. Fechamento do eSocial não será tratado como transmissão da DCTFWeb.
18. DCTFWeb será acompanhada como declaração derivada das escriturações aplicáveis.
19. FGTS Digital será acompanhado como plataforma de débitos e guias derivada das remunerações declaradas.
20. Guia emitida não será marcada como paga sem evidência financeira ou retorno autorizado.
21. Pagamento parcial e múltiplas guias serão representáveis.
22. Produção e produção restrita terão filas, credenciais, certificados e evidências segregados.
23. Certificados e segredos não aparecerão em logs, payloads de auditoria ou exportações comuns.
24. Prazos serão calculados por regras versionadas e calendário oficial configurável.
25. Indisponibilidade externa não apagará nem bloqueará o registro do fato interno.
26. Contingência terá início, fim, evidência, responsáveis e plano de regularização.
27. O sistema preservará a ordem causal e as dependências entre eventos.
28. Eventos enviados fora de ordem serão bloqueados antes da transmissão quando detectáveis.
29. Aprovação humana poderá ser exigida por tipo, valor, ambiente ou criticidade.
30. Toda ação de transmissão, consulta, download, retificação, exclusão, fechamento e reabertura será auditada.

---

## 5. Idempotência e concorrência

Cada projeção deverá possuir uma chave lógica derivada de:

- organização;
- empregador ou contribuinte;
- ambiente;
- tipo de evento;
- sujeito ou vínculo;
- período ou data do fato;
- natureza da operação;
- versão da origem;
- versão do leiaute.

O sistema deverá impedir:

- duas projeções ativas concorrentes para a mesma identidade lógica;
- fechamento simultâneo da mesma competência;
- reabertura e fechamento concorrentes;
- duas exclusões ativas para o mesmo recibo;
- transmissão simultânea com certificados incompatíveis;
- duplicação de guia ou pagamento por repetição de callback.

Locks terão tempo limitado, proprietário e trilha de recuperação.

---

## 6. Correções

### 6.1 Reenvio técnico

Repete a transmissão do mesmo payload após timeout ou erro de transporte, sem alterar o conteúdo.

### 6.2 Retificação

Cria nova versão lógica para corrigir informação aceita incorretamente, referenciando o recibo ou evento anterior quando exigido.

### 6.3 Exclusão

Solicita a exclusão externa quando juridicamente e tecnicamente permitida. O caso interno e a evidência original permanecem.

### 6.4 Reabertura

Reabre um período para permitir correções de eventos periódicos ou outras operações dependentes do estado do período.

### 6.5 Reprocessamento interno

Recalcula projeções, impactos e reconciliações sem transmitir automaticamente.

### 6.6 Ajuste financeiro

Trata pagamento, compensação, restituição, estorno ou diferença sem alterar silenciosamente a escrituração que originou o débito.

---

## 7. Reconciliação em camadas

### Camada 1 — Eventos

Compara fatos e projeções internas com eventos aceitos, rejeitados, ausentes ou duplicados.

### Camada 2 — Totalizadores

Compara bases e valores internos com totalizadores por trabalhador e consolidados.

### Camada 3 — Declarações e débitos

Compara o fechamento esperado com DCTFWeb, FGTS Digital e outras apurações aplicáveis.

### Camada 4 — Guias

Relaciona débitos a guias emitidas, vencimentos, parcelamentos, suspensões e acréscimos.

### Camada 5 — Pagamentos

Compara guias com ordens financeiras, comprovantes, retornos, liquidações e saldos.

Uma camada reconciliada não presume que as demais estejam reconciliadas.

---

## 8. Sistemas e fronteiras

### eSocial

Responsável pela recepção de eventos de tabelas, não periódicos, periódicos, SST, processos e totalizadores conforme leiaute vigente.

### DCTFWeb

Recebe automaticamente apurações após o encerramento bem-sucedido das escriturações aplicáveis. O Projeto RH acompanhará status, valores, transmissão, recibos, DARF e pagamento, sem editar débitos diretamente como forma de corrigir erro de origem.

### FGTS Digital

Utiliza remunerações declaradas no eSocial para individualização de débitos e geração de guias. O Projeto RH reconciliará trabalhador, competência, tipo de débito, guia e pagamento.

### EFD-Reinf e MIT

Não pertencem ao núcleo trabalhista do Projeto RH, mas influenciam a DCTFWeb. O módulo deverá receber referências, fechamentos e totalizações desses sistemas para reconciliação global, sem duplicar sua escrituração.

### Financeiro e Contabilidade

Serão fontes de ordens, pagamentos, retornos e lançamentos, sem criar eventos trabalhistas por conta própria.

---

## 9. Segurança

- certificados em cofre seguro;
- segregação por organização, contribuinte e ambiente;
- rotação e vencimento controlados;
- uso de certificado registrado por tentativa;
- proibição de chave privada em banco comum, log ou exportação;
- dupla aprovação para alterações sensíveis;
- limitação de download de payloads com dados pessoais;
- mascaramento de documentos em telas operacionais;
- trilha de acesso e exportação;
- assinatura e verificação de integridade quando aplicável;
- allowlist de destinos oficiais;
- proteção contra replay e callback forjado;
- observabilidade sem exposição de dados pessoais ou segredos.

---

## 10. Consequências positivas

- verdade interna preservada;
- transmissões reproduzíveis;
- correções rastreáveis;
- redução de duplicidade;
- fechamento mais seguro;
- explicação da origem de débitos;
- reconciliação entre folha, eSocial, DCTFWeb, FGTS Digital e Financeiro;
- operação resiliente a indisponibilidades;
- auditoria por trabalhador, evento, período e guia;
- suporte a múltiplas empresas, inscrições e obras.

---

## 11. Custos e impactos

- criação de registro canônico de obrigações;
- motor de dependências e prazos;
- infraestrutura de filas, outbox e polling;
- cofre de certificados;
- armazenamento protegido de payloads e recibos;
- conectores específicos por sistema e versão;
- reconciliação multidimensional;
- operação de contingência;
- necessidade de homologação externa;
- revisão fiscal, previdenciária, trabalhista e de segurança.

---

## 12. Alternativas rejeitadas

### Usar o recibo como estado final

Rejeitada porque o recibo não comprova totalização, declaração, débito ou pagamento.

### Copiar totalizadores para a folha

Rejeitada porque destruiria a memória interna e impediria explicar divergências.

### Corrigir valores diretamente na DCTFWeb

Rejeitada porque os valores derivados devem ser corrigidos na escrituração de origem quando aplicável.

### Considerar guia emitida como paga

Rejeitada porque emissão, ordem, pagamento e liquidação são fatos diferentes.

### Apagar evento rejeitado

Rejeitada porque rejeições são evidências essenciais de auditoria e suporte.

### Uma fila única para produção e testes

Rejeitada pelo risco de envio ao ambiente incorreto e vazamento de credenciais.

### Transmitir automaticamente todo fato aprovado

Rejeitada porque obrigações podem depender de prazo, evento anterior, aprovação, fechamento, certificado e validação externa.

---

## 13. Critérios de aceite da futura implementação

- um fato aprovado pode existir durante indisponibilidade externa;
- uma projeção identifica exatamente as versões internas utilizadas;
- o mesmo payload pode ser reenviado sem criar duplicidade lógica;
- uma retificação preserva evento e recibo anteriores;
- uma exclusão externa não apaga o fato interno;
- um fechamento bloqueia eventos incompatíveis;
- reabertura e novo fechamento preservam toda a sequência;
- totalizadores podem ser comparados por trabalhador e consolidado;
- divergência mostra origem, valor interno, valor externo e regra;
- uma DCTFWeb retificadora pode ser relacionada ao novo encerramento;
- guia de FGTS pode conter débitos de múltiplas competências sem perder o vínculo individual;
- pagamento parcial mantém saldo aberto;
- certificado vencido impede transmissão, mas não apaga a obrigação;
- produção restrita não compartilha fila ou credencial com produção;
- auditor identifica quem aprovou, transmitiu, consultou, reabriu e retificou.

---

## 14. Baseline oficial consultada

Em 6 de agosto de 2026 foram verificadas fontes oficiais vigentes:

- documentação técnica do eSocial S-1.3 até NT 06/2026;
- Manual de Orientação do eSocial consolidado até NO 11/2026;
- eventos de fechamento, reabertura, exclusão e totalização;
- orientações da Receita Federal sobre integração automática entre eSocial, EFD-Reinf e DCTFWeb;
- serviço e manuais da DCTFWeb, incluindo orientações publicadas em 2026;
- Manual do FGTS Digital versão 1.70, de 12 de junho de 2026;
- comunicados de 2026 sobre processos trabalhistas e FGTS Digital.

A implementação deverá revalidar leiautes, endpoints, regras, prazos, códigos, ambientes, certificados e interpretações antes da homologação e produção.

---

## 15. Relações

- `docs/PROJETO-RH-MODULO-03-ADMISSAO-PRE-ADMISSAO.md`;
- `docs/PROJETO-RH-MODULO-04-CONTRATOS-E-ALTERACOES.md`;
- `docs/PROJETO-RH-MODULO-06-FERIAS-AFASTAMENTOS-E-LICENCAS.md`;
- `docs/PROJETO-RH-MODULO-08-SST-RISCOS-EXAMES-E-HABILITACOES.md`;
- `docs/PROJETO-RH-MODULO-09-FOLHA-RUBRICAS-CALCULO-E-FECHAMENTO.md`;
- `docs/PROJETO-RH-MODULO-10-OBRIGACOES-DIGITAIS-E-RECONCILIACAO.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/REUSO-DE-INFORMACAO.md`.
