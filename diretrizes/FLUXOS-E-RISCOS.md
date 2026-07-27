# Fluxos e riscos — o que acontece quando o dia não corre como o previsto

Documento canônico. Nasce da crítica de 27 de julho de 2026:

> "levante todas hipóteses, como as coisas funcionam na realidade, como seriam
> os fluxos, quais seriam os imprevistos, ou seja um fluxo de trabalho otimista,
> um pessimista (o que pode dar de problema, o que poderia realmente atrapalhar
> uma atividade, e se atrapalhasse o que eu precisaria ter disponível na
> ferramenta, quais departamentos isso afetaria e a quem eu precisaria realizar
> uma solicitação para resolver), isso é dissecar o problema, isso é levantar os
> riscos, você continua sendo muito superficial"

`PERSONAS-E-ROTINAS.md` diz o que cada pessoa **sabe**. Este diz o que acontece
quando o dia dela **quebra** — e é daqui que sai quase todo campo que a
plataforma precisa ter e que nenhuma lista de funcionalidade produziria.

O procedimento está na §1.5 de [`METODO-DE-TRABALHO.md`](METODO-DE-TRABALHO.md).
Cada imprevisto responde às cinco perguntas: **o que trava**, **o que a
ferramenta precisa ter naquele momento**, **qual departamento é afetado**, **a
quem se solicita e em que prazo**, e **o que fica registrado**.

---

## §0 — Por que o caminho feliz não é o caso normal

Oito imprevistos independentes de um dia de montagem, com a frequência que a
operação reconhece:

| Imprevisto | Frequência |
|---|---|
| Obra sem energia, andaime ou bancada ocupada | 8% |
| Medida em obra diferente do projeto | 12% |
| Peça faltando ou trocada no romaneio | 10% |
| Ferragem errada ou insuficiente | 7% |
| Acesso bloqueado — elevador, portaria, síndico | 6% |
| Cliente ausente, ou muda de ideia no local | 5% |
| Outra equipe ocupando o ambiente | 9% |
| Chuva ou condição que impede a etapa | 4% |

```
P(nenhum imprevisto no dia)      = 52,9%
P(pelo menos um)                 = 47,1%
imprevistos esperados por dia    = 0,61
P(montagem de 5 dias sem nenhum) =  4,1%
```

**Quem desenha só o caminho feliz desenha para metade dos dias, e para uma
montagem em vinte e cinco.** Esta é a frase que justifica o documento inteiro.

E o teste de honestidade da lista: se `P(dia limpo)` der alto, a lista está
incompleta, não a operação é boa.

## §0.1 — As três leis de custo que ordenam tudo o que vem abaixo

Não são opinião: são as contas que decidem qual trava vale a pena.

### Lei 1 — o erro fica 700 vezes mais caro conforme desce a cadeia

Mesma medida errada, descoberta em estágios diferentes:

| Descoberto em | Fator | Custo | Atraso |
|---|---:|---:|---:|
| Medição em obra | 1× | R$ 90 | 0,5 h |
| Projeto executivo | 10× | R$ 900 | 2 h |
| Plano de corte | 30× | R$ 2.700 | 4 h |
| Fabricação | 100× | R$ 9.000 | 16 h |
| **Montagem na casa do cliente** | **300×** | **R$ 27.000** | **40 h** |
| Pós-entrega / assistência | 700× | R$ 63.000 | 72 h |

Por isso a trava mais barata do sistema inteiro é **conferência de medida antes
de liberar fabricação**: ela custa meia hora e evita quarenta.

### Lei 2 — equipe parada custa R$ 942,40 por dia queimado

Equipe de quatro (líder, dois montadores, ajudante): **R$ 104,00 por hora
parada**. Oito horas são R$ 832,00, mais R$ 110,40 de deslocamento perdido —
**R$ 942,40** por dia em que a equipe foi e não produziu.

É o número que transforma "faltou uma peça" de aborrecimento em prejuízo
contabilizado, e é o que dá peso à solicitação de insumo quando ela disputa
prioridade com outra.

### Lei 3 — conferir antes de expedir economiza 4 dias por ocorrência

Prazo real de reposição de uma peça, etapa por etapa:

```
detectar e registrar        0,5    acum 0,5
aprovar a solicitação       1,0    acum 1,5
conferir estoque            0,5    acum 2,0
comprar / acionar fábrica   2,0    acum 4,0
produção da peça            3,0    acum 7,0
expedição                   1,0    acum 8,0
transporte                  1,0    acum 9,0
```

**9 dias úteis** se o erro só aparece no dia da montagem. Se o romaneio é
conferido na expedição, o mesmo erro custa **5 dias** — porque detectar,
aprovar, conferir estoque e acionar já aconteceram antes de o caminhão sair.
**4 dias economizados por ocorrência**, e a 10% de frequência isso é o
equivalente a meio dia por montagem.

Ninguém promete 9 dias ao cliente. Prometem "uns 3". A diferença entre os dois
números é a origem da maior parte das brigas de pós-venda.

---

# P3 — Montador: dissecação do dia de campo

A persona com mais imprevistos, mais dinheiro em jogo por hora e menos tempo de
tela. Vai primeiro.

## Fluxo otimista — o dia que corre limpo (52,9%)

| Hora | Passo | Na ferramenta |
|---|---|---|
| 07:20 | Chega na obra, confere endereço e acesso | — |
| 07:30 | **Check-in** com localização | 1 toque, confirmação antes de gravar |
| 07:35 | Abre a tarefa do dia, vê o que fazer e em quantos dias | Tarefa com `DPPT`, escopo e projeto anexo |
| 07:40 | Confere o romaneio contra o que chegou | Lista de peças com foto de referência |
| 07:50–11:50 | Executa | Telefone no bolso |
| 12:50–16:45 | Executa | Telefone no bolso |
| **16:45** | **Janela dos 15 minutos**: diário, fotos, dias que faltam | Notificação abre com o que falta preenchido |
| 17:00 | **Check-out** | 1 toque |

Três interrupções no dia inteiro: check-in, janela final, check-out. **Nada
mais** — o aplicativo interrompe o trabalho, não acompanha o trabalho.

## Fluxo pessimista — cada imprevisto dissecado

### R3.1 — Medida em obra diferente do projeto · 12%

**O que trava.** A peça não entra. Insistir arruína a peça e transforma um erro
de R$ 900 (projeto) num de R$ 27.000 (montagem) — Lei 1. A atividade **para**.

**O que a ferramenta precisa ter naquele momento.** Câmera com a medida anotada
sobre a foto; o valor do projeto ao lado do valor medido, para o próprio
montador ver a diferença antes de acionar alguém; o desenho executivo da peça
aberto no telefone, na revisão vigente — não na que ele baixou semana passada.

**Departamentos afetados.** Projetos (redesenho), Fábrica (refazer ou ajustar),
Compras (chapa e fita de borda), Financeiro (custo de retrabalho e a decisão de
quem paga), Comercial (se muda escopo contratado).

**A quem se solicita.** Projetista responsável pelo executivo, nominal. **Prazo
de resposta: 4 horas úteis** — abaixo disso a equipe já foi embora e o dia está
perdido de qualquer forma. Se não houver resposta em 4 h, escala para o
coordenador de projetos.

**O que fica registrado.** Parada aberta com hora de início; foto com a medida;
divergência em milímetros; decisão tomada e por quem; classificação de causa —
**erro de medição**, **obra mudou depois da medição** ou **erro de projeto** —
que é o que separa culpa de fato consumado e alimenta o KPI de acerto de medição.

**Decisão que a ferramenta tem que oferecer, não esconder:** ajustar em obra
(quem autoriza? há tolerância?), refazer a peça (aciona R3.3), ou parar o
ambiente e seguir para outro. As três precisam estar a um toque, porque a
equipe está parada a R$ 104/hora enquanto se decide.

### R3.2 — Peça faltando ou trocada no romaneio · 10%

**O que trava.** O ambiente inteiro, quando a peça é estrutural; só um módulo,
quando não é. A distinção importa: com ela, o montador segue em outro ambiente
em vez de perder o dia.

