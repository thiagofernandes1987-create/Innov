<!-- CANÔNICO. Documento de arquitetura da Innovar Platform. -->

# Procedência e como ler este documento

**Documento canônico:** sim
**Origem:** proposta do responsável, recebida em 8 de agosto de 2026 e versionada aqui em 10 de agosto de 2026, por decisão dele. Antes disso vivia como anexo de conversa — e o repositório tem uma regra sobre isso: decisão que vive em conversa se perde quando o contêiner é reciclado.
**Decisão registrada:** adotar o mapa **completo**, na estratégia de fases da própria §36.

O texto abaixo da linha é o **documento original, íntegro**. Nada foi removido nem reescrito. O que esta seção acrescenta é a **medição executada** contra as afirmações que dependiam de medição — porque a §39 do próprio documento exige critério de desempenho, e a regra de método do repositório manda executar a aritmética em vez de narrá-la.

Onde a medição concorda com o documento, está dito. Onde diverge, está dito também, com o número.

---

## O que foi medido, e quando

### A premissa que motivou a proposta

A proposta nasceu de uma queixa específica e verificável: *"sempre está havendo regressões, deadcodes por esquecimento de chamadas"*. Ela foi medida. A `main` chegou a ter **3 erros de sintaxe e 31 de tipo, 23 deles `Cannot find name`**, em 6 arquivos — imports e definições apagados por resolução de merge, com os pontos de chamada mantidos. A queixa era exata.

### O compilador do Go sobre esses mesmos defeitos

Os defeitos reais foram reescritos em Go e submetidos à cadeia que a §24 do documento define para a linguagem:

| ferramenta | resultado |
| --- | --- |
| `go build` | **limpo** |
| `go vet` | **limpo** |
| saída do programa | **a mesma, errada** |
| `staticcheck` (`U1000`) | **pegou** — função não usada |

Isto **não contradiz** o documento; confirma o §24 e o fecho dele. O ganho estava na **camada de validação**, que a matriz final do documento já nomeia (`compiler + vet + staticcheck + race`), e não na troca de linguagem em si. O próprio texto conclui: *"essa é provavelmente uma decisão arquitetural mais importante que escolher especificamente Go, Python ou Rust"*.

### Onde está o gargalo do Node, medido

| rota | vazão | CPU usada (de 400% disponíveis) | limitante observado |
| --- | ---: | ---: | --- |
| `/login` | 117 req/s | 125% | um núcleo saturado |
| `/app/orcamentos` | 13,7 req/s | **55%** | **ocioso**, esperando ~12 idas ao banco |

A segunda linha importa para o §7: reescrever um caminho como esse em Go move a ociosidade de lugar, não o número. O ganho de Go, nos módulos onde o documento o indica, vem de **concorrência e trabalho assíncrono de longa duração** — que é o que a §7.1 de fato reivindica —, não de CPU de request-response.

### Permissão e escala

`has_module_permission` custa **5,30 ms quente**, cerca de 200× uma consulta RLS simples, e o teto medido é de ~252 req/s em 4 núcleos a 3 chamadas por request. Testado com **10.000 usuários e 100 perfis**, o custo ficou **plano** (5–7 ms) — a hipótese de que cresceria com a base de usuários foi **falsificada pela própria medição**.

### Trabalho pesado real

O leitor do pacote SINAPI processa **15 MB em 10.035 ms** — 2.880 insumos, 8.403 composições, 43.923 itens analíticos. É o tipo de carga que a §7.4 aponta como candidata legítima.

### Duas inconsistências internas do documento

1. **§21 contra §33.** Reconciliada pela T-43.4, na seção seguinte. **A leitura original registrada aqui estava errada** — ver lá.
2. **§36 Fase 1 já estava concluída quando o documento foi lido.** Ver abaixo.

## A reconciliação da §21 com a §33 (T-43.4)

**Estado: proposta — requer ratificação**, como a [`ADR-0001`](./ADR-0001-CAMADA-DE-EXECUCAO.md). Medições reproduzíveis por `node scripts/medir-distribuicao.mjs`.

### O que eu havia afirmado, e por que estava errado

A primeira leitura desta seção dizia que a §21 põe Go em **52,3% das linhas** contra os **5–15%** da §33, e que *"as duas não podem valer ao mesmo tempo"*. **Podem.** Elas medem coisas diferentes, e comparar os dois números foi comparar presença com volume:

- a **§21** conta **em quantas linhas da matriz uma linguagem aparece** — e 100% das linhas são polyglotas, com 2,30 linguagens por linha em média. Somando as presenças dá 101 para 44 linhas: os percentuais da §21 **não somam 100 e não deveriam ser lidos como fatia**;
- a **§33** estima **fatia do código**.

Uma linha que diz *"Secundária: Go"* não reserva volume de código nenhum. Diz que Go é **admissível** ali.

### A contradição que sobra depois de corrigir a unidade

Colocadas na mesma unidade — linguagem **principal** de cada linha, que é a única leitura da §21 que soma 100%:

| | §21, como principal | §33 | |
| --- | ---: | :---: | --- |
| TypeScript | 56,8% | 60–70% | pouco abaixo |
| PostgreSQL | 18,2% | 20–25% | pouco abaixo |
| **Go** | **20,5%** | **5–15%** | **acima — a inconsistência real** |
| Python | 11,4% | sem faixa | — |
| Rust | 2,3% | sem faixa | — |

A contradição é **real, mas localizada em Go e muito menor do que parecia**: 20,5% contra um teto de 15%, e não 52,3% contra 5–15%. As nove linhas em que Go é principal são WMS, RFID, Conciliação, Assinatura, Documentos, WhatsApp, SINAPI, CUB e Backup.

### O problema maior: a §33 não é mensurável como está

A §33 dá faixas sem dizer **de que**. E a unidade inverte o resultado. Este mesmo repositório, medido de duas formas igualmente defensáveis:

| | TypeScript | SQL | Go |
| --- | ---: | ---: | ---: |
| **código vivo** (sem o ledger) | **84,3%** — acima | **11,1%** — abaixo | 0,0% |
| **com o ledger de migrations** | **58,0%** — abaixo | **38,9%** — acima | 0,0% |

TypeScript e SQL trocam de lado da faixa conforme a contagem. **Alvo sem unidade não é alvo**: é um número que confirma a tese de quem o cita, porque a contagem se escolhe depois de saber o que se quer concluir.

