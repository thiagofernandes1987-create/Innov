# ADR-0001 — Em que linguagem construir a camada de execução assíncrona

**Documento canônico:** sim
**Estado:** **ratificada em 10/08/2026, na opção 4 — serviço em Go.** Por instrução direta do proprietário arquitetural: *"inicie as conversões dos códigos para Go, Typescript, Python e Rust conforme nosso mapa"*. A §37 do [`MAPA-TECNOLOGICO.md`](./MAPA-TECNOLOGICO.md) está satisfeita: a linguagem entra **com** ADR, e a T-43.3 está liberada.

> **A decisão não seguiu a recomendação deste documento, e isso fica registrado em vez de apagado.** A §15 recomendava a **opção 3** — TypeScript agora, Go por gatilho medido —, porque nenhuma medição sustenta Go neste volume: a CPU é 0,03% de um job e o Node tem 57× de folga. O proprietário decidiu pela **opção 4**, que a §4 desta ADR já registra como *"tecnicamente adequada e 4,26× mais folgada"*. A §43 do mapa faz dele a autoridade da decisão de arquitetura, e o papel desta ADR era dar o número, não dar a palavra final.
>
> O que **permanece válido e não deve ser esquecido na implementação**: o ganho não virá de velocidade, então otimizar o worker Go por instinto de desempenho é trabalho perdido — o gargalo é rede. E a pergunta da §15 que continua aberta é a de volume multi-tenant; se ela for respondida em ordem de grandeza muito acima do medido, esta decisão fica **mais** justificada, não menos.
**Cumpre:** T-43.2 da S-43 — os doze itens da §37, com o benchmark que a §39 exige.
**Depende de:** [`WORKERS.md`](./WORKERS.md) (T-43.1), que estabeleceu que a camada não existe.
**Reprodução das medições:** [`benchmarks/camada-de-execucao/`](../benchmarks/camada-de-execucao/)

---

## 1. A pergunta, decomposta

O mapa trata isto como uma pergunta só — *"introduzir Go; migrar workers apropriados"* (§36, Fase 2). São **duas**, e elas têm respostas diferentes:

> **A.** A camada de execução deve sair do ciclo da requisição e virar processo próprio?
> **B.** Em que linguagem ela deve ser escrita?

Enquanto seguem juntas, a resposta converge para o genérico: "Go é bom para workers" responde B sem ter medido A, e "os workers estão lentos" responde A sem ter medido B. Separadas, cada uma tem um critério objetivo no próprio mapa — a **A** tem os dez critérios de extração da §4; a **B** tem a §39, a §40 e a §24.

**Resposta antecipada, para quem lê só esta seção:**

| | Decisão | Base |
| --- | --- | --- |
| **A** | **Sim, sem condição.** Extrair. | §4, critérios 3, 4, 7 e 8 — atendidos e medidos |
| **B** | **TypeScript agora; Go por gatilho medido.** | §39 — nenhuma medição sustenta Go neste volume |

A justificativa de B é o corpo deste documento, e ela **contraria a leitura literal da §7.4 e da §36**. É por isso que a §37 exige ADR: para que a divergência apareça com número, e não por omissão.

---

## 2. Problema (§37.1)

A [T-43.1](./WORKERS.md) mediu o estado: **a camada de execução assíncrona foi desenhada no banco e nunca construída no runtime.** Fila de entrada, fila de saída ordenada, circuitos, baldes de taxa, reconciliação e funções de reivindicação com trava — tudo existe no esquema. Nada drena.

O custo disso é observável, e não é hipotético:

- **quatro rotas do SINAPI declaram `maxDuration = 300`.** Cinco minutos de requisição para trabalho que não pertence ao ciclo da web;
- **o CUB do Sinduscon já esbarra no teto de 60 s** da plataforma;
- **o único despacho de fato assíncrono roda dentro do request do usuário** (`claim_whatsapp_outbound_dispatch`, em `app/actions/whatsapp.ts`), o que significa que uma falha do provedor vira uma requisição pendurada;
- **os validadores conferem o artefato, não o efeito** — confirmam que o nome da RPC aparece no texto da migration, sem nunca chamá-la. VACINA-057 em escala maior.

O problema, portanto, não é *desempenho de linguagem*. É **ausência de processo**.

---

## 3. Medição (§39)

A §39 é explícita: *"Não otimizar por intuição"*, e *"a escolha de Go ou Rust nunca deve ser justificada apenas pela reputação de desempenho da linguagem"*. O que segue foi executado nesta máquina — 4 núcleos, 16 GB, Go 1.24.7, Node 22.22.2.