**O que a ferramenta precisa ter.** Romaneio conferível item a item, com foto de
referência — porque peça trocada só se descobre comparando; marcação de "faltou"
e de "veio diferente", que são causas diferentes e vão para departamentos
diferentes; e a pergunta que decide o dia: **dá para seguir em outro ambiente?**

**Departamentos afetados.** Expedição (conferência que falhou), Fábrica (se
nunca foi produzida), Estoque, Logística (frete extra), Planejamento (a data se
move), Financeiro (custo do retorno).

**A quem se solicita.** Almoxarifado/expedição, com o líder de produção em
cópia. **Prazo de resposta: 2 horas** para dizer se existe em estoque; se não
existir, entra no ciclo de 9 dias da Lei 3.

**O que fica registrado.** Parada com início e fim; item, quantidade e foto;
se havia em estoque; e — a linha que ninguém quer gravar e que é a mais
valiosa — **em qual conferência o erro deveria ter sido pego**. Sem ela, a
expedição nunca melhora, porque o custo cai sempre na montagem.

### R3.3 — Ferragem errada ou insuficiente · 7%

**O que trava.** A regulagem, quase nunca a montagem inteira. Sinal de alerta
próprio: costuma ser sistemático, não pontual — a mesma corrediça errada em
todos os módulos vem de erro de especificação, não de separação.

**O que a ferramenta precisa ter.** Especificação da ferragem com foto e código;
campo para "veio X, o projeto pede Y"; e a compra local autorizada com teto de
valor, que é a saída barata: R$ 180 de ferragem comprada na esquina evita
R$ 942,40 de dia queimado — **5,2 vezes o custo**.

**Departamentos afetados.** Compras, Estoque, Projetos (se a especificação está
errada na origem), Financeiro (reembolso da compra local).

**A quem se solicita.** Compras, com alçada de reembolso pré-aprovada.
**Prazo: 1 hora** para autorizar compra local; a alternativa é a equipe esperar.

**O que fica registrado.** Ferragem especificada × recebida; nota da compra
local; e se a divergência é pontual ou sistemática, que decide se o chamado vai
para Compras ou para Projetos.

### R3.4 — Obra sem energia, andaime ou bancada · 8%

**O que trava.** Tudo que depende de ferramenta elétrica. Costuma ser resolvível
em horas, e por isso o erro típico é **não registrar** — a equipe espera, o dia
rende menos, e o `TEP` negativo aparece depois como se fosse baixa produtividade
de quem estava de braços cruzados.

**O que a ferramenta precisa ter.** Parada com motivo "condição do local", em
lista fechada, aberta em dois toques. Se abrir parada der trabalho, ninguém abre
— e aí o dado que sustenta todo o resto simplesmente não existe.

**Departamentos afetados.** Obra/coordenação, Cliente (quando é obrigação
dele), Planejamento.

**A quem se solicita.** Coordenador da obra; ao cliente, quando contratual.
**Prazo: 2 horas**, e depois disso a decisão passa a ser remanejar a equipe.

**O que fica registrado.** Início e fim da espera, de quem era a obrigação, e
foto do estado. **De quem era a obrigação** é o campo que sustenta cobrança de
custo de mobilização e que ninguém consegue reconstruir depois.

### R3.5 — Outra equipe ocupando o ambiente · 9%

**O que trava.** Um ambiente; raramente o dia. É conflito de sequenciamento, e a
causa raiz mora no planejamento, não no campo.

**O que a ferramenta precisa ter.** Ver quem mais está alocado naquele endereço
hoje — não só a própria tarefa. É a informação que resolve por conversa, no
local, em cinco minutos, sem escalar para ninguém.

**Departamentos afetados.** Planejamento (sequência), Coordenação de obra.

**A quem se solicita.** Coordenador. **Prazo: 1 hora.**

**O que fica registrado.** Conflito com as duas equipes nomeadas — é o que
alimenta o indicador de conflito de sequenciamento e faz o planejador corrigir a
rede em vez de o campo improvisar toda semana.

### R3.6 — Acesso bloqueado: elevador, portaria, síndico · 6%

**O que trava.** A descarga e a subida do material. Em prédio, o dia inteiro.