A causa é estrutural, não acidental: **migration é append-only.** Uma escrita de 2026 permanece para sempre e nunca é refatorada, enquanto código de aplicação encolhe e se reescreve. Contar o ledger faz o SQL crescer de forma monotônica até que **qualquer** plataforma estoure a faixa por acumulação de história, e não por decisão de arquitetura.

### A regra proposta

1. **A §21 é autorização, não orçamento.** Responde *"esta linguagem é admissível neste módulo?"*. Não se converte em percentual, e citar "Go aparece em N% das linhas" — em qualquer direção — é erro de unidade.
2. **A §33 é alarme de desvio, medido sobre código vivo**, sem o ledger de migrations, por `scripts/medir-distribuicao.mjs`.
3. **A §33 nunca decide uma escolha concreta.** Ela própria diz que não deve ser limite rígido. Escolher linguagem para reequilibrar percentual é o *"otimizar por intuição"* que a §39 proíbe: a distribuição provoca a pergunta, a medição do caso responde.
4. **Onde as duas divergirem sobre Go, prevalece a §37** — a ADR do caso concreto, com número. Foi assim na ADR-0001, cuja conclusão contraria a §7.4 e está registrada como tal.

### O que a medição diz sobre a plataforma de hoje

**Go tem 0 linhas de código de plataforma.** Os três `.go` do repositório são instrumentos de medição em `benchmarks/`, e o script os exclui de propósito — contá-los faria o Go aparecer só porque alguém mediu o Go.

Pela leitura de código vivo, o desvio real é **TypeScript em 84,3% contra um teto de 70%**, com SQL abaixo da faixa. Isso converge com o achado da [`WORKERS.md`](./WORKERS.md): a camada de execução nunca foi construída, então tudo que ela faria está em TypeScript, dentro do request. O alarme da §33, uma vez que se lhe dê uma unidade, aponta para o mesmo lugar que a ADR-0001 — **o que não é, por si, razão para escolher Go**, pela regra 3 acima.

### O que a camada de validação produziu em um dia

A Fase 1 da §36 pede *"reforçar strict typing; reforçar CI; eliminar duplicações de regras"*. Executada em 10 de agosto, ela encontrou, em código que já ia entrar:

| achado | quantidade |
| --- | ---: |
| mensagem interna do provedor exposta em superfície pública | **308** |
| policies com ação fora do vocabulário — negavam **todos**, inclusive SUPER_ADMIN, sem erro | **20** |
| server actions mortas | 2 |
| função apagada por merge **sem gerar conflito** | 1 |
| certificado vencido em arquivo versionado | 1 |

Nenhum desses seria evitado por trocar de linguagem, e todos entraram porque as ferramentas não existiam. É a tese do fecho do documento, confirmada por execução.

---

## Estado da estratégia de fases (§36)

| fase | estado | evidência |
| --- | --- | --- |
| **1 — Consolidar** | **concluída** | strict typing (`noUnusedLocals`/`noUnusedParameters`), CI reforçado com `validate:exports-mortos` e `validate:assercoes`, duplicações eliminadas, `PROVA-POR-SABOTAGEM.md` canônica e `WORKERS.md` fechando a classificação dos workers |
| **2 — Execution Engine** | **bloqueada na ratificação** | a ADR da §37 está escrita — [`ADR-0001`](./ADR-0001-CAMADA-DE-EXECUCAO.md), com os doze itens e o benchmark da §39. Falta a decisão do proprietário arquitetural |
| 3 a 6 | pendentes | na ordem da §36 |

A §37 é inegociável e está sendo respeitada: **nenhuma linguagem nova entra sem ADR**, e a ADR-0001 não foi tratada como formalidade. O benchmark que ela exige **contraria a expectativa**: a CPU é 0,03% de um job de despacho, e o Node tem 57× de folga no volume medido. Por isso a ADR separa o que esta seção juntava — **extrair a camada do request é decisão incondicional**, a **linguagem** é decisão condicionada a quatro gatilhos numéricos. A conclusão contraria a leitura literal da §7.4, e o conflito está registrado na §16 da própria ADR em vez de omitido.

---

# INNOV — Mapa Tecnológico e Diretrizes de Arquitetura

**Documento:** Arquitetura Tecnológica, Linguagens e Critérios de Uso  
**Projeto:** Innov / Innovar Platform  
**Versão:** 1.0  
**Data:** 2026-08-09  
**Status:** Diretriz arquitetural proposta para expansão da plataforma

---

## 1. Objetivo

Este documento estabelece uma arquitetura tecnológica de referência para a evolução da **Innov**, definindo:

- quais linguagens e tecnologias devem ser preferidas;
- em quais módulos ou tipos de processamento cada linguagem deve ser utilizada;
- quando uma tecnologia deve ou não ser introduzida;
- quais responsabilidades devem permanecer no banco de dados;
- como separar produto, processamento assíncrono, inteligência artificial e computação de alto desempenho;
- como reduzir erros introduzidos por LLMs em desenvolvimento orientado por *vibecoding*;
- como evitar microserviços prematuros, duplicação de regras e proliferação descontrolada de tecnologias;
- como preparar a plataforma para expansão sem sacrificar manutenção, integridade ou desempenho.

A proposta não busca uma “linguagem vencedora”. A estratégia é uma **arquitetura poliglota controlada**, na qual cada tecnologia possui fronteiras e responsabilidades claras.

---

# 2. Princípio arquitetural central

A regra de alto nível recomendada para a Innov é:

> **TypeScript constrói o produto. PostgreSQL protege a verdade. Go executa o trabalho assíncrono e operacional. Python fornece inteligência e computação científica. Rust acelera apenas hotspots comprovados.**

Em forma resumida:

```text
TypeScript = Produto e experiência
PostgreSQL = Verdade, integridade e transação
Go         = Execução, workers, integrações e concorrência
Python     = IA, ML, visão computacional e otimização científica
Rust       = Hotspots extremos comprovados por benchmark
```

---

