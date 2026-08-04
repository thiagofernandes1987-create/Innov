# Contrato auditável de personas — competência, autoridade, controle e evidência

**Documento canônico:** sim  
**Complementa:** `PERSONAS-E-ROTINAS.md`, `FLUXOS-E-RISCOS.md`, `KPIS.md` e `SERVICO-DE-CAMPO.md`  
**Finalidade:** transformar as personas profissionais em critérios objetivos para projeto de produto, auditoria de processo e validação assistida por LLM.

---

## 0. Por que este documento existe

`PERSONAS-E-ROTINAS.md` responde corretamente **quem sabe o quê, qual técnica executa e em qual momento**. Isso é suficiente para descobrir requisitos, mas não para concluir que um processo real está conforme.

Uma auditoria precisa fechar a cadeia inteira:

```text
competência
→ autoridade
→ responsabilidade
→ entrada
→ procedimento
→ controle
→ evidência
→ critério de aprovação
→ exceção
→ ação corretiva
```

A presença de tela, campo, tabela ou função prova somente **capacidade técnica do sistema**. Não prova que:

- a pessoa correta executou;
- tinha autoridade para executar;
- usou a versão vigente;
- respeitou segregação de função;
- gerou evidência contemporânea ao fato;
- o controle operou como pretendido;
- o resultado pretendido foi alcançado.

Este documento separa quatro avaliações que não podem ser confundidas:

1. **Competência:** a pessoa sabe executar?
2. **Processo:** a rotina foi executada na sequência e no prazo?
3. **Sistema:** a plataforma oferece os dados, estados e controles necessários?
4. **Eficácia:** o risco foi reduzido e o resultado esperado aconteceu?

---

# 1. Resultado permitido ao auditor e ao LLM

Toda conclusão usa somente um destes estados:

| Estado | Significado |
|---|---|
| `PASS` | há evidência suficiente de desenho, operação e resultado do controle |
| `FAIL` | há evidência objetiva de requisito não atendido ou controle ineficaz |
| `PARTIAL` | parte do requisito foi demonstrada, mas falta elemento material |
| `NOT_ASSESSED` | o teste não foi executado |
| `BLOCKED_EXTERNAL` | o teste depende de ambiente, credencial, terceiro ou evento indisponível |
| `NOT_APPLICABLE` | o requisito não se aplica, com justificativa registrada |

## 1.1 Proibições de conclusão

O auditor ou LLM **não pode** converter:

- código lido em runtime aprovado;
- botão existente em processo executado;
- campo preenchido em dado verdadeiro;
- arquivo anexado em evidência íntegra;
- teste não executado em sucesso;
- ausência de erro observado em eficácia comprovada;
- declaração da própria pessoa em competência demonstrada;
- aprovação do autor em revisão independente.

## 1.2 Hierarquia de evidência

Da mais forte para a mais fraca:

1. reexecução independente reproduzível;
2. transação, evento ou documento assinado e imutável;
3. trilha completa de antes/depois, autor e instante;
4. amostra de casos reais com fonte primária;
5. observação direta contemporânea;
6. documento de procedimento vigente;
7. entrevista corroborada;
8. declaração isolada — nunca suficiente para `PASS`.

---

# 2. Contrato obrigatório de toda persona

Cada persona precisa declarar os blocos abaixo. Ausência de qualquer bloco impede considerar a persona auditável.

## 2.1 Identidade profissional

- missão;
- resultado pelo qual responde;
- resultado pelo qual **não** responde;
- formação, experiência ou habilitação necessária;
- substituto autorizado;
- riscos que a função controla.

## 2.2 Competências em sete dimensões

| Dimensão | Pergunta |
|---|---|
| Técnica | domina o conhecimento da profissão? |
| Processual | conhece a sequência, entradas, saídas e estados? |
| Digital e dados | interpreta qualidade, origem e limitação dos dados? |
| Comportamental | comunica, negocia, lidera ou interrompe com segurança? |
| Ética | reconhece conflito de interesse e limite de atuação? |
| Regulatória | conhece obrigações legais, normativas e contratuais aplicáveis? |
| Risco e controle | identifica risco, aplica controle e verifica eficácia? |