**O que a ferramenta precisa ter.** Ficha de acesso do endereço — horário
permitido para carga e descarga, contato da portaria e do síndico, exigência de
ART, seguro ou aviso prévio. **Preenchida na medição**, meses antes, por quem
esteve lá. É o dado mais barato de coletar e o mais caro de descobrir na hora.

**Departamentos afetados.** Logística, Comercial (quem prometeu a data),
Planejamento.

**A quem se solicita.** Coordenação e o contato do cliente. **Prazo: imediato**,
e sem resposta em 1 hora vira remarcação — porque esperar liberação de síndico
custa R$ 104 por hora.

**O que fica registrado.** Motivo, tempo perdido, e se a exigência **constava**
na ficha de acesso. Se não constava, o defeito é da medição, e é lá que se
corrige.

### R3.7 — Cliente ausente ou muda de ideia no local · 5%

**O que trava.** A liberação do ambiente, ou o escopo. O segundo caso é o
perigoso: mudança combinada verbalmente com o montador não vira aditivo, não é
cobrada, e reaparece na assistência como defeito.

**O que a ferramenta precisa ter.** Registro de solicitação do cliente **feito
no local**, com foto e assinatura no próprio telefone, e a frase que protege os
dois lados: *"isto altera o contratado e será orçado"*. E o caminho direto para
abrir aditivo a partir dali — não um recado para alguém abrir depois.

**Departamentos afetados.** Comercial (aditivo), Projetos (redesenho),
Financeiro (cobrança), Assistência (que herda o que não foi registrado).

**A quem se solicita.** Vendedor responsável pelo contrato. **Prazo: 4 horas**
para dizer se executa, se orça ou se recusa.

**O que fica registrado.** Pedido, foto, assinatura, hora, e a decisão. **O
montador não pode ter autoridade para aceitar mudança de escopo** — e a
ferramenta é que precisa deixar isso óbvio, porque no local a pressão é real e
dizer não é difícil.

### R3.8 — Chuva ou condição que impede a etapa · 4%

**O que trava.** Etapas externas e transporte de peça sensível a umidade.

**O que a ferramenta precisa ter.** Parada climática com registro do dia
inteiro, e o efeito automático no cronograma — chuva não é falha de ninguém,
mas move a data e alguém precisa ser avisado hoje, não na reunião de sexta.

**Departamentos afetados.** Planejamento, Comercial (data prometida), Cliente.

**A quem se solicita.** Ninguém resolve; **avisa-se**. Planejamento replaneja e
o cliente é notificado no mesmo dia.

**O que fica registrado.** Dia improdutivo por clima, separado de improdutivo
por falha — misturar os dois destrói a matriz de competências, porque pune quem
pegou chuva.

## O que esta dissecação exige da plataforma

Requisitos que **só existem porque alguma coisa deu errado** — nenhum deles
apareceria numa lista de funcionalidades:

1. **Parada como objeto de primeira classe**, com início, fim, motivo em lista
   fechada, responsável pela causa e evidência. Tudo acima passa por ela.
2. **Lista fechada de motivo**, porque texto livre não vira indicador. Os oito
   da §0 são o ponto de partida.
3. **"De quem era a obrigação"** em toda parada — cliente, obra, fábrica,
   expedição, compras, projeto ou clima. É o campo que separa cobrança de
   desculpa.
4. **Solicitação com destinatário nominal e prazo**, não "aviso ao sistema". Os
   prazos acima variam de 1 a 4 horas e cada um tem um motivo de campo.
5. **Escalonamento por prazo vencido** — sem ele, "prazo de resposta" é decoração.
6. **Romaneio conferível com foto de referência**, e o campo de em qual
   conferência o erro deveria ter sido pego.
7. **Ficha de acesso do endereço**, preenchida na medição.
8. **Compra local com teto e alçada** — 5,2× mais barata que o dia queimado.
9. **Registro de pedido do cliente no local**, com foto e assinatura, e o
   caminho para aditivo.
10. **Revisão vigente do desenho no telefone**, porque montar pela revisão
    antiga é a Lei 1 em ação.
11. **Separação entre improdutivo por clima e improdutivo por falha.**
12. **Ver quem mais está no mesmo endereço hoje.**

---

# P2 — Planejador: dissecação da semana