# 3. Mapa tecnológico macro

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                            INNOV PLATFORM                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  EXPERIÊNCIA DO USUÁRIO                                                   │
│                                                                           │
│  ┌──────────────────────────┐       ┌──────────────────────────┐           │
│  │ WEB / PWA                │       │ MOBILE / CAMPO           │           │
│  │ Next.js + React          │       │ React Native / Expo      │           │
│  │ TypeScript               │       │ TypeScript               │           │
│  └─────────────┬────────────┘       └─────────────┬────────────┘           │
│                │                                  │                        │
│                └────────────────┬─────────────────┘                        │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ CORE DE APLICAÇÃO / BFF                                             │  │
│  │ TypeScript                                                          │  │
│  │ Server Components • Actions • APIs • Zod • Auth • Domínio Web       │  │
│  └──────────────────────────────┬──────────────────────────────────────┘  │
│                                 │                                          │
│                                 ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ POSTGRESQL / SUPABASE                                               │  │
│  │ SQL • PL/pgSQL • RLS • RPC • Constraints • Locks • Triggers         │  │
│  │ Auth • Storage • Realtime • pgvector                                │  │
│  └──────────────────────────────┬──────────────────────────────────────┘  │
│                                 │                                          │
│                         Outbox / Jobs / Queue                              │
│                                 │                                          │
│            ┌────────────────────┼────────────────────┐                     │
│            ▼                    ▼                    ▼                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ GO ENGINE       │  │ PYTHON ENGINE    │  │ RUST ENGINE      │          │
│  │ Workers         │  │ IA / ML          │  │ Hotspots         │          │
│  │ Jobs            │  │ OCR / CV         │  │ BIM/Geometria    │          │
│  │ Integrações     │  │ RAG              │  │ Parsing pesado   │          │
│  │ Webhooks        │  │ Solvers          │  │ Alto desempenho  │          │
│  │ Batch           │  │ Analytics        │  │                  │          │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                    │                     │                     │
│           └────────────────────┼─────────────────────┘                     │
│                                ▼                                           │
│                    Storage / Providers / APIs / IoT                        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# 4. Arquitetura recomendada: monólito modular + plano de execução

A Innov **não deve ser convertida prematuramente em dezenas de microserviços**.

A arquitetura recomendada é:

```text
                  ┌────────────────────────────┐
                  │     MONÓLITO MODULAR       │
                  │ Next.js + TypeScript       │
                  │ PostgreSQL / Supabase      │
                  └─────────────┬──────────────┘
                                │
                          Outbox / Queue
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                  ▼                           ▼
         ┌─────────────────┐        ┌─────────────────┐
         │ EXECUTION PLANE │        │ INTELLIGENCE    │
         │ Go              │        │ Python          │
         └─────────────────┘        └─────────────────┘
```

A extração de um componente para serviço independente só deve ocorrer quando houver motivo técnico mensurável.

### Critérios válidos para extrair um serviço

Um domínio pode ser separado quando:

1. precisa escalar independentemente;
2. possui carga computacional muito diferente do restante;
3. precisa continuar funcionando mesmo se a aplicação web estiver indisponível;
4. possui ciclo de deploy independente;
5. requer isolamento de segurança específico;
6. depende de bibliotecas ou runtime incompatíveis com o core;
7. executa trabalhos de longa duração;
8. possui concorrência significativa;
9. processa grandes volumes em lote;
10. será mantido por equipe ou agente especializado independente.

Se nenhuma dessas condições existir, o padrão deve ser **permanecer no monólito modular**.

---

# 5. TypeScript

## 5.1 Papel

TypeScript deve ser a **linguagem principal do produto Innov**.

Seu domínio natural é:

```text
Usuário
   ↓
Interface
   ↓
Validação
   ↓
Regra de aplicação
   ↓
Transação / RPC
   ↓
Resposta
```

## 5.2 Onde utilizar

- Next.js;
- React;
- Server Components;
- Server Actions;
- APIs BFF;
- páginas;
- dashboards;
- formulários;
- componentes UI;
- schemas Zod;
- autenticação na aplicação;
- autorização de aplicação;
- SDKs internos;
- clientes de APIs;
- portal do cliente;
- portal de fornecedores;
- aplicativo mobile em React Native / Expo;
- regras de apresentação;
- orquestração síncrona de requisições curtas.

## 5.3 Módulos predominantemente TypeScript

- CRM;
- Clientes;
- Comercial;
- Propostas;
- Contratos — interface e workflow;
- Aditivos;
- Obras;
- Diário de obra;
- Qualidade — UI;
- FVS/FVM;
- Compras — UI;
- Estoque — UI;
- Financeiro — UI;
- Relatórios;
- Dashboards;
- Auditoria — UI;
- Configurações;
- Administração;
- Portal;
- RH;
- Departamento Pessoal;
- Orçamentos — experiência e fluxo;
- Planejamento — UI;
- Cronogramas — UI.

## 5.4 Quando escolher TypeScript

Escolher TypeScript quando:

- a operação acontece dentro de uma requisição HTTP comum;
- o usuário espera resposta imediata;
- há forte ligação com a UI;
- a lógica não exige processamento intensivo;
- a operação é predominantemente CRUD;
- a função atua como BFF;
- o código compartilha contratos com frontend/mobile;
- a tarefa pode ser executada com segurança dentro do runtime web.

## 5.5 Quando não utilizar

Evitar TypeScript/Next.js para:

- processamento longo;
- filas permanentes;
- consumers de alta vazão;
- processamento massivo de arquivos;
- OCR pesado;
- visão computacional;
- treinamento/inferência local de ML;
- processamento massivo SINAPI;
- tarefas de minutos ou horas;
- pipelines concorrentes;
- serviços IoT contínuos;
- tarefas que precisam sobreviver ao ciclo de uma requisição web.

---

# 6. PostgreSQL / SQL / PL/pgSQL

## 6.1 Papel

PostgreSQL deve ser o **guardião da verdade empresarial**.

A aplicação pode errar. Um agente pode errar. Um worker pode errar.

A base não deve permitir que esses erros violem invariantes essenciais.

## 6.2 Responsabilidades

Utilizar o banco para:

- RLS;
- Foreign Keys;
- UNIQUE;
- CHECK;
- NOT NULL;
- transações;
- constraints;
- advisory locks;
- funções críticas;
- RPCs transacionais;
- triggers defensivos;
- imutabilidade;
- idempotência;
- ledger;
- auditoria;
- saldos;
- movimentações;
- multiempresa;
- multiobra;
- versionamento de estados;
- controle de concorrência.

## 6.3 Regra essencial

Nunca depender exclusivamente de código de aplicação para proteger uma invariante crítica.

### Exemplo incorreto

```text
TypeScript calcula saldo
       ↓
decide se pode retirar
       ↓
grava movimentação
```

### Exemplo recomendado

```text
TypeScript / Go
       ↓
solicita movimentação
       ↓
PostgreSQL
       ↓
transaction
lock
constraint
validação
       ↓
aprova ou rejeita
```

## 6.4 Módulos com alta responsabilidade no banco

