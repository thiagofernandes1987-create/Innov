# VACINA-052 — Embed ambíguo devolve PGRST201, e não é o embed que vem vazio: é a consulta inteira que falha

## Qual foi o problema

A tela de obras — porta de entrada de todo o módulo de gestão multiobra —
mostrava a lista vazia. Medido, no mesmo instante:

```
tela  /app/obras :  0 obras, com alerta "não foi possível carregar os dados"
banco  projects  :  2 obras (archived_at is null)
```

E a tela de detalhe da obra respondia **404**, para uma obra que existe.

Sete telas estavam com o mesmo defeito, em quatro pares de tabelas diferentes:
obras, detalhe da obra, aditivo novo, dois preenchimentos de qualidade, o portal
de formulário público e os documentos do portal do cliente.

## Como ocorreu

```ts
supabase.from("projects").select("…,contracts(code,status)")
```

Leitura razoável, e é como quase todo embed do repositório está escrito. Mas
existem **dois caminhos** entre obra e contrato:

```
projects.contract_id  → contracts     (obra criada a partir de um contrato)
contracts.project_id  → projects      (contrato apontando a obra que gerou)
```

O PostgREST se recusa a adivinhar qual dos dois o `select` quis e devolve
`PGRST201`. A resposta não traz a linha com o embed vazio — **não traz linha
nenhuma**.

O mesmo desenho aparece em todo par que tem ponteiro de "versão atual":
`budgets ⇄ budget_versions`, `quality_form_templates ⇄ quality_form_versions`,
`project_documents ⇄ project_document_versions`. São 25 pares ambíguos no
esquema.

## Por que aconteceu

Duas causas somadas, e nenhuma delas isolada explicaria o silêncio:

**A ambiguidade nasce longe do `select`.** `contracts.project_id` entrou numa
migration de financeiro, meses depois de a tela de obras estar escrita e
funcionando. Nenhum arquivo da tela mudou; a consulta que funcionava passou a
falhar por causa de uma coluna criada noutro módulo. Não há revisão de código
que pegue isso: o diff que quebrou a tela não toca na tela.

**A tela tratava falha de carga como ausência de dado.**

```ts
if (!projectResult.data) notFound();
```

`data` vem nulo em dois casos muito diferentes — a obra não existe, e a consulta
falhou. Colapsar os dois em 404 é o que manteve o defeito invisível: quem abria
a obra via "não existe", acreditava, e ia embora. Ninguém procura erro de
consulta numa tela que diz que o registro não existe.

O `typecheck` não vê, porque a string do `select` é só uma string. O teste
unitário não vê, porque não sobe PostgREST. E a tela não quebra: ela mostra
"nenhuma obra cadastrada", que é uma frase perfeitamente plausível.

## Como foi detectado

Por acaso, e vale registrar que foi por acaso. Eu precisava de um `id` de obra
válido para verificar outra coisa; abri `/app/obras` para pegar um, e a lista
estava vazia. A confirmação veio de contar os dois lados:

```
select count(*) from public.projects where archived_at is null;  →  2
```

Dois no banco, zero na tela. Só então o `PGRST201` no console do servidor virou
uma pista em vez de ruído.

## Qual foi a solução

**Nomear a chave** em todo embed de par ambíguo:

```ts
.select("…,contracts!projects_contract_id_fkey(code,status)")
```

E separar falha de carga de registro inexistente na tela de detalhe: erro de
consulta agora rende alerta de carga, não 404.

## Regra

- **Embed entre tabelas com mais de um caminho leva o nome da constraint.**
  Não é preciosismo: sem ele a consulta inteira falha, não o embed.
- **`!data` não é "não existe".** Antes de `notFound()`, verificar o erro. Tela
  que responde 404 para falha de consulta esconde o defeito por tempo
  indeterminado — foi exatamente o que aconteceu aqui.
- **Migration que cria chave estrangeira pode quebrar tela que ninguém tocou.**
  A verificação tem que ser do esquema para o código, não do diff para o
  código.

## Prevenção automática

`pnpm validate:postgrest-embeds` reconstrói o grafo de chaves estrangeiras a
partir das migrations, descobre os pares com mais de um caminho e reprova todo
embed nesses pares que não nomeie a constraint. Roda no CI.

Um detalhe do próprio validador merece registro, porque é a mesma classe de
ponto cego: a primeira versão só lia `alter table` que contivesse a palavra
`foreign key`, e `projects.contract_id` nasceu de um `add column … references
public.contracts` — referência inline, sem a palavra-chave. O validador rodou
verde sobre o defeito que o motivou. Só apareceu porque o teste negativo foi
executado — reintroduzir o defeito e exigir reprovação — em vez de assumido:

```
com o defeito reintroduzido:  reprovou, 1 embed apontado
restaurado:                   aprovou, 475 chaves, 25 pares ambíguos
```

**Validador novo só conta como prevenção depois de reprovar o defeito original.**
Aprovar tudo é o estado natural de um validador quebrado.