## Fluxo otimista

Segunda de manhã: lê o apontado da semana, recalcula a rede, compara com a linha
de base, publica o avanço. O desvio está dentro da faixa, o caminho crítico não
mudou de lugar, e ele passa o resto da semana melhorando a rede em vez de apagar
incêndio.

Acontece pouco, pelo mesmo motivo da §0: cada obra em execução tem 47,1% de
chance de gerar um imprevisto por dia, e ele acompanha várias.

## Fluxo pessimista

### R2.1 — O apontamento não chega, ou chega falso

**O que trava.** Tudo. Sem `DEPT` o avanço é chute, a curva de realizado é
ficção e a reunião de prazo vira discussão de memória.

**Falso é pior que ausente**: progresso que só sobe, sempre redondo, sempre
igual ao planejado, é o padrão clássico de quem preenche de cabeça no fim de
semana. Ausente ao menos se enxerga.

**O que a ferramenta precisa ter.** Cobertura de apontamento como número
visível — quantos dias-equipe deveriam ter diário e quantos têm; detecção do
padrão suspeito (progresso monotônico com variância zero); e o apontamento
**datado**, para que a curva de realizado seja medida e não reconstruída.

**Departamentos afetados.** Campo, Coordenação, Comercial (que promete data com
base nisso), Financeiro (medição para faturar).

**A quem se solicita.** Coordenador da equipe. **Prazo: no dia seguinte** —
apontamento com três dias de atraso já é memória.

**O que fica registrado.** Cobertura por equipe e por dia; e a correção, quando
houver, **sem sobrescrever o original**.

### R2.2 — O caminho crítico mudou de lugar e ninguém viu

**O que trava.** Nada, imediatamente — e é exatamente por isso que é perigoso. A
equipe continua correndo na tarefa que era crítica na semana passada.

**O que a ferramenta precisa ter.** Folga total calculada (T-27.1) e **aviso de
troca de caminho crítico** entre dois recálculos. É um dos poucos alertas que
vale interromper alguém.

**Departamentos afetados.** Todos os que executam.

**A quem se solicita.** Ninguém — é informação, não solicitação. Mas precisa
chegar hoje.

### R2.3 — Pedem para antecipar a entrega

**O que trava.** Nada; cria custo. O erro comum é acelerar a tarefa mais visível
em vez da mais barata do caminho crítico — calculado, R$ 1.500/dia contra
R$ 5.000/dia é a diferença entre decidir e chutar. E acelerar tarefa com folga é
dinheiro inteiramente perdido.

**O que a ferramenta precisa ter.** Custo marginal por tarefa (T-27.6) e a
simulação "quanto custa entregar N dias antes", com a advertência de que
comprimir troca o caminho crítico de lugar.

**Departamentos afetados.** Comercial, Financeiro, RH (hora extra), Compras
(frete expresso).

**A quem se solicita.** Diretoria aprova o custo. **Prazo: 24 horas**, porque
antecipação decidida tarde não é antecipação.

### R2.4 — O recurso não existe na data em que a rede diz que existe

**O que trava.** A tarefa que parecia paralela. Duas tarefas pedindo o mesmo
montador não são paralelas, e um cronograma sem nivelamento promete uma
simultaneidade que a equipe não tem.

**O que a ferramenta precisa ter.** Histograma de uso por recurso e a marcação
de sobrecarga (T-27.8).

**Departamentos afetados.** RH, Coordenação, Comercial.

**A quem se solicita.** Coordenação de equipes. **Prazo: 48 horas** — realocar
gente exige aviso.

### R2.5 — Replanejam e apagam a prova do desvio

**O que trava.** A capacidade de explicar. Sem linha de base congelada, cada
replanejamento vira o novo "sempre foi assim".

**O que a ferramenta precisa ter.** Linha de base congelada (T-27.2) e
replanejamento que **não** sobrescreve — o banco já tem `schedule_baselines` com
`FROZEN` e `SUPERSEDED`, e a estrutura para várias versões existe desde a etapa 12.

**A quem se solicita.** Congelar é ato de gestão, com autor e data. **Ninguém
replaneja sem congelar antes.**

---