- Estoque;
- WMS;
- Financeiro;
- Compras;
- Contratos;
- Assinaturas;
- Qualidade;
- SAC;
- Auditoria;
- WhatsApp;
- RH/DP;
- Folha;
- Orçamento;
- Ledger;
- Eventos;
- Snapshots;
- Permissões e isolamento de tenant.

---

# 7. Go

## 7.1 Papel

Go deve formar o **Innov Execution Engine**.

Sua função é executar trabalhos que não pertencem naturalmente ao ciclo da aplicação web.

```text
                INNOV EXECUTION ENGINE
                         Go
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
   Workers             Integrações          Batch
      │                   │                   │
   Queues             Webhooks            Importação
   Retry              Providers           Reconciliação
   Jobs               APIs externas       Documentos
```

## 7.2 Onde utilizar

- workers;
- queues;
- retries;
- schedulers;
- consumers;
- webhooks de alto volume;
- integração com providers;
- processamento em lote;
- importadores;
- manipulação de arquivos;
- geração de documentos;
- reconciliação;
- pipelines assíncronos;
- concorrência;
- jobs de retenção;
- manutenção automática;
- processamento WMS;
- ingestão IoT;
- sync server-side;
- processamento de mídia.

## 7.3 Por que Go

Go é particularmente adequado por:

- compilação estática;
- tipos obrigatórios;
- binário único;
- baixo consumo de memória;
- inicialização rápida;
- concorrência simples;
- excelente ecossistema HTTP;
- excelente suporte a containers;
- pouca “mágica” de linguagem;
- `gofmt` canônico;
- ferramentas oficiais fortes;
- facilidade de cross-compilation;
- boa verificabilidade por LLMs.

Para desenvolvimento dirigido por agentes, há uma vantagem adicional:

> O compilador funciona como parte do sistema de supervisão do LLM.

## 7.4 Módulos recomendados

### WhatsApp

Go para:

- fila de mensagens;
- envio;
- retry;
- rate limiting;
- reconciliação;
- provider;
- processamento de webhook;
- download/upload de mídia;
- controle de entrega.

TypeScript permanece na UI.

### Assinatura digital

Go para:

- conversão DOCX/PDF;
- comunicação com provider;
- hash;
- armazenamento;
- filas;
- retry;
- reconciliação;
- entrega de cópias;
- processamento de callbacks.

### Documentos

Go para:

- conversões;
- antivírus;
- thumbnails;
- hash;
- upload;
- download;
- retenção;
- compactação;
- manipulação em lote.

### SINAPI / CUB

Go para:

```text
Arquivo
   ↓
Parser
   ↓
Normalização
   ↓
Validação
   ↓
Batch
   ↓
Persistência
   ↓
Reconciliação
```

### Estoque / WMS

Go para:

- ressuprimento;
- eventos;
- integração RFID;
- roteirização;
- automação;
- jobs;
- sincronização.

PostgreSQL continua protegendo o saldo e as transações.

### Financeiro

Go para:

- conciliação;
- OFX;
- CNAB;
- Pix;
- boletos;
- webhooks bancários;
- processamento em lote;
- integração fiscal.

## 7.5 Quando não utilizar

Não utilizar Go para:

- páginas;
- formulários simples;
- CRUD trivial;
- UI;
- BFF comum;
- regra que já pode ser expressa com segurança em TypeScript + PostgreSQL;
- IA/ML sem justificativa específica.

---

# 8. Python

## 8.1 Papel

Python deve ser a **linguagem da inteligência e computação científica**.

Não deve ser a linguagem padrão de CRUD ou domínio empresarial.

## 8.2 Onde utilizar

- IA;
- LLM;
- RAG;
- embeddings;
- NLP;
- OCR;
- visão computacional;
- machine learning;
- classificação;
- extração inteligente;
- análise estatística;
- otimização;
- solvers;
- ciência de dados;
- engenharia computacional;
- interpretação de plantas;
- processamento científico.

## 8.3 Ecossistemas relevantes

- NumPy;
- SciPy;
- Pandas;
- OpenCV;
- PyTorch;
- Transformers;
- scikit-learn;
- OR-Tools;
- bibliotecas especializadas de engenharia.

## 8.4 Módulos potenciais

### Engenharia / Plantas

```text
PDF / Imagem
      ↓
OCR / CV
      ↓
Reconhecimento de elementos
      ↓
Ambientes
      ↓
Paredes
Portas
Janelas
      ↓
Quantitativos
      ↓
Orçamento
```

### Orçamento inteligente

```text
Memorial
+ Planta
+ Histórico
+ SINAPI
      ↓
Python / IA
      ↓
Sugestão
      ↓
Validação determinística
      ↓
Persistência
```

### Planejamento

Python pode ser utilizado em:

- otimização de cronogramas;
- recursos;
- simulações;
- previsão;
- análise de risco;
- curva de produtividade;
- detecção de anomalias.

## 8.5 Regra de governança

Python **não deve ser a autoridade final sobre uma transação crítica**.

Preferência:

```text
Python recomenda / calcula / classifica
          ↓
Core valida
          ↓
PostgreSQL registra e protege
```

## 8.6 Vibecoding em Python

Código crítico deve exigir:

```text
ruff
  ↓
pyright --strict
  ↓
pytest
  ↓
property tests
  ↓
security checks
```

Evitar `Any` em contratos críticos.

---

# 9. Rust

## 9.1 Papel

Rust não deve ser uma linguagem padrão da plataforma.

Deve ser um **acelerador especializado**.

## 9.2 Candidatos

- IFC;
- DWG/DXF;
- geometria computacional;
- processamento de mesh;
- parsing de arquivos gigantes;
- algoritmos de quantitativos geométricos;
- processamento intensivo de imagem;
- compressão;
- criptografia;
- cálculos numéricos críticos;
- bibliotecas chamadas por Python ou Go.

## 9.3 Regra obrigatória

Rust só deve ser introduzido quando existirem:

1. benchmark do sistema atual;
2. gargalo relevante;
3. implementação ou protótipo Rust;
4. benchmark comparativo;
5. ganho operacional justificável.

Não utilizar Rust simplesmente porque “Rust é rápido”.

---

# 10. Mobile

## 10.1 Stack

```text
React Native
Expo
TypeScript
SQLite
```

## 10.2 Módulos

- Diário de obra;
- FVS/FVM;
- inspeções;
- fotos;
- checklists;
- estoque;
- inventário;
- apontamento;
- equipes;
- medições;
- SAC;
- notificações;
- recebimento de materiais.

## 10.3 Offline-first

Construção civil exige tolerância a conexão instável.

Arquitetura recomendada:

```text
Ação do usuário
      ↓
SQLite local
      ↓
Outbox
      ↓
conectado?
      │
   não│sim
      │  ↓
      │ Sync
      │  ↓
      └→ API / Queue
            ↓
        PostgreSQL
```

O cliente não deve depender permanentemente de conexão para realizar atividades essenciais de campo.

---

# 11. MQTT e IoT

Para WMS avançado, RFID, sensores e gateways, adotar MQTT quando necessário.

```text
RFID
Sensores
Coletores
Gateways
    │
    ▼
   MQTT
    │
    ▼
Go IoT Gateway
    │
    ▼
Queue / Event
    │
    ▼
PostgreSQL / WMS
```

Evitar dispositivos conversando diretamente com rotas Next.js como arquitetura permanente.

---

# 12. Filas e eventos

## 12.1 Primeira escolha

Antes de adotar Kafka ou RabbitMQ, utilizar solução de fila próxima ao ecossistema PostgreSQL/Supabase quando atender ao volume.

Arquitetura:

```text
Transação
   │
   ├── grava estado
   └── publica evento/job
            ↓
          Queue
            ↓
      ┌─────┼─────┐
      ▼     ▼     ▼
    Go-1  Go-2  Go-3
```

## 12.2 Quando avaliar Kafka / Redpanda / NATS

Somente quando houver:

- throughput realmente alto;
- múltiplos consumidores independentes;
- replay de grande volume;
- retenção longa de eventos;
- event streaming como requisito principal;
- limitação comprovada da infraestrutura atual.

Não introduzir por antecipação.

---

# 13. Temporal / workflows duráveis

Fila e workflow não são a mesma coisa.

Processos que podem durar horas ou dias podem futuramente justificar um motor de workflow durável.

Exemplo:

```text
Contrato
   ↓
Gerar documento
   ↓
Enviar assinatura
   ↓
Aguardar cliente
   ↓
Aguardar provider
   ↓
Webhook
   ↓
Validar
   ↓
Arquivar
   ↓
Enviar cópia
```

Temporal ou solução equivalente deve ser avaliado quando a quantidade de processos longos, retries e estados intermediários justificar a complexidade.

Não é necessário introduzir prematuramente.

---

# 14. Observabilidade

Adotar OpenTelemetry como padrão transversal.

```text
TypeScript ─┐
Go ─────────┼──→ OpenTelemetry / OTLP
Python ─────┤         │
Rust ───────┘         ├── traces
                      ├── metrics
                      └── logs
```

Isso desacopla instrumentação do fornecedor de APM.

Requisitos:

- correlation ID;
- traces distribuídos;
- métricas;
- logs estruturados;
- sanitização de dados sensíveis;
- health checks;
- alertas;
- auditoria separada de observabilidade técnica.

---

# 15. Storage

Manter storage de aplicação integrado ao ecossistema atual, mas tratar backup como responsabilidade separada.

```text
Storage operacional
      ↓
Backup periódico
      ↓
Object Storage externo
      ↓
Versionamento / Imutabilidade
```

Documentos críticos devem possuir:

- SHA-256;
- metadados;
- versionamento lógico;
- política de retenção;
- recuperação testada;
- evidência de integridade.

---

# 16. Infraestrutura

Arquitetura preferida enquanto a plataforma ainda não justificar Kubernetes:

```text
WEB
Vercel
└── Next.js

DATA
Supabase
├── PostgreSQL
├── Auth
├── RLS
├── Storage
├── Realtime
├── pgvector
└── Queues

COMPUTE
Containers gerenciados
├── Go workers
├── Python AI
├── Document processors
└── Jobs

CI/CD
GitHub Actions

OBSERVABILITY
OpenTelemetry
```

## Kubernetes

Não adotar Kubernetes apenas para parecer “enterprise”.

Avaliar quando:

- existirem muitos serviços;
- houver necessidade de scheduling avançado;
- houver demanda multi-cloud/on-premises;
- houver equipe para operar cluster;
- custos ou limitações dos runtimes gerenciados justificarem.

---

# 17. Infrastructure as Code

Quando a infraestrutura externa crescer, adotar OpenTofu/Terraform.

```text
infra/
├── modules/
├── environments/
│   ├── dev/
│   ├── homolog/
│   └── prod/
└── policies/
```

Utilizar para:

- serviços;
- secrets;
- service accounts;
- buckets;
- DNS;
- monitoramento;
- filas;
- redes;
- permissões.

Evitar configuração manual não versionada.

---

# 18. Bash / Shell

Usar somente para automação operacional simples:

- bootstrap;
- CI;
- build;
- containers;
- backup;
- restore;
- manutenção;
- scripts administrativos pequenos.

Não colocar regra empresarial em Shell.

---

# 19. YAML

Usar YAML para:

- pipelines;
- GitHub Actions;
- manifests;
- configurações;
- OpenAPI quando adequado.

Não transformar YAML em linguagem de negócio.

---

# 20. Protobuf / gRPC

JSON + Zod + OpenAPI são suficientes para grande parte da plataforma.

Avaliar Protobuf/gRPC quando houver comunicação interna de alto volume entre:

```text
Go ↔ Go
Go ↔ Python
Go ↔ Rust
Python ↔ Rust
```

Critérios:

- grande volume;
- latência relevante;
- contratos rígidos;
- streaming;
- necessidade de SDK gerado.

---

# 21. Matriz de linguagens por módulo