### 3.1 Custo de CPU por job

Modela o que o despacho faz de verdade: serializar o envelope, SHA-256 do corpo, HMAC-SHA256 da carga canônica — exatamente `security.ts`. Envelope real de **1.224 bytes**, 200.000 jobs, com aquecimento.

| Etapa | Node (ns/job) | Go, struct (ns/job) | |
| --- | ---: | ---: | --- |
| serialização | 2.649 | 2.826 | Node 1,07× |
| criptografia | 9.381 | 5.890 | **Go 1,59×** |
| **job completo** | **13.174** | **9.105** | **Go 1,45×** |

**Controle de validade:** as duas implementações produzem corpo de 1.224 bytes e HMAC **byte a byte idêntico** (sumidouro 213 e 241 nos dois runtimes). Não é comparação nominal — é o mesmo trabalho.

E o número que mais importa desta tabela não está nela:

> A primeira versão em Go usava `map[string]any` e custou **19.464 ns/job** — **mais lenta que o Node**. A versão com struct tipada custa 9.105 ns. **2,14× de diferença dentro da mesma linguagem, só pela forma de escrever** — mais do que os 1,45× entre as duas linguagens.

Escolher a linguagem não compra desempenho. Escrever bem compra.

### 3.2 O teste que decide: CPU contra I/O

Um job de despacho faz de 2 a 4 idas à rede. Contra um round-trip de 40 ms:

| Round-trip do provedor | CPU como fração do job (Node) | Ganho **total** do Go |
| --- | ---: | ---: |
| 40 ms | 0,0329 % | 0,0102 % |
| 100 ms | 0,0132 % | 0,0041 % |
| 200 ms | 0,0066 % | 0,0020 % |

Em volume:

| Mensagens/dia | CPU/dia, Node | CPU/dia, Go | Diferença |
| ---: | ---: | ---: | ---: |
| 10.000 | 0,13 s | 0,09 s | 0,04 s |
| 100.000 | 1,32 s | 0,91 s | **0,41 s** |

**A 100 mil mensagens por dia, trocar Node por Go economiza 0,41 segundo de CPU por dia.** Este é o fim do argumento de desempenho por job.

### 3.3 Concorrência — onde a diferença é real

Aqui Go ganha de verdade. Provedor falso com latência fixa de 40 ms; cliente mantendo K jobs em voo, cada um assinado; RSS de pico lido de `/proc/self/status`.

| K em voo | jobs | Node (jobs/s) | Go (jobs/s) | RSS Node | RSS Go |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | 5.000 | 1.493 | 1.533 | 75 MB | 14 MB |
| 256 | 5.000 | 4.447 | 5.582 | 87 MB | 24 MB |
| 1.024 | 20.000 | 6.999 | 19.943 | 125 MB | 67 MB |
| 2.048 | 20.000 | **6.549** | 25.334 | 187 MB | 122 MB |
| 2.048 | 40.000 | — | **27.884** | — | 129 MB |
| 4.096 | 20.000 | — | 20.212 | — | 223 MB |

Duas leituras, e a segunda é a que costuma ser omitida:

1. **O Node satura em ~6.500–7.000 jobs/s e piora ao receber mais concorrência** (6.549 em K=2048, abaixo dos 6.999 em K=1024), enquanto a memória cresce. Ele sustenta ~262 jobs realmente em voo por mais que se peça. Go chega a 27.884 — **4,26×**;
2. **memória por job em voo é praticamente igual**: Node 61,5 kB, Go 55,4 kB. A vantagem do Go é de **base fixa** (75 MB contra 14 MB, 5,4×), não de escala por job. A narrativa de "goroutine é barata, promessa é cara" **não se confirmou** neste payload.

Go em K=4096 rendeu menos que em K=2048, o que indica teto do próprio cliente e não do provedor falso — que consumiu ~22% de um núcleo.

### 3.4 Partida e artefato de deploy

20 execuções de cada, medianas:

| | Node | Go | |
| --- | ---: | ---: | --- |
| partida a frio | 48,1 ms | 3,1 ms | **15,5×** |
| artefato de deploy | 582 MB (`node_modules`) | 2,11 MB (binário) | **264×** |

### 3.5 A conclusão que a §39 obriga

O fluxo da §39 é *medir → identificar gargalo → benchmark → otimizar arquitetura → medir de novo → **somente então** trocar tecnologia*. O gargalo identificado é a **ausência de processo**, não a linguagem. E o dimensionamento fecha a questão:

| Volume | Média | Rajada de 100× | Folga do Node |
| --- | ---: | ---: | ---: |
| 10.000 msgs/dia | 0,12/s | 12/s | **566×** |
| 100.000 msgs/dia | 1,16/s | 116/s | **57×** |
| 1.000.000 msgs/dia | 11,6/s | 1.157/s | **6×** |

Saturar o Node exige **6.549 jobs/s sustentados** — 566 milhões de mensagens por dia. A Innov atende uma organização.

**Nenhuma medição sustenta a troca de linguagem neste volume.** Sustentam a extração do processo, que é a decisão A.

---

## 4. Alternativas avaliadas (§37.2)

| # | Alternativa | Por que não é a recomendada |
| --- | --- | --- |
| 1 | **Manter dentro do request** (estado atual) | Reprovada pela §5.5 e pelos fatos da §2: quatro rotas pedindo 300 s, uma já no teto de 60 s, falha de provedor pendurando requisição. Não atende ao critério 3 da §4 — a fila precisa drenar mesmo com a aplicação web indisponível |
| 2 | **`pg_cron` chamando as RPCs** | Resolve o agendamento, não a execução: `pg_cron` roda dentro do Postgres, e despacho HTTP a provedor externo a partir do banco confunde autoridade (§43) e coloca I/O de rede no processo mais caro de escalar |
| 3 | **Serviço em TypeScript** (recomendada) | — |
| 4 | **Serviço em Go** | Tecnicamente adequada e 4,26× mais folgada. Não é recomendada **agora** porque nenhuma medição a exige neste volume, e ela cobra segunda linguagem: segundo pipeline de CI (§24 define seis portões só para Go), segunda política de dependências (§38), e duplicação do contrato do envelope entre TS e Go, que é exatamente o que a §27 proíbe |
| 5 | **Temporal / workflows duráveis** | §29 — não introduzir por antecipação. As filas já existem no Postgres, com trava e ordenação; a §12.1 manda usar a solução próxima ao Postgres enquanto ela atender ao volume, e ela atende com 57× de folga |
| 6 | **Kafka / NATS** | §12.2 lista as condições, e nenhuma se aplica: não há throughput alto, nem múltiplos consumidores independentes, nem replay de grande volume |

---

## 5. Por que a stack existente atende (§37.3)

Ela atende ao **volume** e não atende ao **modelo de execução**. A distinção é a decisão A contra a decisão B:

- **não atende** ao modelo: Next.js na Vercel é um runtime de requisição, com teto de 60 s no cron e 300 s na rota. Processo que drena fila continuamente não cabe nele — por isso a decisão A é extrair, e é incondicional;
- **atende** ao volume: 6.549 jobs/s medidos contra uma necessidade de ~1,16/s a 100 mil mensagens/dia;
- **atende** ao reuso: o serviço em TypeScript compartilha os contratos, os tipos do envelope, o cliente Supabase e `lib/messaging/` **sem duplicar domínio** (§27). O `apps/messaging-gateway` já é serviço isolado em TypeScript e prova a fronteira de processo.

---

## 6. Impacto operacional (§37.4)

Igual nas duas linguagens, porque decorre da decisão A: um alvo de deploy novo, fora da Vercel, com processo de vida longa, saúde, reinício e escala.

Onde diferem, com número medido:

| | TypeScript | Go |
| --- | --- | --- |
| artefato | 582 MB | 2,11 MB |
| partida a frio | 48,1 ms | 3,1 ms |
| RSS base por instância | 75 MB | 14 MB |
| teto medido | 6.549 jobs/s | 27.884 jobs/s |

A diferença de artefato e de partida é grande em proporção e pequena em consequência: um processo de vida longa parte uma vez por deploy. **Ela deixa de ser pequena** se a camada virar muitas instâncias pequenas com escala a zero — e é por isso que isso vira gatilho na §12.

---

## 7. Impacto em CI/CD (§37.5)

O ponto mais caro do Go, e o mais fácil de subestimar.

- **TypeScript:** nenhum portão novo. `pnpm lint`, `typecheck`, `test` e os 51 validadores já cobrem o diretório;
- **Go:** a §24 exige seis portões próprios — `gofmt`, `go vet`, `staticcheck`, `golangci-lint`, `go test ./...`, `go test -race ./...` — mais toolchain no runner, cache de módulos e uma política de dependências separada (§38).

