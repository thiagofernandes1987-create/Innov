# VACINA-050 — Acervo compartilhado não se prende ao módulo que o emite

## Qual foi o problema

A biblioteca de modelos de documento nasceu amarrada ao módulo emissor:
`document_templates.module_key` guardava `propostas` para a proposta,
`contratos` para o contrato, `qualidade` para a FVS — e essa coluna era a
**chave de permissão** da RLS.

O responsável recusou o desenho com um caso que não é exceção nenhuma:

> "enviar uma proposta para o cliente na etapa de projeto ou o contrato
> assinado, não teria como se cada documento ficasse preso a um único módulo"

Ele está certo, e o caso é o normal, não a borda. A proposta é enviada de dentro
de Projetos. O contrato assinado é anexado num atendimento do pós-venda. A
mensagem de boas-vindas do CRM é disparada por uma mudança de etapa do funil. A
FVS é aberta de dentro de Compras, no recebimento.

## Como ocorreu

```sql
create policy document_templates_read on public.document_templates
for select to authenticated
using (has_module_permission(organization_id, module_key, 'READ', null, null));
```

A frase que justificou isso, escrita por mim na migration, soava bem: *"o módulo
é a chave de permissão, não um filtro de tela; a RLS reaproveita
`has_module_permission`, que já é o mecanismo da plataforma"*. Reaproveitar o
mecanismo era certo. **O que estava errado era o que foi escolhido como dono.**

## Por que aconteceu

Porque duas perguntas diferentes foram respondidas com o mesmo campo:

- **quem pode ver este documento?** — pergunta de segurança;
- **onde este documento costuma aparecer?** — pergunta de organização.

Quando as duas moram na mesma coluna, toda circulação legítima vira exceção. E
exceção em regra de acesso é como a permissão apodrece: a primeira "só para a
proposta aparecer em Obras" abre a segunda, e em seis meses ninguém sabe mais o
que a regra garante.

O erro tem forma reconhecível: **atribuir um dono único a um recurso que é
compartilhado por natureza**. Modelo de documento, tabela de preços, cadastro de
fornecedor, checklist e mensagem padrão são todos assim — existem para ser
usados de vários lugares.

## Como foi detectado

Pelo responsável, ao ler o desenho. Não foi teste nem CI: a estrutura estava
coerente consigo mesma e todos os testes passavam. Só um caso de uso real
mostra que o dono escolhido está errado — e nenhum dos meus testes descrevia
"emitir a proposta de dentro de Projetos", porque eu não tinha imaginado esse
uso quando escolhi o dono.

## Qual foi a solução

Três coisas separadas, cada uma no seu lugar:

| Pergunta | Onde mora |
|---|---|
| quem pode ver | permissão de **um** aplicativo — `modelos` — pela RLS de sempre |
| o que a peça é | `document_type`, do catálogo `document_types` |
| onde aparece | `document_module_types`, marcado pela Administração de cada empresa |

```sql
-- Um acervo, lido por todos.
create policy document_templates_read on public.document_templates
for select to authenticated
using (
  scope = 'PLATAFORMA'
  or has_module_permission(organization_id, 'modelos', 'READ', null, null)
);
```

A marcação por aplicativo é **disponibilização, não segurança**: ela decide o
que aparece na lista de dentro de cada aplicativo, para quem emite ordem de
serviço em Obras não escolher entre trinta e cinco tipos. Desmarcar não esconde
nada de quem for à biblioteca. Dizer isso em voz alta importa: filtro de tela
apresentado como permissão é a forma mais comum de acreditar em segurança que
não existe.

E duas origens, porque a biblioteca tem dois donos legítimos:

- **plataforma** (`organization_id is null`) — o padrão que vale para todas as
  empresas, alterável só por migration;
- **organização** — a da empresa, editável pelo administrador dela.

Empresa que quer sua versão do padrão **duplica**; `derived_from` guarda de onde
a cópia veio. Editar por cima do padrão comum mudaria o de todas as outras.

## Regra

- **Recurso usado por vários módulos não tem módulo dono.** Ele tem um
  aplicativo próprio, e a permissão é a desse aplicativo.
- **Separe "quem pode ver" de "onde aparece".** A segunda é configuração de
  produto e muda por empresa; a primeira é RLS e não se configura por tela.
- **Filtro de disponibilização é documentado como filtro**, na tela e no
  comentário da tabela — nunca apresentado como se protegesse alguma coisa.
- Antes de escolher o dono de uma tabela, escreva **três usos reais vindos de
  módulos diferentes**. Se algum deles vira exceção, o dono está errado.

## Prevenção automática

`tests/documentos-modelos.test.ts` reprova o desenho antigo diretamente: exige
que **a proposta seja oferecida em mais de um aplicativo** e que **o contrato
chegue ao pós-venda**, que não é quem o emite. São os dois casos que o
responsável citou, escritos como teste — se alguém voltar a amarrar o acervo a
um dono único, eles quebram.
