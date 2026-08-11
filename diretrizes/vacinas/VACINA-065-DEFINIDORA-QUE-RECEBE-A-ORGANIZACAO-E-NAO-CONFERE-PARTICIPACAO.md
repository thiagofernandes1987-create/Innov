# VACINA-065 — Definidora que recebe a organização por parâmetro e não confere participação escreve em empresa alheia

## Qual foi o problema

Sete funções `security definer` recebiam o `organization_id` como parâmetro,
estavam concedidas a `authenticated`, e agiam sobre aquela organização **sem
perguntar se o chamador pertence a ela**.

`security definer` roda com os privilégios do dono da função e por isso **não
passa por RLS**. Quando a função ainda recebe como parâmetro justamente o campo
que separa uma empresa da outra, ela vira uma porta que ignora a política e
aceita o destino de quem bate: basta trocar o UUID no corpo da chamada.

O que dava para fazer, do navegador, com uma sessão legítima de qualquer
empresa e sem ler uma linha de dado alheio:

| Função | Efeito em empresa de terceiro |
| --- | --- |
| `reserve_channel_ai_budget` | somar no orçamento diário de IA até estourar o teto — negação de serviço em vizinho |
| `release_channel_ai_budget` | devolver reserva alheia, desfazendo a contabilidade de quem estava usando |
| `commit_channel_ai_budget` | mover reservado para consumido |
| `release_channel_ai_conversation` | apagar a trava de conversa |
| `consume_channel_critical_write_approval` | queimar aprovação pendente de escrita crítica |
| `semear_modelos_da_empresa` | inserir os modelos PLATAFORMA como linhas de `document_templates` |
| `semear_motivos_de_perda` | inserir nove linhas em `managed_list_values` |

Nenhuma é vazamento de leitura. Todas são **escrita cross-tenant**, que é
exatamente o que a RLS existe para impedir em todo o resto do esquema.

## Como ocorreu

Pela combinação de três coisas que, isoladas, são normais:

1. `security definer`, escolhido para a função poder escrever em tabela cuja
   policy o usuário não satisfaz diretamente;
2. `organization_id` na assinatura, porque o chamador já sabe em qual empresa
   está;
3. `grant execute ... to authenticated`, porque a chamada nasce no navegador.

Juntas, as três produzem uma função que decide o inquilino a partir de um
argumento não confiável. A conferência que a RLS faria sozinha passa a ser
responsabilidade do corpo — e em sete funções ela simplesmente não foi escrita.

## Por que aconteceu

Porque **as irmãs faziam certo, no mesmo arquivo, no mesmo dia**, e a diferença
entre elas não reprovava nada.

`20260804200000_stage22_ai_bridge.sql` cria seis definidoras irmãs, todas
recebendo `p_organization_id`, todas concedidas a `authenticated`:

```
claim_channel_ai_conversation      has_module_permission(...,'whatsapp','EDIT',null,'administer')
request_channel_ai_handoff         has_module_permission(...,'whatsapp','EDIT',null,'administer')
record_channel_ai_invocation       has_module_permission(...,'whatsapp','EDIT',null,'administer')
release_channel_ai_conversation    — nada —
reserve_channel_ai_budget          — nada —
commit_channel_ai_budget           — nada —
```

O mesmo desenho se repete em `20260804220000_stage22_security_hardening.sql`,
onde `approve_channel_critical_write` — a função que **concede** a aprovação —
abre com o guarda em nível `DELETE`, e `consume_channel_critical_write_approval`
— a que **queima** a aprovação — não abre com nada. E em
`20260803200000_catalogo_de_valores_usados.sql`, onde `registrar_valor_usado`
abre com `is_org_member` e a semeadora vizinha não.

O padrão é sempre o mesmo: a função que o autor pensou como "a que faz a
verificação" ganhou guarda; a que ele pensou como "a que só desfaz", "a que só
libera", "a que só semeia" não ganhou. Liberar, desfazer e semear em empresa
alheia continua sendo escrever em empresa alheia.

## Como foi detectado

Em duas etapas, e a ordem importa porque a segunda corrigiu a primeira.

**Auditoria manual**, a partir da leitura do mergulho XI.11 do manual do Odoo
(ACL, record rules e `sudo()`), que descreve o mesmo risco no vocabulário de lá:
`sudo()` é o `security definer` daquele mundo. A varredura triou as definidoras
sem conferência explícita e concluiu **1 achado real** —
`semear_motivos_de_perda`.

**Portão automático**, escrito depois para impedir a reincidência. Ele acusou
**mais 6**, que a triagem manual tinha classificado como seguras. A auditoria
manual errou por 6 em 7: ela leu as funções que pareciam relevantes e aceitou
como guardada qualquer função cujo entorno mencionasse uma conferência.

Estado final medido no dia:

```
funções public no estado final : 414
  security definer             : 328
  definer sem set search_path  :   0
  definer que são gatilho      :  20   (invocada pelo banco, não pelo cliente)
  definer sem org por parâmetro: 204
  definer sem grant ao usuário :  26   (só service_role)
  conferidas pelo portão       :  78
```