## 2.3 Autoridade

Toda persona declara:

- o que pode criar;
- o que pode editar;
- o que pode aprovar;
- o que pode rejeitar;
- o que pode bloquear;
- o que pode liberar;
- limites financeiros, temporais e de escopo;
- escalonamento obrigatório;
- ações proibidas;
- funções incompatíveis.

## 2.4 Contrato de rotina

Cada rotina possui:

```text
gatilho
→ entrada mínima
→ validação de pré-condição
→ procedimento
→ saída obrigatória
→ prazo/SLA
→ destinatário
→ estado final
→ evidência
```

## 2.5 Controle

Todo controle declara:

- risco tratado;
- natureza: preventivo, detectivo ou corretivo;
- frequência;
- executor;
- aprovador/verificador;
- fonte primária;
- evidência;
- condição `PASS`;
- condição `FAIL`;
- tratamento de exceção;
- teste negativo.

## 2.6 Evidência de competência

Os níveis de `PERSONAS-E-ROTINAS.md` permanecem, mas são provados assim:

| Nível | Evidência mínima |
|---|---|
| 1 — conhece | avaliação teórica ou explicação correta de caso |
| 2 — executa com apoio | caso real revisado por profissional nível 3 ou 4 |
| 3 — executa sozinho | amostra de seis meses com resultado e retrabalho medidos |
| 4 — ensina e decide método | padrão formal adotado, equipe treinada e eficácia medida |

Certificado sem prova prática demonstra exposição ao conteúdo, não proficiência operacional.

---

# 3. Segregações universais

As seguintes combinações exigem controle compensatório ou são proibidas:

```text
criar ≠ aprovar
solicitar ≠ comprar
comprar ≠ receber
receber ≠ liberar qualidade
lançar ≠ aprovar ≠ liquidar
produzir ≠ inspecionar ≠ aceitar desvio
escrever revisão ≠ verificar ≠ aprovar ≠ liberar uso
administrar acesso ≠ auditar o próprio controle
executar contrato ≠ decidir disputa jurídica
```

Empresa pequena pode acumular pessoas, mas não pode apagar os **papéis lógicos**. Quando a mesma pessoa ocupa funções incompatíveis, o sistema registra:

- justificativa;
- limite;
- prazo temporário;
- aprovador independente;
- revisão posterior;
- trilha de todas as ações.

---

# 4. Contratos por persona

## P1 — Vendedor / SDR

**Missão auditável:** transformar oportunidade compatível em contrato executável, sem prometer escopo, preço ou prazo não validados.

### Competências adicionais obrigatórias

- governança de consentimento e dados do lead;
- qualificação e desqualificação por critérios fechados;
- leitura de capacidade comercial, de projeto e de produção;
- limite de desconto e margem mínima;
- previsão calibrada por histórico;
- handoff formal para pós-venda;
- conflito de interesse e comunicação ética;
- governança do WhatsApp e canais pessoais.

### Autoridade e proibições

Pode qualificar, negociar dentro da alçada, propor e registrar previsão. Não pode:

- prometer data sem capacidade confirmada;
- conceder desconto acima da alçada;
- alterar escopo aprovado sem aditivo;
- marcar oportunidade ganha sem aceite verificável;
- manter histórico comercial somente em aparelho pessoal.

### Evidência mínima

- origem e consentimento;
- critérios de qualificação;
- próxima ação e data;
- versão da proposta;
- aprovação de desconto;
- confirmação de capacidade;
- motivo de perda estruturado;
- aceite do handoff.

### Testes de auditoria

- amostrar negócios ganhos e reconciliar proposta, contrato, capacidade e margem;
- procurar cartão sem próxima ação;
- tentar desconto acima da alçada;
- verificar promessa de data anterior à confirmação de capacidade;
- comparar forecast previsto com realizado por etapa.