| Módulo/Recurso | Tecnologia principal | Secundária | Justificativa |
|---|---|---|---|
| CRM | TypeScript | PostgreSQL | UI e workflow empresarial |
| Clientes | TypeScript | PostgreSQL | CRUD + integridade |
| SAC | TypeScript | Go + PostgreSQL | UI + processamento assíncrono |
| Comercial | TypeScript | PostgreSQL | Domínio transacional |
| Propostas | TypeScript | Go | UI + documentos/jobs |
| Contratos | TypeScript | PostgreSQL + Go | Domínio + integridade + processamento |
| Aditivos | TypeScript | PostgreSQL | Transacional |
| Obras | TypeScript | PostgreSQL | Aplicação empresarial |
| Diário de obra | TypeScript | SQLite/PostgreSQL | Campo e sincronização |
| Qualidade | TypeScript | PostgreSQL | Formulários e workflow |
| FVS/FVM | TypeScript | PostgreSQL | Não requer engine científico |
| Compras | TypeScript | PostgreSQL + Go | UI + integrações |
| Estoque | PostgreSQL + TypeScript | Go | Integridade no DB; automação em Go |
| WMS | Go + PostgreSQL | TypeScript | Eventos e automação |
| RFID | Go | MQTT + PostgreSQL | Ingestão de dispositivos |
| Financeiro | TypeScript + PostgreSQL | Go | Transacional + integrações |
| Conciliação | Go | PostgreSQL | Batch e integração |
| Relatórios | TypeScript | PostgreSQL | Consulta e visualização |
| BI avançado | PostgreSQL | Python | Analytics |
| Auditoria | PostgreSQL | TypeScript + Go | Eventos + UI |
| Observabilidade | OpenTelemetry | Go/TS/Python | Padrão transversal |
| Assinatura | Go | PostgreSQL + TypeScript | Workflow assíncrono |
| Documentos | Go | Rust eventual | Processamento de arquivos |
| WhatsApp | Go | TypeScript + PostgreSQL | Worker e integrações |
| Portal cliente | TypeScript | PostgreSQL | Web |
| Portal fornecedor | TypeScript | PostgreSQL | Web |
| RH | TypeScript | PostgreSQL | Domínio empresarial |
| Departamento Pessoal | TypeScript + PostgreSQL | Go | Regras + jobs |
| Folha | PostgreSQL + TypeScript | Go | Consistência e processamento |
| SINAPI | Go | PostgreSQL + TypeScript | Ingestão massiva |
| CUB | Go | PostgreSQL + TypeScript | Importação/processamento |
| Orçamento | TypeScript + PostgreSQL | Go/Python | Produto + automação/IA |
| Planejamento | TypeScript | Python | UI + otimização |
| Cronograma | TypeScript | Python | Interface + solver |
| IA | Python | TypeScript | Ecossistema ML/LLM |
| RAG | Python | PostgreSQL/pgvector | IA + vetores |
| OCR | Python | Go | CV + pipeline |
| Plantas | Python | Rust futuro | CV + geometria |
| BIM/IFC | Rust futuro | Python | Parser + inteligência |
| Quantitativos IA | Python | Rust eventual | ML/geometria |
| Mobile | TypeScript | SQLite | Reuso de stack |
| Sync offline | TypeScript | Go | Cliente + processamento |
| Backup | Go/Shell | PostgreSQL | Automação operacional |
| CI/CD | YAML | Shell/TS/Go | Automação |

---

# 22. Matriz "quando usar o quê"

## TypeScript

**Use quando:**

- UI;
- API BFF;
- formulários;
- CRUD;
- regra de aplicação síncrona;
- dashboard;
- workflow de usuário;
- mobile React Native.

**Não use como primeira opção quando:**

- processamento pesado;
- longa duração;
- fila contínua;
- IA/ML;
- computação científica.

---

## PostgreSQL

**Use quando:**

- integridade;
- transação;
- concorrência;
- autorização por dados;
- estado empresarial;
- imutabilidade;
- auditabilidade.

**Não use como:**

- motor genérico de processamento pesado;
- engine de IA;
- substituto de workers.

---

## Go

**Use quando:**

- worker;
- fila;
- retry;
- batch;
- provider;
- integração;
- arquivo;
- webhook;
- concorrência;
- serviço contínuo.

**Não use quando:**

- UI;
- CRUD trivial;
- experimento científico;
- IA/ML em que Python é claramente superior.

---

## Python

**Use quando:**

- IA;
- ML;
- CV;
- OCR;
- RAG;
- otimização;
- ciência de dados;
- solver;
- pesquisa.

**Não use quando:**

- CRUD comum;
- BFF;
- página web;
- worker empresarial simples que Go resolve melhor.

---

## Rust

**Use quando:**

- benchmark prova gargalo;
- parser pesado;
- geometria;
- computação intensiva;
- segurança de memória é especialmente importante.

**Não use quando:**

- ganho não foi medido;
- Go/Python já resolvem adequadamente;
- manutenção ficaria mais cara que o benefício.

---

# 23. Arquitetura orientada a LLM / Vibecoding

A Innov deve ser construída assumindo que LLMs podem produzir erros.

A estratégia correta não é esperar perfeição.

É cercar o código de validadores determinísticos.

```text
                       LLM
                        │
                        ▼
                     CÓDIGO
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
      TIPOS          TESTES           LINTERS
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                    CONTRATOS
                        │
                        ▼
                     CI GATE
                        │
                        ▼
                     MERGE
```

---

# 24. Gates recomendados por linguagem

## TypeScript

```text
format
  ↓
eslint
  ↓
tsc --noEmit
  ↓
strict mode
  ↓
unit tests
  ↓
contract tests
  ↓
integration tests
  ↓
build
```

Regras:

- `strict: true`;
- evitar `any`;
- Zod nas fronteiras externas;
- contratos explícitos;
- testes de integração;
- tipos compartilhados quando apropriado.

---

## Go

```text
gofmt
  ↓
go vet
  ↓
staticcheck
  ↓
golangci-lint
  ↓
go test ./...
  ↓
go test -race ./...
  ↓
integration tests
  ↓
build
```

Essa stack torna Go particularmente interessante para código gerado por LLM.

---

## Python

```text
ruff
  ↓
pyright --strict
  ↓
pytest
  ↓
property tests
  ↓
security checks
  ↓
integration tests
```

---

## Rust

```text
cargo fmt
  ↓
cargo check
  ↓
cargo clippy
  ↓
cargo test
  ↓
benchmarks
  ↓
build
```

---

## PostgreSQL

```text
migration parse
      ↓
schema validation
      ↓
RLS tests
      ↓
transaction tests
      ↓
concurrency tests
      ↓
rollback tests
      ↓
migration ledger
```

---

# 25. Política anti-regressão para LLM

Toda alteração gerada por agente deve seguir:

```text
1. Ler contratos e diretrizes
2. Identificar impacto
3. Alterar implementação
4. Atualizar testes
5. Executar validadores
6. Comparar comportamento anterior
7. Revisar segurança
8. Revisar migrations
9. Atualizar documentação
10. Somente então permitir merge
```

O agente não deve poder declarar uma tarefa concluída apenas porque o código “parece correto”.

---

# 26. Contratos entre linguagens

Uma arquitetura poliglota exige contratos canônicos.

Preferência inicial:

- JSON Schema;
- OpenAPI;
- Zod como validação TypeScript;
- modelos equivalentes em Go/Python;
- fixtures canônicas;
- golden tests.

Exemplo:

```text
contracts/
├── quality/
│   ├── schema.json
│   ├── examples/
│   └── expected/
├── documents/
├── whatsapp/
└── inventory/
```