## Qual foi a solução

**As sete funções**, corrigidas com o guarda **da própria família**, não com um
inventado para a ocasião — as cinco de canal com
`has_module_permission(p_organization_id,'whatsapp','EDIT',null,'administer')`,
as duas semeadoras com `is_org_member(p_organization_id)`. Corpo idêntico ao
anterior em todas; muda só a entrada.
(`20260811060000`, `20260811061000`.)

**Os dois gatilhos** de semeadura passaram a copiar direto em vez de chamar a
função concedida ao usuário final. Sem isso, o guarda quebraria exatamente onde
ele precisa não existir: no `insert` de `organizations`, quando a empresa acabou
de nascer e **ainda não há participação para conferir**.

**O portão**: `scripts/validate-definer-com-guarda.mjs`
(`pnpm validate:definer-com-guarda`), no CI junto dos outros validadores de
catálogo. Ele reprova quando uma função é, no estado final, definidora **e**
recebe `organization_id` **e** é executável por `authenticated`/`anon` **e** não
cita nenhum guarda conhecido.

O que ele deliberadamente **não** confere: se o guarda está *correto*. Chamar
`is_org_member` com o parâmetro errado passa. Portão de presença não substitui
revisão; ele impede o esquecimento, que é o caso comum — e era o caso das sete.

## Estado final, não histórico — três defeitos do próprio portão

A primeira versão lia as migrations como um saco de declarações. Acusou 7
funções, das quais **3 eram falsas**:

| Acusada à toa | Por quê |
| --- | --- |
| `write_audit` | revogada de `authenticated` em `20260729185000`, justamente para fechar este risco |
| `ensure_organization_module_defaults` | revogada em `20260720143900` |
| `search_sinapi_references` | rebaixada para `security invoker` pela VACINA-004 |

Migration é sequência aplicada em ordem: `create or replace` troca o corpo,
`alter function ... security invoker` rebaixa o privilégio, `revoke` retira o
que um `grant` antigo deu. Portão que lê histórico em vez de estado final gasta
a confiança de quem o lê. Agora tudo é reduzido em ordem cronológica de arquivo,
e vence a última declaração.

O terceiro defeito foi pior, porque era **falso negativo**. O corpo de cada
função terminava na `create function` seguinte, e não no fecho da citação em
cifrão — então cada função herdava o texto que a separava da vizinha.
`set_user_module_capability_override` confere `has_org_role`, que não estava na
lista de guardas aceitos, e deveria ter sido acusada; o recorte largo alcançou o
`auth.uid()` da função seguinte e deu por conferida uma função que o portão
nunca leu direito. Corrigido o recorte, ela apareceu — e apareceram junto
`consume_channel_critical_write_approval` e `release_channel_ai_budget`, dois
dos sete achados reais, que até então estavam sendo escondidos pelo mesmo bug.
`has_org_role` entrou na lista de guardas.

Falso negativo é pior que falso positivo: o falso positivo incomoda até alguém
olhar, o falso negativo é silêncio que parece aprovação.

## Prova por sabotagem

| Sabotagem | Saída |
| --- | --- |
| base, sem sabotagem | `exit=0` — 78 conferidas |
| S1 — tirar o guarda de `reserve_channel_ai_budget` | `exit=1` — acusa `reserve_channel_ai_budget` |
| restaurado | `exit=0` |
| S2 — tirar o guarda de `semear_motivos_de_perda` | `exit=1` — acusa `semear_motivos_de_perda` |
| restaurado | `exit=0` |
| S3 — migration nova com definidora, org por parâmetro, `grant` e sem guarda | `exit=1` — acusa `relatorio_de_sabotagem` |
| restaurado | `exit=0` |
| S4 — reconceder `write_audit` a `authenticated` depois do `revoke` | `exit=1` — acusa `write_audit` |
| restaurado | `exit=0` |

S3 é a que prova o que interessa no dia a dia: função **nova** chegando sem
guarda reprova. S4 prova que a redução cronológica **re-arma** em vez de
silenciar para sempre — uma reconcessão futura volta a ser acusada.

## Limitações da prevenção

- **Presença, não correção.** Guarda chamado com o parâmetro errado passa.
- **Estático.** O portão lê as migrations do repositório, não o banco. Função
  criada fora de migration, ou `grant` dado à mão no console, não existe para
  ele. O portão do outro lado é `pnpm validate:migrations-applied`.
- **Chave por nome, não por assinatura.** Sobrecarga com privilégio divergente
  seria tratada como uma coisa só. Não existe nenhuma hoje; a aproximação erra
  para o lado de conferir demais, nunca de menos.
- **`service_role` continua fora.** As 26 definidoras concedidas só a
  `service_role` não são conferidas, porque não são alcançáveis pelo navegador.
  Se alguma delas for concedida a `authenticated` um dia, ela entra no portão
  no mesmo instante — foi isso que S4 provou.