---

## P2 — Planejador

**Missão auditável:** produzir uma previsão única e defensável de prazo, explicar o desvio e quantificar o custo das alternativas.

### Competências adicionais obrigatórias

Além das já detalhadas:

- qualidade lógica do cronograma;
- data de corte e política de atualização;
- restrições rígidas e calendários excepcionais;
- análise quantitativa de risco e correlação;
- Monte Carlo quando material;
- análise de impacto de atraso;
- `time impact analysis` para mudança/claim;
- `lookahead` e processo `make-ready`;
- regra de crédito do avanço físico;
- narrativa mensal e registro de premissas;
- controle formal de mudanças;
- plano de recuperação com aceite de custo e risco.

### Autoridade e proibições

Pode calcular, simular, publicar previsão e recomendar recuperação. Não pode:

- alterar baseline congelada;
- decidir sozinho custo de aceleração;
- declarar progresso sem evidência de campo;
- apagar desvio por replanejamento;
- usar restrição rígida para esconder lógica incompleta.

### Evidência mínima

- baseline vigente;
- data de corte;
- calendário utilizado;
- rede lógica e relatório de qualidade;
- premissas;
- avanço e fonte;
- narrativa de variação;
- mudança aprovada;
- simulação de recuperação;
- publicação e destinatários.

### Testes de auditoria

- atividade sem predecessora/sucessora, salvo marcos legítimos;
- folga negativa sem justificativa;
- progresso sem apontamento;
- baseline alterada depois de congelada;
- caminho crítico sem passada para trás;
- plano acelerado sem custo marginal e aprovação;
- previsão publicada com data de corte indefinida.

---

## P3 — Montador / produção de campo

**Missão auditável:** executar com segurança, pela revisão vigente, registrar exceções no momento e entregar evidência suficiente para acompanhamento remoto.

### Competências adicionais obrigatórias

- PGR, APR e permissão de trabalho aplicáveis;
- direito e dever de interromper trabalho inseguro;
- inspeção de ferramenta e EPI;
- controle de instrumento de medição;
- isolamento e proteção do ambiente;
- quase acidente e incidente;
- risco ergonômico;
- confirmação de entendimento da revisão;
- restauração e limpeza do local.

### Autoridade e proibições

Pode interromper por risco, abrir parada e solicitar recurso. Não pode:

- trabalhar sem revisão vigente;
- improvisar alteração estrutural ou de instalação;
- encerrar tarefa sem evidência mínima;
- ajustar em obra item que exige retorno à fábrica;
- atribuir produtividade baixa quando a causa é parada externa.

### Evidência mínima

- check-in/out;
- revisão lida;
- análise de risco;
- romaneio conferido;
- ferramenta/EPI quando aplicável;
- medidas críticas;
- fotos com instante e contexto;
- parada com causa e responsável;
- `DEPT` e motivo;
- aceite da entrega.

### Testes de auditoria

- foto anexada depois do encerramento sem justificativa;
- tarefa executada por revisão superada;
- parada sem destinatário e prazo;
- check-out sem diário;
- risco crítico sem bloqueio;
- material faltante tratado como observação, não como parada.

---

## P4 — Financeiro

**Missão auditável:** manter obrigação, caixa, medição e resultado por obra íntegros, conciliados e aprovados com segregação.

### Competências adicionais obrigatórias

- fechamento mensal e conciliação de subledgers;
- provisão, retenção e competência;
- cadastro mestre de favorecido e conta;
- prevenção a fraude e alteração bancária;
- dupla aprovação e alçadas;
- tributos e documentos fiscais;
- forecast e cenário de liquidez;
- continuidade financeira;
- privacidade e proteção de dados bancários;
- análise de exceções e lançamentos manuais.

### Autoridade e proibições

Quem lança não aprova; quem aprova não altera evidência; mudança de conta bancária exige validação independente. É proibido:

- pagar sem obrigação e aprovação;
- conciliar diferença por ajuste sem causa;
- apagar lançamento liquidado;
- usar data de caixa como data de competência;
- liberar equipe ignorando bloqueio contratual sem aceite de risco.

### Evidência mínima

- origem da obrigação;
- documento fiscal/contratual;
- centro de custo e obra;
- aprovação;
- comprovante;
- conciliação;
- retenções;
- alteração mestre;
- trilha antes/depois.

### Testes de auditoria

- mesma pessoa lançando, aprovando e liquidando;
- conta bancária alterada próxima ao pagamento;
- medido e não faturado envelhecido;
- pagamento duplicado;
- ajuste de conciliação sem causa;
- custo sem obra quando a natureza exige obra.

---

## P5 — Assistência técnica

**Missão auditável:** diagnosticar, conter, resolver e devolver causa útil à operação, com comunicação e prazo confiáveis.

### Competências adicionais obrigatórias

- triagem e matriz de severidade;
- direito à garantia e exclusões;
- árvore de diagnóstico;
- contenção temporária;
- logística e disponibilidade de peça;
- base de conhecimento;
- resolução na primeira visita;
- reincidência, RCA e CAPA;
- comunicação durante indisponibilidade;
- aceite da solução e regra de reabertura.

### Autoridade e proibições

Pode classificar, agendar, conter e escalar. Não pode:

- encerrar sem causa e aceite;
- prometer reposição sem peça/capacidade;
- atribuir culpa sem evidência;
- apagar reabertura;
- classificar como uso indevido sem critério verificável.

### Evidência mínima

- sintoma original;
- severidade;
- contrato/garantia;
- diagnóstico;
- responsabilidade;
- peça e agenda;
- fotos antes/depois;
- solução;
- aceite;
- causa raiz e ação sistêmica quando recorrente.

---

## P6 — Administrador funcional

**Missão auditável:** conceder acesso mínimo, explicável e revogável durante todo o ciclo de vida da pessoa.

### Competências adicionais obrigatórias

- processo `joiner–mover–leaver`;
- recertificação periódica;
- contas privilegiadas e emergenciais;
- expiração de acesso temporário;
- MFA e sessão;
- contas técnicas;
- conflitos de função;
- diagnóstico de autorização;
- preservação de logs;
- privacidade e minimização.

### Autoridade e proibições

Pode administrar perfis dentro da alçada. Não pode:

- apagar ou alterar a própria trilha;
- conceder acesso privilegiado sem segundo aprovador;
- manter conta de desligado;
- pedir senha de usuário;
- usar conta compartilhada;
- auditar como independente um controle que administra.

### Evidência mínima

- solicitação;
- gestor/aprovador;
- papel e escopo;
- conflito avaliado;
- prazo;
- ativação;
- revisão;
- revogação;
- trilha.

---

## P7 — Projetista / detalhamento executivo

**Missão auditável:** produzir informação fabricável e executável, compatibilizada, verificada e liberada na revisão correta.

### Competências adicionais obrigatórias

- requisitos de informação e ambiente comum de dados;
- autoria, verificação, aprovação e liberação como papéis distintos;
- compatibilização e `clash detection`;
- construtibilidade;
- RFI e decisão de interface;
- conformidade normativa;
- risco de projeto;
- impacto de alteração;
- responsabilidade técnica quando aplicável;
- controle de especificações e biblioteca.

### Autoridade e proibições

Pode produzir e responder tecnicamente dentro da disciplina. Não pode:

- liberar a própria revisão sem controle independente quando exigido;
- substituir aprovação do cliente;
- alterar versão liberada sem nova revisão;
- usar arquivo fora do repositório como fonte oficial;
- liberar fabricação com incompatibilidade aberta material.

### Evidência mínima

- requisito de entrada;
- medição e tolerância;
- revisão;
- verificador;
- compatibilização;
- pendências/RFIs;
- aprovação;
- liberação;
- destinatários e confirmação de recebimento.

---

## P8 — Gerente de obras / projetos