# P1 — Vendedor: dissecação da venda

## Fluxo otimista

Lead entra, é qualificado em 24 h, medição agendada em 3 dias, proposta em 5,
aprovação em 10, contrato assinado, projeto nasce no pós-venda sem redigitar
nada.

## Fluxo pessimista

### R1.1 — O lead esfria porque ninguém tocou

**O que trava.** A venda, silenciosamente — é a perda que não aparece em lugar
nenhum, porque ninguém registra o que não fez.

**O que a ferramenta precisa ter.** Cartão sem próxima atividade agendada
**tratado como defeito**, não como estado normal; e tempo desde o último toque
visível na coluna.

**Departamentos afetados.** Comercial, Marketing (que pagou pelo lead).

**A quem se solicita.** Gestor comercial. **Prazo: 24 h** para redistribuir.

**O que fica registrado.** Tempo até o primeiro toque e tempo entre toques. É o
KPI de disciplina, e o único que prevê queda de faturamento com antecedência.

### R1.2 — Prometeram prazo que a fábrica não cumpre

**O que trava.** A confiança, e mais tarde a assistência. É a origem mais comum
de cliente insatisfeito com produto tecnicamente correto.

**O que a ferramenta precisa ter.** Prazo calculado a partir da carga real de
fábrica e do calendário, não digitado à mão; e recusa a prometer data fora da
capacidade — ou, no mínimo, aviso de que aquela data exige exceção aprovada.

**Departamentos afetados.** Produção, Planejamento, Assistência.

**A quem se solicita.** PCP. **Prazo: 4 h** para confirmar data excepcional.

### R1.3 — O cliente muda o escopo depois de aprovado

**O que trava.** Fabricação, se já começou. Custa a Lei 1 inteira.

**O que a ferramenta precisa ter.** Ponto de congelamento explícito — **depois
da liberação para fabricação, mudança é aditivo, não ajuste** — e o aditivo
aberto a partir do próprio cartão, com o custo já calculado.

**Departamentos afetados.** Projetos, Fábrica, Compras, Financeiro.

**A quem se solicita.** PCP autoriza parar; Financeiro precifica. **Prazo: 4 h**,
porque a fábrica não espera.

### R1.4 — A medição foi feita antes de a obra estar pronta para medir

**O que trava.** Tudo, com atraso de meses — o erro nasce aqui e explode em
R3.1, a 12% de frequência, a 300× de custo.

**O que a ferramenta precisa ter.** Lista de pré-condições de medição, conferida
e assinada: contrapiso pronto, revestimento definido, ponto elétrico e hidráulico
posicionado, esquadria instalada. E **medição condicional** marcada como tal,
com data de remedição obrigatória.

**Departamentos afetados.** Projetos, Fábrica, Montagem, Assistência — todos, em
sequência.

**A quem se solicita.** Cliente ou construtora libera. **Prazo: a remedição é
agendada, não lembrada.**

**O que fica registrado.** Quais pré-condições não estavam prontas, e se a
medição foi condicional. **É o campo que, sozinho, previne a maior parte das
ocorrências R3.1.**

---

# P4 — Financeiro: dissecação do ciclo

### R4.1 — Mediram e não faturaram

**O que trava.** O caixa. É a falha mais cara e a mais invisível: nada quebra,
só o dinheiro não entra.

**O que a ferramenta precisa ter.** Medição aprovada **sem** nota emitida como
fila visível, com idade em dias.

**Departamentos afetados.** Financeiro, Obra, Comercial.

**A quem se solicita.** Coordenador da obra confirma o medido. **Prazo: 48 h.**

### R4.2 — Custo real estourou o orçado e ninguém viu a tempo

**O que trava.** A margem, quando ainda dava para reagir. Descoberto no
fechamento, não dá mais.

**O que a ferramenta precisa ter.** Orçado × comprado × medido **por item de
curva A** — os 3 itens que concentram 80% do custo. Acompanhar os 8 igualmente é
como se perde a chance de ver o que importa.

**Departamentos afetados.** Compras, Obra, Diretoria.

**A quem se solicita.** Compras justifica o desvio. **Prazo: 5 dias.**

### R4.3 — O cliente não paga a parcela

