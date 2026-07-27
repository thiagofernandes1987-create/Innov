# Acompanhamento a distância — saber o que acontece sem ir até lá

Documento canônico. Ditado pelo responsável em 27 de julho de 2026:

> "tipo o montador solicitar material que faltou ou enviar fotos do andamento,
> assim mesmo sem visitar a montagem, ou obra, os gerentes, diretores, cliente,
> sabem o que está acontecendo, você cria um sistema de acompanhamento a
> distância, como você não é humano, vou te falar sobre estudos, pessoas que são
> monitoradas e sabem que tem alguém acompanhando, costumam ser 30% mais
> efetivas, aumenta o desempenho pois estão sempre alertas, por isso temos
> notificações e alertas para as pessoas que são responsáveis e seguem o
> projeto"

Dissecado conforme a §1.5 do [`METODO-DE-TRABALHO.md`](METODO-DE-TRABALHO.md):
fluxo otimista, imprevistos com frequência, e para cada um o que trava, o que a
ferramenta precisa ter, quem é afetado, a quem se solicita e o que fica
registrado.

---

## §1 — A premissa, e o que a literatura de fato sustenta

**O mecanismo é real e a intuição está certa.** Quem sabe que o trabalho é
visto trabalha diferente. Isso não é folclore: é o efeito de qualquer
intervenção de feedback, e é a razão de existir de todo apontamento.

**A magnitude é que merece cuidado, e ela decide o desenho.** Na meta-análise
clássica de intervenções de feedback (Kluger & DeNisi, 1996, sobre centenas de
efeitos), o efeito médio é positivo e moderado — em torno de *d* = 0,41, o que
leva quem estava na mediana para perto do percentil 66. Mas o achado que importa
para nós é outro: **mais de um terço das intervenções de feedback *reduziu* o
desempenho.**

A direção média confirma a intuição. A variância diz que **o "como" decide o
sinal.** Feedback que aponta a pessoa piora; feedback que aponta a tarefa
melhora. Número que serve para ranquear gente produz gente otimizando o número;
número que serve para desbloquear trabalho produz trabalho desbloqueado.

Por isso este documento tem regras de desenho e não só de dado. Um sistema de
acompanhamento mal desenhado não é neutro — ele é ativamente pior que nenhum,
porque produz dado falso com aparência de dado bom, e decisão errada com
aparência de decisão fundamentada.

### As cinco regras que separam acompanhamento de vigilância

1. **O próprio profissional vê o número dele primeiro**, antes de qualquer
   gerente. Quem descobre o próprio indicador numa reunião aprende a gerenciar a
   reunião, não o trabalho.
2. **O indicador aponta a tarefa, não a pessoa.** "Esta atividade rendeu menos
   que a faixa" e não "fulano rende menos".
3. **Toda queda tem campo de motivo, e o motivo entra no número.** Sem isso, o
   sistema pune quem pegou chuva e premia quem escondeu problema.
4. **A janela esquece.** Seis meses móveis, como já fixado em
   [`KPIS.md`](KPIS.md) — sem esquecimento, a matriz vira condenação permanente,
   e ninguém melhora num sistema que não esquece.
5. **A visibilidade é de mão dupla.** Se o campo é visto pela gestão, a resposta
   da gestão às solicitações do campo também é visível — inclusive o prazo
   estourado. Acompanhamento que só olha para baixo é vigilância, e a resposta
   natural a vigilância é preencher bonito.

---

## §2 — A conta que justifica o sistema

### Evidência remota custa 390 vezes menos que ir ver

```
1 visita presencial: 48 km × R$ 2,30 + 3 h × R$ 85,00 = R$ 365,40
6 obras, 1 visita semanal cada                        = R$ 8.769,60/mês
3 fotos com legenda pelo montador: 75 s de parada     = R$      0,94
```

**390× mais barato, e chega no mesmo dia** — não na quinta-feira da visita.

Isso não elimina a visita: elimina a visita *de rotina*. Trocar uma visita
semanal por duas presenciais por mês economiza **R$ 4.384,80/mês** e melhora o
que sobra, porque quem vai já sabe o que foi ver.

### Avisar tudo é o mesmo que não avisar nada

Um gerente com 6 obras, 4 pessoas e 8 tarefas ativas por obra:

```
eventos brutos           : 2.640/mês  →  120 por dia útil
só as exceções           :   259/mês  →   11,8 por dia útil
redução                  : 90,2%
```

Ninguém lê 120 avisos por dia. Lê 12. **A regra é notificar por exceção: só o
que sai da faixa.** O resto fica no painel, para quem for procurar.

E o limite de tolerância a erro:

| Falso positivo | Alertas inúteis/mês | Confiança |
|---|---:|---|
| 5% | 12,9 | 95% |
| 20% | 51,7 | 80% |
| 50% | 129,4 | 50% |

**Acima de ~20% de falso positivo o alerta vira ruído** e passa a ser ignorado
inclusive nos dias em que estava certo. É o mesmo raciocínio já registrado em
`lib/casca/avisos.ts` sobre o badge que conta coisa inexistente: ensina o usuário
a ignorar o badge, e aí ele ignora também o dia em que a conta era verdadeira.

### Compressão no dispositivo não é economia, é viabilidade

```
foto original do celular  4,20 MB → 6,50 GB/mês → 78,0 GB/ano
comprimida 1600px q80     0,35 MB → 0,54 GB/mês →  6,5 GB/ano   (12×)

subir 3 fotos em 4G ruim (1,5 MB/s): original 8 s · comprimida 0,7 s
```

A janela do montador é de 15 minutos e a interação inteira precisa caber em
segundos. **Oito segundos esperando barra de upload é o que faz ele desistir e
preencher de cabeça no fim de semana** — e aí o sistema inteiro passa a operar
sobre memória em vez de evidência.

### Um evento interessa a até seis pessoas, com seis recortes diferentes

Montador, coordenador, planejador, gerente, diretor e cliente. **Mandar o mesmo
texto para os seis produz 6× o volume e 1× o valor.** Cada um recebe um nível de
agregação diferente do mesmo fato.

---

## §3 — A cadeia de evidência: quem produz, quem consome

| Quem | O que recebe | Quando | Agregação |
|---|---|---|---|
| **Montador** | O próprio número, antes de todo mundo | Ao apontar | Individual, do dia |
| **Coordenador** | Exceção da equipe dele | Na hora | Por equipe e obra |
| **Planejador** | O que muda a rede: `TEP` negativo, parada, troca de caminho crítico | Diário | Por tarefa |
| **Gerente** | Exceção consolidada, ~12/dia | Diário | Por obra |
| **Diretor** | Tendência e desvio de faixa | Semanal | Por carteira |
| **Cliente** | Avanço aprovado, foto liberada, marco batido | Semanal, e em marco | Por obra, filtrada |

**O cliente nunca recebe o cru.** Diário aprovado, foto marcada como liberada,
marco concluído. Não recebe parada, não recebe conflito interno, não recebe
`TEP` — porque cliente que vê discussão operacional sem contexto liga assustado,
e o custo disso cai no comercial.

### O que já existe

O portal do cliente **está construído**: `app/cliente/` já lê `client_visible`
em diário aprovado, mídia, tarefas, marcos e documentos liberados. E o esquema já
carrega o controle onde precisa:

- `daily_log_media` — `storage_path`, `sha256`, `caption`, `captured_at` e
  **`client_visible`**: a foto do campo já nasce sabendo quem pode vê-la;
- `daily_logs` — estado `DRAFT`/`SUBMITTED`/`APPROVED`/`REJECTED` com autor de
  cada transição. **Nada chega ao cliente sem aprovação**, e isso é lei do
  esquema, não disciplina;
- `daily_log_activities` — `progress_before`/`progress_after` por tarefa,
  datados pelo `log_date`;
- `project_progress_snapshots` — série datada de planejado × realizado;
- `audit_events` — quem fez o quê.

**O que falta é o empurrão.** Hoje tudo é *pull*: quem quer saber precisa abrir a
tela. Não existe tabela de notificação, não existe assinatura — "quem segue o
quê" — e não existe entrega. É essa a lacuna inteira.

---

## §4 — Fluxo otimista

| Momento | O que acontece | Quem fica sabendo |
|---|---|---|
| 07:30 | Montador faz check-in dentro do raio | Ninguém — normal não vira alerta |
| 16:45 | Diário com 3 fotos, `DEPT` = previsto | Coordenador vê no painel |
| 17:10 | Coordenador aprova o diário | Cliente passa a ver o resumo e as fotos liberadas |
| 18:00 | Snapshot do dia grava planejado × realizado | Curva do planejador |
| Sexta | Resumo semanal ao cliente e ao diretor | Um e-mail, não trinta |

