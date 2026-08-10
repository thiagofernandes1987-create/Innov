# VACINA-057 — Validador que confere o artefato aprova enquanto o efeito não existe

## Qual foi o problema

O Object Runtime é canônico desde a S-05, tem duas migrations escritas desde 26
de julho, um validador de invariantes no CI e uma suíte de testes de banco com
catorze casos. Tudo verde por quarenta dias.

As três tabelas **não existiam no banco**:

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name like 'object_%';
-- 0 linhas
```

E o ledger de migrations aplicadas não tinha nenhuma entrada de
`object_runtime_*`. Os arquivos foram escritos, revisados e commitados; ninguém
aplicou.

## Como ocorreu

Dois verificadores, cada um respondendo corretamente à pergunta que sabia
responder:

- **`validate:object-runtime`** lê os *arquivos* de migration e confere que
  declaram RLS habilitada e forçada, o orçamento de slots coerente com o
  TypeScript e a guarda de imutabilidade. Tudo isso estava escrito nos arquivos.
- **`test:db:object-runtime`** cria um banco do zero, aplica *aqueles mesmos
  arquivos* e testa o comportamento. Passa — porque o comportamento do artefato
  está certo.

Nenhum dos dois mentiu. Só que a pergunta "isto está no banco de verdade?" não
era feita por ninguém.

## Por que aconteceu

Porque **arquivo e efeito são coisas diferentes que se parecem muito**, e a
diferença só aparece quando alguém compara os dois conjuntos. O repositório
tinha como comparar arquivo com arquivo (`validate:migrations` conferia uma
lista fixa de nomes) e efeito com efeito (o teste de banco), e nada que
cruzasse.

E há um caminho que produz a divergência sem ninguém errar: **aplicar uma
migration com nome diferente do arquivo**. Nesta mesma sessão eu fiz isso
repetidamente — dividi um arquivo em três aplicações com nomes próprios, e o
ledger passou a ter três entradas que nenhum arquivo reconstrói. São 55 casos
assim hoje.

Vale registrar o parentesco com a **VACINA-056**: lá, a verificação saía 0
quando a dependência faltava; aqui, ela verifica o objeto errado. As duas
produzem o mesmo efeito prático — verde permanente sem garantia — e as duas
passam despercebidas porque *existe* um verificador com nome plausível.

## Como foi detectado

Ao começar T-32.3, li o contrato antes de escrever código e fui conferir o que
já existia. A consulta ao `information_schema` foi por hábito de checar o
estado antes de mexer, não por suspeita — o inventário dizia "nunca virou
migration", e eu esperava confirmar que já tinha virado.

Se eu tivesse acreditado no validador verde, teria escrito a interface do
estúdio de objetos sobre três tabelas inexistentes e descoberto na primeira
execução.

## Qual foi a solução

As duas migrations foram aplicadas, com as autoverificações embutidas nelas
passando: RLS habilitada e forçada nas três tabelas, guarda de imutabilidade
criada, alocação de slots determinística, checksum independente da ordem das
chaves e orçamento coerente com o TypeScript.

E o cruzamento que faltava virou validador: `pnpm validate:migrations-applied`
compara os arquivos com um instantâneo commitado do ledger de aplicadas.

Um detalhe do próprio validador merece registro, porque quase virou baseline
errado: a primeira versão comparava pelo **carimbo numérico**, e o ledger
carimba a versão no instante da aplicação — `20260803235000_listas...sql`
aparece aplicada como `20260803182502`. O resultado foi "111 de 152 arquivos não
aplicados", que é obviamente absurdo e, congelado como débito, teria tornado o
validador inútil para sempre. A comparação é pelo **nome lógico**.

## Regra

- **Verificar o artefato não é verificar o efeito.** Onde os dois podem
  divergir — arquivo de migration e migration aplicada, definição e projeção,
  documento e código — alguma coisa precisa comparar os dois conjuntos.
- **Aplicar migration com nome diferente do arquivo quebra a reconstrução.** O
  nome lógico é a chave que liga repositório e banco.
- **Número absurdo em baseline novo é erro de medição, não dívida.** Antes de
  congelar uma divergência, confira uma amostra à mão: 111 de 152 não é dívida
  histórica, é comparação errada.
- Antes de construir sobre uma fundação que "já existe", **consulte o estado
  real**, não o validador que diz que ela existe.

## Prevenção automática

`pnpm validate:migrations-applied`, no CI, com o instantâneo em
`diretrizes/migrations-aplicadas.json` — datado, com o débito de hoje congelado
e apontando a S-22 como responsável. Reprova arquivo novo sem aplicação e
aplicação nova sem arquivo; avisa quando o instantâneo passa de trinta dias.
Os dois sentidos foram exercitados com teste negativo.

O instantâneo é produzido por `pnpm ledger:atualizar`
(`SUPABASE_DB_URL=... pnpm ledger:atualizar`), que lê
`supabase_migrations.schema_migrations` e regrava o arquivo. **O script existir
faz parte da vacina**: a primeira versão desta página mandava rodar
`pnpm ledger:atualizar` e o comando não existia — um verificador que aponta
para um procedimento ausente é o mesmo defeito, com outro nome.

O atualizador **poda** do débito congelado o que deixou de divergir, e nunca
acrescenta. Assim ele não pode ser usado para lavar uma divergência nova:
rodá-lo depois de esquecer de aplicar uma migration não faz o validador ficar
verde. Congelamento que sobrevive à correção também é problema — se o arquivo
sumir de novo, nada reprovaria. Exercitado em banco de prova: três aplicadas,
três arquivos, uma entrada de débito resolvida podada com nome, e as duas
direções de divergência ainda reprovando.