**O que trava.** Legalmente, nada — na prática, a decisão de continuar ou parar,
que ninguém quer tomar sem respaldo.

**O que a ferramenta precisa ter.** Situação financeira do cliente **visível na
tela de quem vai montar**, antes de a equipe sair; e a régua de cobrança com
etapas registradas.

**Departamentos afetados.** Financeiro, Comercial, Montagem, Jurídico.

**A quem se solicita.** Diretoria decide suspender. **Prazo: antes de a equipe
sair** — descobrir depois custa os R$ 942,40 da Lei 2.

---

# P5 — Assistência: dissecação do chamado

### R5.1 — O chamado é de escopo nunca contratado

**O que trava.** A definição de quem paga, e o chamado fica parado nisso.

**O que a ferramenta precisa ter.** Contrato, aditivos e o registro de R3.7 —
mudança pedida no local — acessíveis do próprio chamado. É onde a foto com
assinatura tirada na obra paga o investimento inteiro.

**A quem se solicita.** Comercial confirma o contratado. **Prazo: 24 h.**

### R5.2 — Não dá para saber quem executou

**O que trava.** A correção da causa. Sem isso, assistência é bombeiro
permanente e a mesma falha volta.

**O que a ferramenta precisa ter.** Rastro de quem montou, quem fabricou, quem
projetou e quem mediu, a partir do chamado. Sem julgamento automático — o
objetivo é corrigir o processo, não achar culpado.

**Departamentos afetados.** Produção, Projetos, Montagem, Qualidade.

### R5.3 — A peça de reposição segue o ciclo de 9 dias

**O que trava.** O prazo prometido ao cliente, que quase nunca é 9 dias.

**O que a ferramenta precisa ter.** Prazo calculado pelo ciclo real da Lei 3, e
não digitado por otimismo, com o cliente vendo a mesma data que a fábrica.

---

# P6 — Administrador · P7 — Projetista

### R6.1 — A pessoa saiu e o acesso ficou

**O que trava.** Nada visível — é risco puro, e por isso nunca é prioridade até
o dia em que é.

**O que a ferramenta precisa ter.** Desligamento como evento que revoga acesso,
e revisão periódica com data da última conferência.

**A quem se solicita.** RH avisa. **Prazo: no dia.**

### R7.1 — Fabricaram pela revisão errada do desenho

**O que trava.** Um lote inteiro. Lei 1 a 100×, e às vezes a 300× quando só
aparece na montagem.

**O que a ferramenta precisa ter.** Liberação para fabricação **amarrada à
revisão aprovada**, de modo que o desenho superado não possa virar ordem de
produção. `project_documents` já tem os estados `DRAFT`/`REVIEW`/`APPROVED`/
`RELEASED`/`ARCHIVED`; falta a amarração.

**Departamentos afetados.** Fábrica, Compras, Montagem, Financeiro.

**A quem se solicita.** Projetista aprova a revisão. **Prazo: 24 h.**

### R7.2 — O plano de corte aproveita mal a chapa

**O que trava.** A margem, silenciosamente. Cinco pontos de aproveitamento numa
obra de R$ 1,1 mi com estrutura a 43,6% do custo são milhares de reais que
ninguém procura porque ninguém mede.

**O que a ferramenta precisa ter.** Aproveitamento percentual por plano de
corte, com histórico. Só isso — medir já muda o comportamento.

---

# O que este documento obriga

1. **Objeto criado sem dissecação não entra em sprint.** Fluxo otimista, lista
   completa de imprevistos, `P(dia limpo)` calculado, e as cinco respostas por
   imprevisto.
2. **Toda solicitação tem destinatário nominal, departamento e prazo.** "Avisar o
   sistema" não é solicitação.
3. **Todo prazo tem escalonamento**, senão é decoração.
4. **Toda espera é medida**, nunca estimada de memória depois.
5. **Motivo é lista fechada**, porque texto livre não vira indicador.
6. **Todo imprevisto grava de quem era a obrigação** — é o que separa cobrança
   de desculpa, e não existe forma de reconstruir isso depois.
7. **Quando `P(nenhum imprevisto)` der alto, a lista está incompleta.**