**Missão auditável:** integrar escopo, prazo, custo, qualidade, segurança, contrato e capacidade, decidindo exceções na alçada correta.

### Competências adicionais obrigatórias

- governança e RACI;
- gestão integrada de risco;
- segurança e gestão de terceiros;
- controle de mudanças;
- EVM e previsão final;
- fluxo de caixa da obra;
- contratos, claims e notificações;
- gestão de interfaces;
- stakeholders e comunicação;
- commissioning, entrega e encerramento;
- lições aprendidas e realização de benefícios.

### Autoridade e proibições

Pode priorizar dentro da alçada, aceitar plano e escalar risco. Não pode:

- aceitar risco material sem registrar impacto;
- substituir aprovação técnica, financeira ou contratual especializada;
- ocultar desvio por rebaseline;
- liberar frente sem pré-condição de segurança, projeto, material e qualidade.

### Evidência mínima

- decisão;
- alternativas;
- impacto;
- risco aceito;
- responsável;
- prazo de revisão;
- comunicação;
- resultado posterior.

---

## P9 — Comprador

**Missão auditável:** contratar material ou serviço adequado, no custo total correto e antes da necessidade, com integridade e competição justificável.

### Competências adicionais obrigatórias

- estratégia de categoria e `spend analysis`;
- due diligence e homologação;
- conflito de interesse e integridade;
- sanções e documentação;
- capacidade financeira e operacional do fornecedor;
- TCO;
- continuidade e fonte alternativa;
- negociação estruturada;
- expediting por marco;
- avaliação de desempenho;
- garantias, seguros e condição contratual.

### Autoridade e proibições

Pode cotar e negociar; aprovação obedece alçada. Não pode:

- aprovar a própria seleção;
- receber fisicamente;
- autorizar pagamento;
- fracionar compra para evitar alçada;
- comparar propostas com escopos diferentes sem equalização;
- contratar fornecedor relacionado sem declaração e aprovação.

### Evidência mínima

- necessidade e data;
- especificação;
- fornecedores convidados;
- propostas íntegras;
- equalização;
- conflito declarado;
- aprovação;
- pedido;
- confirmação;
- marcos e desvios.

---

## P10 — Almoxarife / estoquista

**Missão auditável:** garantir que o saldo do sistema exista fisicamente, esteja localizado, preservado e rastreável.

### Competências adicionais obrigatórias

- segurança do depósito;
- conferência cega;
- quarentena e inspeção;
- endereçamento;
- FIFO/FEFO;
- lote, série e validade;
- materiais perigosos quando aplicável;
- custódia e ferramentas calibradas;
- devolução, sucata e logística reversa;
- inventário cíclico por risco;
- investigação de divergência.

### Autoridade e proibições

Pode receber, endereçar, movimentar e contar conforme função. Não pode:

- alterar saldo sem movimento;
- aprovar a própria divergência material;
- liberar item em quarentena;
- receber acima do pedido sem exceção aprovada;
- substituir inspeção de qualidade.

### Evidência mínima

- pedido;
- nota/físico;
- quantidade cega;
- condição;
- lote/série;
- inspeção/quarentena;
- localização;
- movimento;
- destinatário;
- divergência e causa.

---

## P11 — Orçamentista / engenheiro de custos

**Missão auditável:** formar uma estimativa rastreável que pague escopo, risco e condições comerciais declaradas.

### Competências adicionais obrigatórias

- classe e maturidade da estimativa;
- `basis of estimate`;
- rastreabilidade do levantamento;
- produtividade e coeficientes;
- escalonamento e data-base;
- contingência baseada em risco;
- incerteza correlacionada;
- cotações e normalização;
- construtibilidade e engenharia de valor;
- reconciliação entre versões;
- revisão independente;
- premissas, inclusões e exclusões.

### Autoridade e proibições

Pode estimar e recomendar preço. Não pode:

- aprovar sozinho margem excepcional;
- esconder contingência em item sem memória;
- usar preço sem praça/data-base;
- alterar versão congelada;
- emitir proposta sem premissas e exclusões materiais.

