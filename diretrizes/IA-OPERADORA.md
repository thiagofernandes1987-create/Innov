# IA operadora — o contrato do que a inteligência artificial pode executar

**Documento canônico:** sim.
**Escrito em:** 11 de agosto de 2026.
**Portão:** ainda não tem. Declarado na §9.

---

## 1. O que este documento decide

O proprietário definiu a direção:

> *"quero um módulo de contabilidade e um de IA embutido, pois depois vamos
> colocar a IA para lançar e fazer um monte de serviços burocráticos nos Marcos"*

Isto não é assistente que responde pergunta. É **IA que executa ato de
escrituração** — lança, classifica, concilia, preenche, cobra. O produto ganha
com isso, e o risco muda de natureza: sugestão errada custa um clique; lançamento
errado custa fechamento contábil, obrigação acessória e defesa em fiscalização.

Este documento existe para que a diferença entre os dois esteja escrita **antes**
de existir código, e não seja decidida caso a caso por quem estiver com pressa.

Ele não freia a autonomia — ele define onde ela pode crescer sem que alguém
precise reconstruir a confiança depois.

---

## 2. O que já existe, e é a base

A ponte de IA de canal da S-22 já resolveu, para WhatsApp, cinco dos problemas
difíceis. O módulo `ia` **generaliza isto**, não recomeça:

| Peça existente | O que já garante |
| --- | --- |
| `channel_ai_invocations.autonomy_mode = 'DRAFT_ONLY'` | a IA propõe; quem publica é gente |
| `channel_ai_budget_daily` | teto de custo diário por organização, com reserva e commit |
| `channel_ai_conversation_locks` | uma execução por conversa, com token de cerca |
| `source_citations` + `validateDraftClaims` | afirmação sem fonte citada é recusada |
| `channel_critical_write_approvals` | escrita crítica exige aprovação prévia com prazo |
| `channel_ai_handoffs` | a IA sabe dizer "não sei" e passar para humano |
| `prompt_injection_signals_removed` | conteúdo de terceiro é tratado como hostil |

Quem for construir o módulo `ia` começa lendo
`20260804200000_stage22_ai_bridge.sql` e `20260804220000_stage22_security_hardening.sql`.
Reimplementar isso do zero seria repetir a S-22 e perder as correções da
VACINA-065.

---

## 3. Níveis de autonomia

Quatro níveis, declarados **por tipo de ato e por organização** — nunca globais,
nunca implícitos:

| Nível | O que a IA faz | Quem confirma |
| --- | --- | --- |
| **N0 — Sugerir** | mostra o que faria, não escreve nada | ninguém; é leitura |
| **N1 — Preencher** | preenche o rascunho, deixa para revisão | quem tem `update` no módulo |
| **N2 — Lançar com aprovação** | grava em estado `pendente de aprovação` | quem tem `approve` no módulo |
| **N3 — Lançar sozinha** | grava em estado final | ninguém, no ato; auditoria depois |

**O padrão de qualquer ato novo é N0.** Subir de nível é decisão explícita da
organização, registrada com quem decidiu e quando — nunca herdada de outro ato
nem inferida de "vinha funcionando bem".

---

## 4. O que nunca chega a N3

Independentemente de configuração, de acerto histórico ou de pedido do cliente:

| Nunca autônomo | Por quê |
| --- | --- |
| Assinar qualquer coisa | assinatura é ato de vontade de uma pessoa; não há como delegar |
| Emitir documento fiscal ou obrigação acessória | erro vira multa e responsabilidade do contribuinte, não do fornecedor de software |
| Mover dinheiro — pagar, liquidar, transferir | irreversível fora do sistema |
| Liberar conteúdo ao cliente (`release_to_client`) | a decisão de mostrar é do humano que responde por ela; regra já vigente no diário |
| Aprovar o que ela mesma produziu | aprovação por quem executou não é aprovação |
| Fechar período contábil | fechamento é declaração, não cálculo |
| Alterar permissão, alçada ou nível de autonomia | IA que amplia a própria autonomia não tem limite |

O último é o mais importante e o menos óbvio. Os outros seis são consequência de
efeito externo; esse é estrutural.

---

## 5. As quatro condições de qualquer ato autônomo

Um ato só pode passar de N1 se as quatro forem verdadeiras. Não são
recomendações — são pré-condições, e o que não as cumpre fica em N0/N1 por
definição.

**5.1 Fonte citada.** Todo número que a IA grava aponta o documento de origem —
nota, medição, extrato, contrato. Número sem origem rastreável não é lançamento,
é chute com aparência de lançamento. A validação de citação já existe.

