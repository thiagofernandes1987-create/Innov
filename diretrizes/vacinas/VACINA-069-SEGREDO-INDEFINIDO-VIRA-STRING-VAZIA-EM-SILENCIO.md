# VACINA-069 — Segredo indefinido vira string vazia, em silêncio, e o passo passa verde

## Qual foi o problema

Em 12/08/2026, primeiro disparo real do workflow `aplicar-migrations`
(run `31651934504`), com um passo criado horas antes justamente para dizer para
onde o segredo apontava. Log do runner:

```
env:
  SUPABASE_DB_URL:
```

O passo chamava-se *"Conferir para onde SUPABASE_DB_URL aponta"*. Ele **passou**.

Duas execuções anteriores na `main` no mesmo dia (09:26 e 09:34) já tinham
falhado por isso, e a mensagem não dizia que o segredo faltava — dizia que a
conexão não funcionou.

## Como ocorreu

O GitHub Actions expande `${{ secrets.X }}` de um segredo que **não existe**
como **string vazia**. Sem erro, sem aviso, sem anotação no log, sem alterar a
conclusão do passo. Quem lê o painel vê verde.

Do lado do script, a ausência da variável era indistinguível de *"estou rodando
sem credencial de propósito"* — que é uso legítimo no terminal de quem
desenvolve, onde `--conferir` mostra o plano sem tocar no banco. O mesmo código
respondia às duas situações do mesmo jeito.

## Por que aconteceu

Porque o script tratava **"está certo"** e **"não havia o que conferir"** como o
mesmo desfecho. É a família da VACINA-057 — validador que confere o artefato e
não o efeito — vista pelo lado da entrada em vez da saída, e é a mesma razão
pela qual a prova por sabotagem existe: *portão que nunca foi visto reprovando
não foi provado.*

O agravante é o lugar: o defeito estava **dentro da correção que invoca essa
regra**. O portão da S-79 nasceu no mesmo dia, para impedir alvo não conferido,
e aprovou a execução em que não havia alvo nenhum.

## Como foi detectado

Disparando o workflow e **lendo o log**, em vez de confiar na conclusão do
passo. A conclusão dizia `success`; o log dizia `SUPABASE_DB_URL:` seguido de
nada.

## Qual foi a solução

Duas metades, e as duas são necessárias.

**No script**, a bandeira `--exigir`, que separa os dois lugares:

```
segredo ausente  com --exigir    exit=2
segredo vazio    com --exigir    exit=2   (como o GitHub de fato expande)
segredo ausente  sem --exigir    exit=0   (terminal de quem desenvolve)
segredo certo    com --exigir    exit=0
```

**No repositório**, `pnpm validate:segredo-com-guarda`, que exige de todo
`secrets.X` consumido por workflow uma recusa explícita do valor vazio.

Medido ao criar, em 12/08/2026: **17 workflows consomem segredo, 62 usos.
11 workflows já se defendiam; 6 não**, somando 20 usos. Os 20 entram em
`diretrizes/SEGREDOS-SEM-GUARDA-ACEITOS.json` com motivo e data — mesmo padrão
de `EXPORTS-MORTOS-ACEITOS.json` e `ASSERCOES-FRACAS-ACEITAS.json`. O número só
pode cair: o portão reprova quem aumentar **e** reprova entrada que deixou de se
aplicar, porque débito congelado depois de resolvido vira permissão silenciosa.

O pior dos seis está anotado como tal: `qa-planning-persona.yml` com
`QA_PERSONAS_JSON` vazio faria a bateria de persona rodar **sem persona nenhuma
e passar**.

### A segunda forma, encontrada na hora de conferir a primeira

*(acrescentado em 12/08/2026, run `31652604375`)*

Com `--exigir` no lugar, o workflow foi disparado de novo. O script **recusou
corretamente** — e o passo saiu **verde de novo**. O motivo estava na linha:

```yaml
run: node scripts/banco-alvo.mjs --conferir --exigir | tee alvo-conferido.txt
```

Em bash, o status de um pipeline é o do **último** comando. O `tee` sempre sai
0, então `exit 2` do script é descartado. Demonstrado, não deduzido:

```
sem pipefail:   node -e "process.exit(2)" | tee /dev/null   → status=0
com pipefail:   node -e "process.exit(2)" | tee /dev/null   → status=2
```

É a mesma vacina pelo outro lado. A primeira metade era **a entrada** — o script
não distinguia ausência de acerto. A segunda é **a saída** — o workflow gravava
a recusa num arquivo e jogava fora o código que a acompanhava. Nos dois casos
existe um sinal correto e alguém deixa de olhar para ele.

Medido no repositório: **2 ocorrências, as duas minhas, as duas do mesmo dia**.
Nenhum workflow anterior tinha o defeito — o que quer dizer que ele entrou junto
com a correção, e não apesar dela.

## Prevenção automática

`pnpm validate:segredo-com-guarda` (`scripts/validate-segredo-com-guarda.mjs`),
no CI. Ele confere as **duas** metades: a guarda contra o segredo vazio, e o
`| tee` que preserva o código de saída (`set -o pipefail` nas linhas acima, no
mesmo passo).

Reconhece quatro formas de guarda — `test -n "$X"`, `[ -z "$X" ]`,
condição `secrets.X != ''` e a passagem por script com `--exigir` — e mais
nenhuma: reconhecer "qualquer menção ao nome" faria o portão aprovar o próprio
uso do segredo, que é o defeito com outro nome.

## Prova por sabotagem

| Sabotagem | Saída |
| --- | --- |
| base | `exit=0` — 62 usos em 17 workflows, 20 em dívida datada |
| workflow novo consumindo segredo sem guarda | `exit=1` — acusa arquivo e segredo |
| o mesmo workflow com `test -n` antes do uso | `exit=0` — 63 usos, o caso legítimo passa |
| entrada de dívida que não se aplica mais | `exit=1` — *"21 entradas e só 20 ainda se aplicam"* |
| `\| tee` sem `set -o pipefail` (o defeito real, restaurado) | `exit=1` — acusa arquivo e linha |
| restaurado | `exit=0` |

E, no script, os quatro casos da tabela do `--exigir` acima, com o caso legítimo
(terminal sem credencial) continuando a passar.

## Limitações da prevenção

- **Não sabe quais segredos existem.** A API do GitHub não expõe valor, e este
  repositório não tem como listar nomes. O portão exige guarda; quem descobre a
  ausência continua sendo a execução.
- **Reconhece guarda por forma, não por efeito.** Um `test -n` num passo que
  roda depois do uso passaria. A ordem é responsabilidade de quem escreve.
- **A dívida de 20 é real.** Seis workflows continuam podendo rodar com segredo
  vazio — entre eles o de persona, que passaria verde sem persona nenhuma.