**Nada de excepcional gera notificação.** É a regra que mantém os 12 alertas por
dia legíveis.

## §5 — Fluxo pessimista: o que quebra num sistema de acompanhamento

### RA1 — Alerta demais, e todos passam a ser ignorados · alto

**O que trava.** A confiança no canal. E o dano é assimétrico: recuperar
credibilidade de alerta custa muito mais que perdê-la.

**O que a ferramenta precisa ter.** Notificação **por exceção** com faixa
derivada do histórico; teto diário por pessoa, com o excedente virando resumo em
vez de itens; e agrupamento por obra — cinco eventos da mesma obra são um aviso,
não cinco.

**Afeta.** Todos os que recebem.

**A quem se solicita.** Ninguém — é decisão de projeto. Mas o **falso positivo
por tipo de alerta precisa ser medido**, e tipo que passa de 20% é desligado até
ser corrigido.

**Fica registrado.** Alerta enviado, aberto, e ação tomada. Alerta que ninguém
abre há um mês é alerta que não deveria existir.

### RA2 — A foto vira teatro · média

**O que trava.** Nada visivelmente — e é o pior caso. O mesmo canto fotografado
todo dia satisfaz a regra e não informa nada. O sistema fica verde sobre uma obra
parada.

**O que a ferramenta precisa ter.** Foto amarrada **à tarefa**, não ao dia;
`captured_at` do arquivo comparado com a hora do envio, para distinguir foto de
hoje de foto da galeria; e legenda obrigatória curta, porque descrever obriga a
olhar.

**Afeta.** Planejamento e gestão, que decidem sobre ficção.

**A quem se solicita.** Coordenador confere por amostragem. **Prazo: semanal.**

**Fica registrado.** Data de captura e data de envio, separadas. Elas divergirem
não é fraude — é sinal para olhar.

### RA3 — O número vira meta e o comportamento se adapta · alta

**O que trava.** A veracidade de tudo. É a lei de Goodhart em ação: `DEPT`
preenchido pelo que fica bonito, progresso que só sobe, nunca uma revisão para
baixo.

**O que a ferramenta precisa ter.** Detecção do padrão — progresso monotônico
com variância zero, sempre redondo, sempre igual ao planejado; **`TEP` negativo
tratado como informação e não como falta**, com motivo que entra no número; e
correção que **não sobrescreve o original**, para que revisar para baixo seja
barato e honesto.

**Afeta.** Planejamento, Comercial (que promete data com base nisso), Financeiro
(que fatura por medição).

**A quem se solicita.** Coordenador conversa — não é caso de ferramenta punir.
**Prazo: na semana.**

**Fica registrado.** Série completa, com as revisões visíveis. Progresso que
nunca desce em obra nenhuma é o indicador mais confiável de que o apontamento é
inventado.

### RA4 — O cliente vê algo que assusta sem contexto · média

**O que trava.** A relação, e o telefone do vendedor toca. Foto de instalação
pela metade parece defeito para quem não sabe que aquilo é uma etapa.

**O que a ferramenta precisa ter.** `client_visible` **como decisão explícita de
quem aprova**, nunca como padrão; legenda obrigatória no que vai para o cliente;
e o diário aprovado como única porta — o rascunho não vaza.

**Afeta.** Comercial, Coordenação, Assistência.

**A quem se solicita.** Coordenador aprova o que o cliente vê. **Prazo: no dia**
— diário aprovado com três dias de atraso já não serve para acompanhar.

**Fica registrado.** Quem liberou cada peça de conteúdo. `daily_logs` já grava
`approved_by` e `approved_at`.

### RA5 — Vira vigilância, e o efeito inverte · média, e a mais cara

**O que trava.** A verdade do dado, e depois a permanência das pessoas. Equipe
que se sente vigiada preenche o que protege, não o que informa — e é exatamente
o terço de intervenções de feedback que **piora** o desempenho na §1.

**O que a ferramenta precisa ter.** As cinco regras da §1 implementadas e não
só escritas: o próprio número primeiro; indicador na tarefa e não na pessoa;
motivo que conta; janela que esquece; e **a resposta da gestão às solicitações
do campo visível também**, com o prazo estourado aparecendo.