### Evidência mínima

- escopo;
- takeoff e memória;
- composição;
- fonte e data-base;
- produtividade;
- risco;
- contingência;
- revisão independente;
- reconciliação;
- versão.

---

## P12 — Qualidade

**Missão auditável:** prevenir desvio, verificar requisito, controlar produto não conforme e provar eficácia da ação corretiva.

### Competências adicionais obrigatórias

- plano da qualidade e ITP;
- `hold point` e `witness point`;
- amostragem;
- metrologia, calibração e MSA;
- rastreabilidade de lote;
- qualidade de fornecedor;
- custo da qualidade;
- concessão/desvio;
- CAPA;
- verificação de eficácia;
- controle de documento;
- competência de auditor.

### Autoridade e proibições

Pode bloquear e liberar dentro do plano. Não pode:

- aprovar serviço que executou quando independência for requisito;
- fechar não conformidade sem causa e eficácia;
- liberar instrumento vencido;
- substituir requisito por fotografia;
- apagar resultado rejeitado.

### Evidência mínima

- requisito e critério;
- plano e ponto de inspeção;
- amostra;
- instrumento válido;
- resultado;
- evidência;
- lote/local;
- liberação/bloqueio;
- causa;
- ação;
- eficácia.

---

## P13 — Diretoria / controladoria

**Missão auditável:** alocar capital e capacidade conforme estratégia, risco e retorno, decidindo somente exceções materiais.

### Competências adicionais obrigatórias

- estratégia e portfólio;
- apetite e tolerância a risco;
- alocação de capital;
- cenários e capacidade;
- governança e controles internos;
- benefícios e resultado por obra;
- cultura e ética;
- continuidade e crise;
- sustentabilidade quando material;
- sucessão de funções críticas.

### Autoridade e proibições

Pode aceitar risco material dentro da governança. Não pode:

- aprovar exceção sem impacto e responsável;
- substituir dado desfavorável por opinião;
- decidir conflito próprio sem declaração;
- exigir alteração retroativa de evidência;
- receber cada atividade operacional em vez de resumo por exceção.

### Evidência mínima

- cenário;
- recomendação;
- risco;
- impacto financeiro e operacional;
- decisão;
- autor;
- plano;
- responsável;
- data de revisão;
- resultado.

---

## P14 — Contratos, documentos e assinaturas

**Missão auditável:** manter versão, obrigação, vigência, mudança e evidência contratual íntegros durante todo o ciclo.

### Competências adicionais obrigatórias

- ciclo de vida contratual;
- biblioteca e desvio de cláusula;
- obrigações e marcos;
- prazo de notificação;
- mudança e aditivo;
- claims e preservação de direito;
- seguros, garantias e reajustes;
- autoridade de assinatura e procuração;
- retenção, `legal hold` e descarte;
- confidencialidade;
- escalonamento de disputa;
- encerramento contratual.

### Autoridade e proibições

Pode administrar fluxo e evidência; não interpreta direito fora da alçada. Não pode:

- liberar execução por versão obsoleta;
- aceitar assinatura sem autoridade verificável;
- alterar artefato assinado;
- deixar obrigação sem responsável e vencimento;
- apagar notificação ou documento em retenção;
- transformar orientação operacional em parecer jurídico.

### Evidência mínima

- versão;
- aprovadores;
- signatários e autoridade;
- hash;
- instante;
- obrigação;
- prazo;
- notificação;
- mudança/aditivo;
- entrega;
- retenção.

---

## P15 — Cliente contratante

**Natureza:** stakeholder externo, não empregado. Não se audita “competência profissional do cliente”; auditam-se representação, obrigações, decisões e interfaces contratuais.

**Missão auditável:** tomar decisões dentro da autoridade contratual e receber informação aprovada, suficiente e compreensível.

### Elementos obrigatórios