**5.2 Reversível, com o desfazer escrito antes.** Se não existe caminho de
volta definido e testado, o ato não pode ser autônomo. Estorno de lançamento é
lançamento novo — nunca apagar linha.

**5.3 Rastro com antes-e-depois.** Fica registrado: modelo, versão do prompt,
fontes consultadas, custo, o que existia antes e o que passou a existir. É a peça
**E12** da espinha, e ela deixa de ser melhoria de auditoria para virar
pré-requisito de autonomia.

**5.4 Recusa possível.** A IA precisa poder responder "não tenho base para isto"
e devolver ao humano. Modelo que sempre responde é modelo que inventa quando não
sabe — e em escrituração, inventar é o pior resultado possível, pior que parar.

---

## 6. Orçamento, teto e ritmo

Herdado da S-22 e generalizado:

- **teto de custo diário por organização**, com reserva antes e commit depois;
- **teto de volume por tipo de ato** — 500 lançamentos automáticos numa
  madrugada é incidente, mesmo que cada um esteja certo;
- **uma execução por objeto**, com trava e token de cerca, para dois processos
  não lançarem o mesmo documento duas vezes;
- **degradação segura**: sem orçamento, sem provedor ou sem confiança, a IA cai
  para N0 e avisa. Nunca para em silêncio, nunca continua sem teto.

---

## 7. Onde a IA entra, por módulo

O valor está nos atos repetitivos com regra clara e fonte verificável. Nível
inicial proposto — todos sobem por decisão, nenhum nasce em N3:

| Módulo | Ato | Nível inicial | Fonte que ela cita |
| --- | --- | --- | --- |
| `contabilidade` | classificar lançamento em conta e centro de custo | N2 | histórico de classificação + plano de contas |
| `contabilidade` | conciliar extrato com títulos | N2 | extrato bancário + parcelas em aberto |
| `financeiro` | sugerir a parcela que um recebimento quita | N2 | valor, data e sacado |
| `compras` | ler nota de fornecedor e preencher o recebimento | N1 | o PDF/XML da nota |
| `estoque` | propor reposição pela regra mínimo/máximo | N2 | quantidade prevista (E6) |
| `diario` | redigir o diário a partir de apontamento e fotos | N1 | apontamentos do dia |
| `qualidade` | classificar não conformidade por causa | N1 | histórico de causas |
| `crm` | ler e-mail de lead e abrir oportunidade | N1 | a mensagem recebida |
| `sac` | rascunhar resposta com SLA e histórico | N1 | ocorrência + base de conhecimento |
| `documentos` | cobrar documento faltante e classificar o que chega | N2 | o pedido de documento (E9) |
| `rh` | conferir ponto contra escala e apontar divergência | N1 | marcações e escala |

**Nada nesta tabela é fiscal.** Emissão e transmissão continuam fora, conforme a
§4.

---

## 8. Como isto se relaciona com o resto

- **E12 (antes-e-depois na auditoria)** deixa de ser acabamento: é pré-requisito
  da condição 5.3. Sem ele, nenhum ato passa de N1.
- **E7 (relatórios de ausência)** é o primeiro emprego útil da IA operadora —
  varrer, achar o que falta e cobrar é exatamente o trabalho burocrático que
  ninguém quer fazer, e é reversível por natureza: cobrança errada custa um
  aviso, não um lançamento.
- **VACINA-065** vale integralmente: toda função que a IA chamar e receber
  `organization_id` por parâmetro confere participação. IA rodando como
  `service_role` sem conferir organização é a mesma porta aberta, com volume.
- **`MAPA-TECNOLOGICO.md` §37**: se o módulo `ia` exigir linguagem ou runtime
  novo, entra por ADR. A varredura de E7 roda no plano de execução em Go que já
  existe.

---

## 9. O que este documento ainda não tem

**Portão.** Nada aqui é verificado por CI hoje. O que é mecanicamente
verificável, quando o módulo existir:

- ato declarado em N2/N3 sem caminho de desfazer registrado → reprova;
- ato em N2/N3 cujo gravador não escreve antes-e-depois → reprova;
- ato na lista da §4 declarado acima de N1 → reprova;
- função chamada pela IA que recebe organização e não confere participação →
  já reprova hoje, por `validate:definer-com-guarda`.

Os três primeiros só podem ser escritos quando existir a tabela de atos. Ficam
como primeira tarefa do Marco `M-IA`, e **não como promessa deste documento** —
regra sem portão é acordo entre pessoas, e este repositório já mediu quanto isso
dura.

**Medição de acerto.** Não há aqui nenhum número sobre quanto a IA acerta,
porque não medimos ainda. Subir qualquer ato para N3 sem taxa de acerto medida
em produção, com denominador declarado, é decisão sem base — e este documento
não autoriza.