**Afeta.** RH, Coordenação, e o custo de rotatividade — que numa equipe treinada
é maior que qualquer ganho de produtividade que o painel prometa.

**A quem se solicita.** É decisão de direção, não de produto. Mas o produto pode
tornar a versão errada difícil de construir, e é isso que estas regras fazem.

**Fica registrado.** Tempo de resposta **da gestão** às solicitações do campo,
publicado do mesmo jeito que o `TEP`. Se o painel cobra o campo em 15 minutos e a
gestão responde em três dias, o campo aprende o que o sistema realmente vale.

### RA6 — Notificação fora do horário de trabalho · alta

**O que trava.** O descanso, e a jornada — que aqui não é preferência, é regra
trabalhista, e o registro de ponto está no mesmo sistema.

**O que a ferramenta precisa ter.** Janela de silêncio por perfil, respeitando o
regime de trabalho que o calendário já conhece; e uma classe de urgência,
estreita e nominal, que atravessa — para não haver a tentação de marcar tudo como
urgente.

**Afeta.** RH e jurídico trabalhista.

**Fica registrado.** Envio fora de janela, com autorização de quem mandou.

### RA7 — Obra sem sinal · alta

**O que trava.** A produção do dado no momento em que ele vale. Obra em subsolo,
condomínio novo, interior — sinal ruim é a regra, não a exceção.

**O que a ferramenta precisa ter.** Fila local com envio quando houver sinal, e o
estado **visível ao montador**: "3 registros aguardando envio". Calculado, 7 dias
de fila são 168 registros e 29,4 MB por equipe — cabe com folga, e 7 dias é o
teto razoável, porque acima disso o dado já envelheceu e o problema é outro.

E a regra que evita o pior: **check-in e check-out gravam a hora do dispositivo
com a hora do servidor**, para que sincronizar tarde não vire fraude de ponto nem
acusação de fraude.

**Afeta.** Financeiro (folha), Campo.

**Fica registrado.** Hora do evento, hora do envio, e as duas visíveis.

### RA8 — Localização é dado pessoal · alta

**O que trava.** Nada, até virar processo. Localização de trabalhador é dado
pessoal sensível pelo uso, e ponto eletrônico tem regramento próprio.

**O que a ferramenta precisa ter.** Localização coletada **só no check-in e no
check-out**, nunca contínua; finalidade declarada ao trabalhador; retenção com
prazo; e acesso restrito a quem processa folha. Rastreamento durante a jornada
não é acompanhamento — é outra coisa, e não é o que foi pedido.

**Afeta.** RH, Jurídico, Financeiro.

**Fica registrado.** Consentimento, finalidade e todo acesso ao histórico de
localização — `audit_events` já serve.

### RA9 — A pessoa certa não recebe porque ninguém a inscreveu · média

**O que trava.** O acompanhamento inteiro, silenciosamente. Diretor que "achava
que estava vendo" e não estava é a falha mais comum deste tipo de sistema.

**O que a ferramenta precisa ter.** **Seguir** como ato explícito, com quem segue
o quê visível na própria obra; inscrição automática por papel — responsável,
gerente da obra, planejador — e a lista de seguidores exibida, para que a
ausência de alguém seja notada por quem olha.

**Afeta.** Todos.

**Fica registrado.** Quem seguia o quê e desde quando. Sem isso, "ninguém me
avisou" não tem resposta.

---

## §6 — O que este documento obriga

1. **Notificar por exceção.** Normal não avisa. 12 por dia, não 120.
2. **Falso positivo medido por tipo de alerta**, e tipo acima de 20% é desligado
   até ser corrigido.
3. **Um fato, seis recortes.** Cada papel recebe sua agregação; ninguém recebe o
   texto do outro.
4. **O cliente só vê o aprovado**, com legenda, e `client_visible` é decisão
   explícita de quem aprova.
5. **O profissional vê o próprio número primeiro.**
6. **A resposta da gestão é medida e publicada** como o desempenho do campo.
7. **Foto amarrada à tarefa**, comprimida no dispositivo, com hora de captura e
   hora de envio separadas.
8. **Fila offline de 7 dias**, com estado visível.
9. **Localização só no check-in e no check-out**, com finalidade e prazo de
   retenção.
10. **Seguir é explícito e visível**, com inscrição automática por papel.