Um dado medido a favor do Go, registrado por honestidade: no experimento anterior desta sprint, `go build` e `go vet` passaram sobre código com defeito e **`staticcheck` pegou** (`U1000`). O compilador como parte da supervisão do LLM (§7.3) é real.

Ele é, porém, **menos decisivo neste repositório do que seria em outro**: o `strict` do TypeScript, o `noUnusedLocals`/`noUnusedParameters` adotados na S-38, o detector de exports mortos, o teto de asserções fracas e os 54 validadores já ocupam esse papel. O ganho marginal do compilador do Go aqui é menor do que a §7.3 sugere no caso geral.

---

## 8. Impacto em segurança (§37.6)

- **A favor do Go:** 2,11 MB de binário estático contra 582 MB de `node_modules` é redução real de superfície de suprimento (§38, §42). Menos dependência transitiva, menos CVE herdada;
- **A favor do TypeScript:** a assinatura HMAC, a guarda de repetição e a validação de identidade **já existem, testadas**, em `apps/messaging-gateway/src/security.ts`. Reescrevê-las em Go é reescrever código criptográfico que hoje passa — e código criptográfico reescrito é onde defeito de segurança nasce;
- **Igual nos dois:** o segredo de assinatura, o isolamento de rede e o princípio de que a camada não recebe privilégio de banco além do necessário para reivindicar e confirmar.

O saldo favorece adiar o Go: a redução de superfície é ganho permanente e disponível a qualquer momento; a reescrita de cripto é risco pago uma vez, e não há motivo para pagá-lo antes de precisar.

---

## 9. Impacto em contratação e manutenção (§37.7)

Segunda linguagem custa em três lugares — quem escreve, quem revisa e quem é acordado às 3 h. Hoje a plataforma é mantida por sessões assistidas sobre um repositório em TypeScript, com as diretrizes, as vacinas e os 51 validadores todos escritos para ele.

A §40 manda considerar desempenho **junto** de manutenção, testabilidade, segurança, observabilidade, facilidade para LLM, ecossistema e custo operacional, e diz: *"a melhor tecnologia não é a mais rápida isoladamente"*. Das oito dimensões, Go ganha em desempenho e custo operacional, empata em testabilidade e segurança, e perde em manutenção e ecossistema **neste repositório específico** — porque tudo que existe está do outro lado.

---

## 10. Impacto em LLM/vibecoding (§37.8)

Argumento genuíno dos dois lados, e o número da §3.1 é o que o resolve:

> **2,14× de variação dentro do próprio Go, só pela forma de escrever, contra 1,45× entre as duas linguagens.**

O `map[string]any` é exatamente o que um agente escreve quando quer passar rápido — é o caminho de menor resistência, e é 2,14× mais lento que o idiomático. **A linguagem não protege contra código medíocre; o portão protege.** Vale para as duas, e reforça a §41: a decisão que importa para vibecoding é a estrutura de verificação, não a sintaxe.

---

## 11. Estratégia de testes (§37.9)

Independente da linguagem, e herdada de [`PROVA-POR-SABOTAGEM.md`](./PROVA-POR-SABOTAGEM.md): **portão que nunca foi visto reprovando não foi provado.** Para esta camada, isso significa provar, com os três estados:

1. **a fila drena** — reivindicar, despachar, confirmar; sabotagem: desligar o consumidor e medir que a fila **cresce**, porque hoje ela cresceria em silêncio;
2. **ordem é respeitada** — `claim_ordered_channel_outbox_events` existe para isso; sabotagem: embaralhar o número de sequência e medir a reprovação;
3. **reexecução não duplica** — os quatro workers reais já são idempotentes por mecanismos distintos (WORKERS.md §4); sabotagem: entregar o mesmo job duas vezes e medir que o efeito ocorre **uma**;
4. **o validador chama a RPC, não procura o nome dela na migration.** É a correção direta da VACINA-057, e é o item que não pode faltar: foi assim que quatro filas ficaram sem consumidor com a bateria verde.

Se a camada for em Go, acrescentam-se os fixtures canônicos da §26 — TypeScript e Go implementando o mesmo contrato **sobre os mesmos arquivos de exemplo**, para que a divergência semântica apareça em teste.

---

## 12. Estratégia de rollback (§37.10)

O que torna esta decisão barata de errar, e é a razão de recomendar começar por TypeScript sem fechar a porta do Go:

**a fronteira é a fila, não a linguagem.** O contrato da camada são as RPCs de reivindicação e confirmação, que já existem no banco e não mudam. Trocar o consumidor é trocar quem chama `claim_*` — e os dois podem coexistir durante a troca, porque a reivindicação tem trava e o efeito é idempotente.