- representante autorizado;
- escopo de decisão;
- prazo de resposta;
- aceite e rejeição;
- impacto apresentado antes da decisão;
- mudança de escopo;
- medição e obrigação financeira;
- privacidade e acesso;
- comunicação e escalonamento;
- substituto e ausência.

### Proibições do sistema

- expor informação interna não aprovada;
- aceitar decisão de pessoa sem autoridade;
- converter mensagem informal em mudança sem confirmação;
- apresentar duas previsões conflitantes;
- ocultar impacto de prazo ou custo;
- encerrar ocorrência sem aceite ou regra contratual.

### Evidência mínima

- identidade e representação;
- decisão solicitada;
- alternativas e impacto;
- prazo;
- resposta;
- aceite;
- versão;
- comunicação;
- efeito no plano/contrato.

---

## P16 — Auditoria interna / compliance

**Missão auditável:** avaliar de forma independente se controles estão desenhados, implementados, operando e produzindo o resultado pretendido.

### Competências adicionais obrigatórias

- independência e objetividade;
- estatuto e mandato;
- universo auditável;
- avaliação de risco;
- programa e critérios;
- walkthrough;
- população, amostra e suficiência;
- confiabilidade da evidência;
- reexecução e análise de dados;
- papéis de trabalho;
- supervisão e revisão;
- classificação de achado;
- causa raiz;
- comunicação;
- follow-up e eficácia;
- fraude, TI e privacidade;
- programa de qualidade da auditoria.

### Autoridade e proibições

Pode acessar evidência conforme mandato e emitir conclusão. Não pode:

- operar o controle que audita;
- aceitar declaração sem corroborar;
- alterar critério depois de ver o resultado;
- omitir limitação de escopo;
- classificar `NOT_ASSESSED` como aprovado;
- fechar ação somente porque o responsável declarou conclusão.

### Evidência mínima

- objetivo e escopo;
- critério;
- risco;
- população;
- amostra;
- procedimento executado;
- evidência;
- limitação;
- conclusão;
- causa;
- ação, dono e prazo;
- teste de eficácia.

---

# 5. Papéis organizacionais ainda ausentes

As 16 personas cobrem os aplicativos atuais, mas não cobrem integralmente todos os papéis de controle de uma empresa real. Os papéis abaixo são **lacunas declaradas**, não devem ser silenciosamente absorvidos por uma persona existente.

## P17 — Segurança e Saúde no Trabalho

PGR, inventário de riscos, APR, permissões, capacitação, inspeção, acidente, quase acidente, emergência e gestão de terceiros.

## P18 — Pessoas, RH e folha

Admissão, cargo, jornada, treinamento, qualificação, documento vencível, desempenho, mudança de função, desligamento e integração com acesso.

## P19 — TI, segurança da informação e proteção de dados

Vulnerabilidade, incidente, backup, continuidade, conta privilegiada, configuração, fornecedor de tecnologia, privacidade e comunicação de incidente.

## P20 — Jurídico e claims

Interpretação jurídica, notificação, claim, disputa, responsabilidade, preservação de evidência, negociação e estratégia de acordo.

## P21 — PCP / fábrica / produção interna

Capacidade, sequenciamento, ordem de fabricação, gargalo, rendimento, plano de corte, qualidade de fabricação e data disponível para promessa.

## P22 — Fornecedor / subcontratado

Qualificação, documentação, confirmação, marcos, inspeção, entrega, medição, não conformidade, segurança e acesso restrito.

**Regra:** antes de criar permissões P17–P22, cada papel passa pelo mesmo processo de competência, rotina, risco e catálogo executável aplicado a P1–P16.

---

# 6. Como o LLM audita um componente

Para cada tela, ação, tabela, RPC, workflow ou relatório, o LLM executa esta sequência:

## 6.1 Identificar o trabalho real

1. persona primária;
2. técnica executada;
3. gatilho;
4. entradas;
5. saída;
6. prazo;
7. quem deve ser informado.

## 6.2 Verificar autoridade

1. quem executa;
2. papel e escopo;
3. alçada;
4. segregação;
5. aprovador;
6. exceção vigente.