Se TypeScript, Go e Python implementarem a mesma regra, todos devem passar sobre os **mesmos fixtures canônicos**.

Isso reduz divergência semântica.

---

# 27. Regra contra duplicação de domínio

Evitar:

```text
TypeScript implementa regra A
Python implementa regra A diferente
Go implementa regra A diferente
```

Preferir:

```text
Contrato canônico
       │
       ├── TS adapter
       ├── Go adapter
       └── Python adapter
```

Ou ainda melhor: definir uma **autoridade única** para cada regra.

Exemplo:

```text
Saldo de estoque
Autoridade = PostgreSQL

Fila de envio WhatsApp
Autoridade = Go

Classificação de documento por IA
Autoridade = Python

Interface de aprovação
Autoridade = TypeScript
```

---

# 28. Catálogo de autoridades

| Tipo de regra | Autoridade preferida |
|---|---|
| Integridade financeira | PostgreSQL |
| Integridade de estoque | PostgreSQL |
| RLS / tenant | PostgreSQL |
| UI / interação | TypeScript |
| Estado de componente | TypeScript |
| Worker / retry | Go |
| Integração provider | Go |
| Batch | Go |
| IA / classificação | Python |
| OCR / CV | Python |
| Solver científico | Python |
| Hotspot geométrico | Rust |
| Device ingestion | Go/MQTT |
| Workflow de longa duração | Temporal ou equivalente, quando adotado |

---

# 29. Tecnologias a evitar prematuramente

Não introduzir sem evidência:

- Kafka;
- Kubernetes;
- Elasticsearch/OpenSearch;
- banco NoSQL operacional adicional;
- banco vetorial dedicado;
- GraphQL;
- gRPC em todo o sistema;
- Rust generalizado;
- dezenas de microserviços;
- múltiplos frameworks web;
- múltiplos ORMs;
- múltiplos sistemas de fila.

A pergunta deve ser sempre:

> Qual problema real esta nova tecnologia resolve que a stack atual não resolve adequadamente?

---

# 30. Redis

Não introduzir Redis como dependência obrigatória por padrão.

Avaliar quando houver necessidade comprovada de:

- cache compartilhado;
- locks específicos fora do PostgreSQL;
- rate limiting distribuído;
- sessões específicas;
- dados efêmeros de alta frequência.

Se PostgreSQL ou infraestrutura existente resolverem adequadamente, evitar nova dependência.

---

# 31. Busca

## Primeira escolha

PostgreSQL:

- full text search;
- índices;
- trigram;
- filtros;
- JSONB.

## RAG

PostgreSQL + pgvector inicialmente.

## Search engine dedicado

Avaliar Elasticsearch/OpenSearch/Meilisearch/Typesense apenas quando métricas mostrarem que Postgres não atende.

---

# 32. Estrutura de repositório sugerida

```text
Innov/
│
├── apps/
│   ├── web/
│   │   └── Next.js + TypeScript
│   │
│   └── mobile/
│       └── Expo + TypeScript
│
├── packages/
│   ├── contracts/
│   ├── domain/
│   ├── ui/
│   ├── permissions/
│   ├── observability/
│   └── testing/
│
├── services/
│   ├── worker/
│   │   └── Go
│   │
│   ├── ai/
│   │   └── Python
│   │
│   ├── document-intelligence/
│   │   └── Python
│   │
│   ├── iot-gateway/
│   │   └── Go
│   │
│   └── native/
│       └── Rust
│
├── supabase/
│   ├── migrations/
│   ├── tests/
│   └── seeds/
│
├── contracts/
│   ├── schemas/
│   ├── fixtures/
│   └── golden/
│
├── infra/
│   ├── containers/
│   ├── tofu/
│   ├── observability/
│   └── runbooks/
│
├── scripts/
├── docs/
└── diretrizes/
```

---

# 33. Distribuição tecnológica conceitual

A distribuição não deve ser usada como limite rígido, mas ajuda a evitar desvio arquitetural.

```text
INNOV
│
├── ~60–70%  TypeScript
│             Produto e UX
│
├── ~20–25%  SQL / PL/pgSQL
│             Dados e integridade
│
├── ~5–15%   Go
│             Execution Plane
│
├── Python
│   Escopo especializado
│   IA / engenharia / dados
│
└── Rust
    Escopo excepcional
    Hotspots comprovados
```

A Innov deve possuir essencialmente três tecnologias de primeira classe:

```text
TypeScript
PostgreSQL
Go
```

e duas especializadas:

```text
Python
Rust
```

---

# 34. Árvore de decisão para nova funcionalidade

```text
NOVA FUNCIONALIDADE
        │
        ▼
Tem interface ou interação direta com usuário?
        │
   ┌────┴────┐
   │ Sim     │ Não
   ▼         ▼
TypeScript   É uma invariante transacional?
             │
        ┌────┴────┐
        │ Sim     │ Não
        ▼         ▼
   PostgreSQL     É trabalho assíncrono, integração,
                  batch, fila ou processamento operacional?
                         │
                    ┌────┴────┐
                    │ Sim     │ Não
                    ▼         ▼
                    Go       É IA, ML, CV, OCR,
                             solver ou ciência?
                                  │
                             ┌────┴────┐
                             │ Sim     │ Não
                             ▼         ▼
                           Python    Existe hotspot
                                     comprovado?
                                          │
                                     ┌────┴────┐
                                     │ Sim     │ Não
                                     ▼         ▼
                                    Rust    Reavaliar:
                                            TS / SQL / Go
```

---

# 35. Árvore de decisão para microserviço

```text
NOVO MÓDULO
    │
    ▼
Pode viver no monólito modular?
    │
   Sim ───────────────────────────────→ MANTER NO MONÓLITO
    │
   Não
    ▼
Por quê?
    │
    ├── escala independente
    ├── runtime específico
    ├── processamento longo
    ├── isolamento de falha
    ├── isolamento de segurança
    ├── ciclo de deploy independente
    └── equipe independente
           │
           ▼
      SERVIÇO JUSTIFICADO
```

---

# 36. Estratégia de evolução

## Fase 1 — Consolidar

- manter core TypeScript/PostgreSQL;
- eliminar duplicações de regras;
- criar contratos canônicos;
- reforçar strict typing;
- reforçar CI;
- classificar todos os workers existentes.

## Fase 2 — Execution Engine

- introduzir Go;
- migrar workers apropriados;
- padronizar queue/retry;
- instrumentar OpenTelemetry;
- criar biblioteca comum de integração.