- **rollback da decisão A:** desligar o consumidor. As filas voltam a acumular, que é o estado de hoje. Sem perda de dado;
- **rollback da decisão B:** rodar o consumidor Go ao lado do TypeScript, mover a taxa gradualmente, e desligar o que perder. A trava impede entrega dupla — o mecanismo já está no banco.

Construir em TypeScript **não é trabalho jogado fora** se o Go vier depois: o que se constrói primeiro é o desenho da camada — semântica de reivindicação, política de retentativa, limite de taxa, reconciliação, observabilidade. Isso é o caro, e é independente de linguagem.

---

## 13. Proprietário arquitetural (§37.11)

**Thiago Fernandes**, como autoridade única da decisão de arquitetura (§43). Esta ADR é proposta; a ratificação é dele, e a T-43.3 fica bloqueada até lá.

---

## 14. Critérios para remover a tecnologia no futuro (§37.12)

Se o Go entrar, sai quando **qualquer** destes for verdadeiro por dois trimestres seguidos:

1. o volume real ficar abaixo de 10% do teto medido do TypeScript — ou seja, abaixo de 655 jobs/s sustentados —, tornando a segunda linguagem custo sem contrapartida;
2. o custo de manter os seis portões da §24 e os fixtures da §26 superar, em tempo de sessão, o que a camada economiza em operação;
3. o contrato do envelope divergir entre TS e Go em produção mais de uma vez — sinal de que a §27 está sendo violada na prática, e não só no papel.

---

## 15. Decisão proposta

### A — Extrair a camada de execução. **Sim, incondicional.**

Atende aos critérios da §4: **3** (precisa funcionar com a aplicação web indisponível), **4** (ciclo de deploy próprio), **7** (trabalhos de longa duração — quatro rotas pedindo 300 s) e **8** (concorrência significativa). A §4 diz que basta haver motivo técnico mensurável; há quatro.

### B — Construir em **TypeScript**, com gatilho medido para Go.

Porque a §39 não admite trocar tecnologia sem medição, e a medição diz o contrário do esperado: 0,41 s de CPU por dia a 100 mil mensagens/dia, e 57× de folga no teto.

**Gatilhos que abrem o Go automaticamente** — qualquer um basta, e cada um é um número, não uma impressão:

| # | Gatilho | Medida |
| --- | --- | --- |
| 1 | demanda sustentada acima de **1.000 jobs/s** | 15% do teto medido do Node, o que deixa margem para construir antes de doer |
| 2 | trabalho **ligado a CPU**, não a I/O — transcodificação de mídia, parsing de arquivo grande | quando a CPU passar de 20% do tempo do job, e não os 0,03% de hoje |
| 3 | mais de **8 instâncias** da camada simultâneas | 75 MB × 8 = 600 MB só de base; o binário de 14 MB passa a valer o custo |
| 4 | escala a zero com partida a frio no caminho crítico | os 48,1 ms viram latência do usuário, e não custo de deploy |

Enquanto nenhum ocorrer, **manter uma linguagem** é o que a §40 recomenda quando as outras sete dimensões pesam contra a única em que o Go ganha.

### O que esta proposta assume, e que pode derrubá-la

Que o volume da Innov permanece na ordem de grandeza de uma organização. **Se houver projeção comercial de multi-tenant com dezenas de milhares de mensagens por hora, o gatilho 1 já está atingido no papel e a decisão B se inverte** — e essa é informação que a sessão não tem. É a pergunta que a ratificação precisa responder.

---

## 16. Conflito registrado com o mapa

Esta ADR **contraria a leitura literal** da §7.4 (*"Go para: fila de mensagens, envio, retry, rate limiting, reconciliação"*) e da §36 (*"Fase 2: introduzir Go"*).

Contraria porque outras seções do mesmo mapa, aplicadas aos números medidos, apontam para o outro lado: a §39 (não trocar sem medir), a §4 (permanecer no monólito modular sem motivo mensurável), a §40 (custo total, não velocidade isolada) e a §44 (evidência).

O mapa tem uma tensão interna e esta não é a primeira: a T-43.4 já registra que a §21 põe Go em 52,3% das linhas enquanto a §33 pede 5–15%. A §37 existe para que esse tipo de conflito seja resolvido **com número e por escrito**, e não por qual seção alguém citou primeiro. A decisão de ratificar ou recusar é do proprietário arquitetural.
