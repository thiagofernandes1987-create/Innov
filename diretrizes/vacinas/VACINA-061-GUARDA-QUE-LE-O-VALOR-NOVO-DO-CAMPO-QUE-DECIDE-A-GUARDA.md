# VACINA-061 — Guarda que lê o valor **novo** do campo que decide se a guarda se aplica

## Qual foi o problema

A referência oficial de custo — SINAPI e CUB — é protegida por um gatilho:
escrita só de `postgres` ou `service_role`; qualquer outro, se a linha for
oficial, é recusado. O jeito de saber se a linha era oficial:

```sql
if tg_table_name = 'cost_compositions' then
  v_source_key := case when tg_op = 'DELETE' then old.source_key else new.source_key end;
```

No `UPDATE`, ele lê o valor **novo** do campo que decide se ele próprio se
aplica. Então o campo é a saída: mude-o primeiro, e a guarda deixa de valer.

Medido em 4 de agosto de 2026, com sessão `authenticated` de membro interno:

```
update cost_compositions        set source_key = 'PROPRIA'  →  PERMITIDO
update cost_composition_versions set unit_cost = 1.00        →  208,33 virou 1,00
update cost_composition_items    set unit_cost = 0.01        →  REESCRITO
```

Dois passos, e o custo publicado pela CAIXA vira o que a pessoa quiser — **com
a procedência intacta ao lado**. `source_url`, `source_sha256` e `base_date`
continuam dizendo de onde o número veio, e o número já não é aquele. É o pior
formato possível: a evidência sobrevive ao dado e passa a atestar uma coisa que
não aconteceu.

## Como ocorreu

Por uma leitura razoável do que um gatilho `BEFORE UPDATE` deve olhar. Em quase
todo lugar, `new` é o certo: é o valor que vai ficar gravado, e validar o que
vai ficar é o trabalho normal de uma validação.

A exceção é justamente esta: quando o campo lido **é o que decide se a regra se
aplica**, olhar `new` é perguntar ao réu se ele quer ser julgado. A guarda vira
opcional para quem sabe qual campo desligar.

O `DELETE` já estava certo — usava `old`, porque não existe `new`. O acerto veio
da linguagem, não da análise, e por isso não se estendeu ao `UPDATE`.

## Por que aconteceu

Porque **a pergunta parecia ser "esta linha pode ficar assim?" quando era "esta
linha pode ser mexida?"**. São perguntas diferentes e a segunda se responde com
`old`.

Vale o parentesco com a **VACINA-058** e a **VACINA-059**: nas três, a leitura
do código dá a resposta errada porque a regra que decide está em outro lugar —
lá o `else false` de um `case` fechado, lá o comando que não passa por política,
aqui o campo que o próprio autor da escrita controla.

E vale registrar o erro de método que quase deixou isto passar: o defeito foi
**anotado no inventário a partir de política e privilégio**, sem executar nada —
"a tabela concede `UPDATE` a `authenticated` e a política é `for all`, logo é
gravável". A execução mostrou que o diagnóstico estava errado (o gatilho existia
e negava tudo) e, ao mesmo tempo, que havia um buraco de verdade, outro, mais
estreito e pior. Inferência de esquema encontra o que procura; só a execução
encontra o que não se procurava.

## Como foi detectado

Executando. A conferência de leitura da T-37.10 levantou a suspeita pelo
esquema; a tentativa real de escrita, com `set local role authenticated` e o
`sub` de um membro interno no `request.jwt.claims`, mostrou primeiro que a
escrita direta era negada — e depois, ao insistir por outro caminho, que trocar
`source_key` abria tudo.

## Qual foi a solução

A regra passou a ser sobre o que a linha **é**, não sobre o que ela vai virar:

| operação | recusa quando |
|---|---|
| `INSERT` | a linha nasce oficial |
| `UPDATE` | era oficial **ou** passaria a ser |
| `DELETE` | era oficial |

Os dois sentidos importam: sem o "passaria a ser", um membro interno promoveria
a composição da casa a oficial e ganharia uma referência falsa com aparência de
publicada. Nos filhos, a conferência é contra o pai **antigo e novo** — mover um
item para outra versão contornaria a guarda pelo outro lado.

O CUB entrou na mesma proteção. Ele dependia só da política de RLS, de leitura;
o privilégio bruto ainda concedia escrita, que é a VACINA-059 com outro comando.
Agora tem o gatilho **e** o `revoke`.

Provado com a mesma prova de antes, sem alterá-la:

| tentativa | antes | depois |
|---|---|---|
| trocar `source_key` | PERMITIDO | NEGADO |
| reescrever custo da versão | 208,33 → 1,00 | NEGADO |
| reescrever custo do item | REESCRITO | NEGADO |
| apagar a composição | — | NEGADO |
| `update` no CUB | sem efeito (RLS) | NEGADO no privilégio |

E os caminhos legítimos, conferidos um a um para a correção não virar bloqueio
no lugar errado: o importador `SECURITY DEFINER` grava (1 item); a composição
**própria** da empresa continua editável por membro interno; promover a própria
a oficial é negado; e o `service_role` continua atualizando o instantâneo do
CUB.