## Fase 3 — Mobile offline

- Expo;
- SQLite;
- outbox;
- sync;
- módulos de campo.

## Fase 4 — Intelligence Plane

- consolidar serviços Python;
- RAG;
- OCR;
- CV;
- planejamento;
- orçamento inteligente;
- análise de documentos.

## Fase 5 — IoT / WMS

- MQTT;
- Go IoT Gateway;
- RFID;
- eventos;
- ressuprimento;
- roteirização.

## Fase 6 — Otimização avançada

- identificar hotspots;
- benchmark;
- Rust apenas quando necessário;
- avaliar workflow engine;
- avaliar streaming de eventos quando volume justificar.

---

# 37. Política para novas linguagens

Nenhuma nova linguagem deve entrar no repositório sem uma ADR contendo:

1. problema;
2. alternativas avaliadas;
3. motivo pelo qual stack existente não atende;
4. impacto operacional;
5. impacto em CI/CD;
6. impacto em segurança;
7. impacto em contratação/manutenção;
8. impacto em LLM/vibecoding;
9. estratégia de testes;
10. estratégia de rollback;
11. proprietário arquitetural;
12. critérios para remover a tecnologia futuramente.

---

# 38. Política para dependências

Antes de adicionar biblioteca:

```text
É necessária?
     │
     ├── Não → não adicionar
     │
     └── Sim
          ↓
Existe solução na stdlib?
          │
     ┌────┴────┐
     │ Sim     │ Não
     ▼         ▼
 Preferir     Avaliar
 stdlib       dependência
                │
                ▼
         licença
         manutenção
         CVEs
         tamanho
         lock-in
         suporte
```

Isso é particularmente relevante para código gerado por LLM, que tende a adicionar bibliotecas por conveniência.

---

# 39. Critério de desempenho

Não otimizar por intuição.

Fluxo obrigatório:

```text
Medir
  ↓
Identificar gargalo
  ↓
Criar benchmark
  ↓
Otimizar arquitetura/SQL
  ↓
Medir novamente
  ↓
Somente então trocar tecnologia
```

A escolha de Go ou Rust nunca deve ser justificada apenas pela reputação de desempenho da linguagem.

---

# 40. Critério de manutenção

Ao escolher tecnologia, considerar simultaneamente:

```text
desempenho
+
manutenção
+
testabilidade
+
segurança
+
observabilidade
+
facilidade para LLM
+
ecossistema
+
custo operacional
```

A melhor tecnologia não é a mais rápida isoladamente.

É a que minimiza o custo total de evolução com confiabilidade suficiente.

---

# 41. Posição específica sobre vibecoding

Para código produzido majoritariamente por LLMs:

### Preferência estrutural

```text
Go              ██████████
TypeScript      █████████
PostgreSQL      █████████
Python strict   ████████
Python dinâmico █████
```

Go não é necessariamente a linguagem que o LLM escreve com maior facilidade.

É uma das linguagens em que o ambiente consegue **detectar mais erros estruturais automaticamente**.

Isso faz grande diferença em desenvolvimento autônomo.

---

# 42. Princípio de segurança

> **Nenhuma camada deve confiar que a camada anterior sempre estará correta.**

Exemplo:

```text
UI valida
  ↓
API valida
  ↓
Contrato valida
  ↓
Banco valida
  ↓
Auditoria registra
```

Isso cria defesa em profundidade.

---

# 43. Princípio de autoridade

Toda informação crítica deve possuir uma autoridade única.

Evitar múltiplas fontes da verdade.

Exemplo:

```text
Saldo
  → PostgreSQL

Status oficial de assinatura
  → PostgreSQL + provider reconciliado

Score produzido por IA
  → Python gera
  → banco registra versão/evidência

Estado de UI
  → TypeScript
```

---

# 44. Princípio de evidência

Processos críticos devem ser reproduzíveis ou auditáveis.

Registrar quando pertinente:

- input;
- versão;
- hash;
- timestamp;
- actor;
- correlation ID;
- algoritmo;
- output;
- provider;
- estado;
- erro;
- retry.

Especialmente para:

- contratos;
- assinaturas;
- orçamento;
- qualidade;
- financeiro;
- estoque;
- IA;
- documentos;
- auditoria.

---

# 45. Resumo executivo

A arquitetura proposta para expansão da Innov é:

```text
┌──────────────────────────────────────────┐
│ TypeScript                               │
│ Produto, UI, Web, Mobile, BFF            │
├──────────────────────────────────────────┤
│ PostgreSQL                               │
│ Verdade, integridade, segurança          │
├──────────────────────────────────────────┤
│ Go                                       │
│ Workers, filas, integrações, execução    │
├──────────────────────────────────────────┤
│ Python                                   │
│ IA, ML, CV, OCR, solvers                 │
├──────────────────────────────────────────┤
│ Rust                                     │
│ Hotspots extremos comprovados            │
└──────────────────────────────────────────┘
```

A Innov não deve perseguir uniformidade artificial de linguagem.

Deve perseguir:

- fronteiras claras;
- contratos fortes;
- autoridade única;
- validação determinística;
- baixa duplicação;
- alta observabilidade;
- evolução incremental;
- componentes substituíveis;
- segurança em profundidade.

---

# 46. Regra final

Antes de criar qualquer novo componente, responder:

```text
1. Isto pertence ao produto?
   → TypeScript

2. Isto protege uma invariante de dados?
   → PostgreSQL

3. Isto executa trabalho operacional/assíncrono?
   → Go

4. Isto exige IA, ML, CV ou ciência?
   → Python

5. Existe gargalo comprovado que exige desempenho extremo?
   → Rust

6. Nenhuma resposta é claramente "sim"?
   → Não adicionar nova tecnologia ainda.
```

---

## Conclusão

A configuração mais sustentável para a Innov é uma **arquitetura poliglota disciplinada**, e não um repositório poliglota livre.

O objetivo não é possuir muitas tecnologias.

O objetivo é fazer com que **cada tecnologia tenha uma função inequívoca**.

Assim, humanos e agentes LLM conseguem inferir rapidamente:

- onde implementar;
- qual linguagem usar;
- onde a regra deve viver;
- quais testes executar;
- qual camada é autoridade;
- quais componentes podem escalar separadamente.

Essa previsibilidade reduz regressões, reduz decisões arbitrárias de agentes, facilita manutenção e prepara a Innov para crescer de um monólito modular empresarial para uma plataforma com workers, IA, mobile offline, WMS, IoT e processamento avançado sem exigir uma reescrita total no futuro.