## 6.3 Verificar dado e estado

1. fonte primária;
2. versão;
3. organização e obra;
4. autor;
5. instante;
6. antes/depois;
7. estados permitidos;
8. imutabilidade quando concluído.

## 6.4 Verificar controle

1. risco;
2. preventivo/detectivo/corretivo;
3. cenário normal;
4. cenário pessimista;
5. teste negativo;
6. resultado pretendido.

## 6.5 Emitir conclusão

Formato obrigatório:

```yaml
resultado: PASS | FAIL | PARTIAL | NOT_ASSESSED | BLOCKED_EXTERNAL | NOT_APPLICABLE
persona: P1-P22
tecnica: identificador ou nome
componente: caminho, rota, tabela ou função
criterio: regra testada
evidencia:
  - fonte
  - autor
  - instante
  - trecho ou resultado
limitacoes: []
risco_residual: descrição
acao:
  responsavel: persona ou pessoa
  prazo: data ou SLA
```

Sem evidência, o campo `resultado` nunca é `PASS`.

---

# 7. Testes mínimos por componente

Todo componente relevante para uma persona possui:

1. **caminho feliz** — usuário correto, entrada válida, resultado esperado;
2. **entrada incompleta** — bloqueio antes de gerar estado inválido;
3. **usuário sem autoridade** — negação no servidor/banco, não só na interface;
4. **conflito de função** — executor tentando aprovar a própria ação;
5. **versão obsoleta** — bloqueio ou aviso material;
6. **duplicidade/repetição** — idempotência;
7. **concorrência** — quando saldo, alçada, agenda ou sequência puder disputar;
8. **falha externa** — estado recuperável e evidência da falha;
9. **evidência ausente** — conclusão não permitida;
10. **fronteira cliente/interno** — nenhuma informação interna exposta.

---

# 8. Critérios para considerar uma persona completa

Uma persona está pronta somente quando:

- competências nas sete dimensões estão escritas;
- autoridade e proibições estão definidas;
- funções incompatíveis estão declaradas;
- rotinas possuem gatilho, entradas, saídas e SLA;
- riscos possuem controles;
- controles possuem evidências e testes negativos;
- fluxo pessimista está em `FLUXOS-E-RISCOS.md`;
- aplicativos estão no catálogo executável;
- componentes têm fonte primária identificada;
- o LLM consegue distinguir `PASS`, `FAIL` e `NOT_ASSESSED` sem inferir fato.

---

# 9. Referenciais profissionais

Este contrato adota, sem transformar norma em checklist cego, os princípios de:

- PMI — gestão de projetos, cronogramas, riscos e competências;
- AACE — Total Cost Management, estimativa, prazo e controle;
- ISO 9001 — competência, processo, evidência e melhoria;
- ISO 19011 — programa, método e competência de auditoria;
- IIA Global Internal Audit Standards — independência, evidência, comunicação e follow-up;
- NIST SP 800-53/53A — desenho, implementação, operação e eficácia de controles;
- ISO 19650 — gestão e versionamento de informação de projeto;
- ISO 15489 — gestão de documentos e registros;
- NR-1 e NR-18 — gerenciamento de riscos ocupacionais e construção;
- LGPD e orientações da ANPD — autorização, auditoria, minimização e incidentes.

Referencial não substitui validação jurídica, contábil, técnica ou regulatória aplicável ao caso concreto.

---

# 10. Regra de precedência

- `PERSONAS-E-ROTINAS.md` define **conhecimento, ferramenta, técnica e rotina**;
- este documento define **autoridade, controle, evidência e auditoria**;
- `FLUXOS-E-RISCOS.md` define **o que quebra e como se responde**;
- `KPIS.md` e `SERVICO-DE-CAMPO.md` definem **desempenho medido**;
- o catálogo e os testes provam **cobertura executável**.

Nenhum desses arquivos substitui os demais. A persona só está descrita quando os cinco pontos concordam.