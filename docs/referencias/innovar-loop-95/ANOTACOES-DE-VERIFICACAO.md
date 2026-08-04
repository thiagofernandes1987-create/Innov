# Anotações de verificação — pacote `innovar_loop_95`

**Este arquivo foi acrescentado ao pacote. Todo o resto é cópia literal do material recebido.**

## O que é este diretório

Blueprint e executable spec entregues pelo responsável em arquivo compactado, incorporados ao repositório pela tarefa T-04.7 do inventário de execução. 605 arquivos, 4,1 MB.

Até esta incorporação o material vivia apenas no contêiner de uma sessão e desaparecia com ele — o que contradizia a política de recuperação do projeto, que proíbe depender de arquivo temporário de contêiner.

**Isto é referência histórica, não código da plataforma.** Está fora do `eslint` (`eslint.config.mjs`), do `tsc` (`tsconfig.json`) e do `vitest` (`vitest.config.ts`). Nenhuma parte da aplicação importa daqui.

## Como este material foi usado

O desenho do Object Runtime — `diretrizes/OBJECT-RUNTIME.md` — nasceu deste pacote, mas não o copia. Do material vieram o vocabulário, o recorte de subsistemas e as máquinas de estado de referência (`03-statecharts/xstate/object-definition.machine.ts`). A arquitetura de armazenamento divergiu deliberadamente, pelas razões da seção 4 daquele documento.

## Defeitos verificados

Verificados por execução ou leitura direta dos arquivos, nesta cópia. **Não devem ser reproduzidos.**

### V-01 — A evidência empacotada não é reproduzível pelo script empacotado

`audit/round2/AUTO12-R2-100-ROUND-CAMPAIGN.json:6` e `audit/AUTO12-100-ROUND-CAMPAIGN.json:906` declaram `"PASS": 90`. Rodar o script empacotado produziu 23 `PASS`, 65 `OBSERVED` e 2 `FAIL`.

Justiça ao pacote: a própria auditoria dele já registrou isso como `AUD-EVD-002`, severidade `CRITICAL`, estado `OPEN` (`audit/round1-independent/TRACEABILITY_MATRIX_AUDIT.md:11`), com o diagnóstico correto — "o número de `PASS` pode ser interpretado como 90 comportamentos executados, quando grande parte apenas procura strings" (`FINDINGS_REGISTER.yaml:113`). O defeito está declarado e não resolvido, não escondido.

**Regra que fica:** evidência que não reproduz não é evidência. Contagem de `PASS` que mistura execução com busca de string mede a documentação, não o comportamento.

### V-02 — Asserção de contagem de migrations desatualizada

`audit/r2-uta/AUTO12-R2-100-ROUND-CAMPAIGN.json:285` afirma `migrations 0001-0014`; `audit/round2/AUTO12-R2-100-ROUND-CAMPAIGN.json:284` afirma `0001-0013`. O pacote traz **15** migrations, `0001_core.sql` a `0015_dlq_idempotency_resource_scope.sql`. O `RELEASE-MANIFEST.yaml:24` está correto em `0001-0015`; as asserções da campanha ficaram para trás.

É a mesma causa raiz da **VACINA-003** — ledger que diverge do estado real. Aqui divergiu dentro do próprio pacote.

### V-03 — Anti-replay em memória de processo com duas réplicas

`event_admin/server.py:79` define `NonceCache` e a docstring diz, com todas as letras, "Process-local anti-replay cache". `05-infra/helm/values.yaml:5` e `:14` configuram `replicas: 2`.

Com duas réplicas e cache por processo, o mesmo nonce é aceito uma vez em cada réplica. O contrato de uso único que o OpenAPI promete não é cumprido pela implementação de referência.

**Regra que fica:** garantia de unicidade precisa de estado compartilhado — banco ou cache externo. Estado em processo só serve quando o processo é único, e nenhum desenho que fala em réplicas tem processo único.

### V-04 — Ferramenta de build sem versão fixada

`scripts/check_sdk_drift.sh:9` roda `npx tsc -p tsconfig.json` sem versão. `audit/SDK-TSC-RESULT-METRICS.txt:1` registra o mesmo comando na evidência.

`npx` sem versão resolve para o que estiver disponível no dia. O resultado do verificador de drift passa a depender da data em que roda.

### V-05 — Piso de versão de Python não declarado

Nenhum `python_requires`, `requires-python` ou piso equivalente em `requirements-ci.txt`, `pytest.ini` ou na configuração do pacote. O código usa sintaxe moderna (`dict[str, int]` em `event_admin/server.py:84`), que exige 3.9 ou superior, mas nada declara o piso.

Ambiente que não declara o próprio piso não é reprodutível: funciona na máquina de quem escreveu e falha em outra sem mensagem útil.

### V-06 — POC de carga uma ordem de grandeza abaixo do requisito

O POC de carga do blueprint mira 100 mil registros. O requisito declarado pelo responsável é **milhões** por objeto de alto volume.

Este é o defeito mais perigoso do conjunto, porque é o único que **aprova**: um POC de 100 mil passa com folga numa arquitetura que quebra em milhões, e o resultado verde vira autorização para construir sobre a fundação errada.

`diretrizes/OBJECT-RUNTIME.md`, sprint S-11 do inventário de execução, fixa o alvo em milhões por essa razão.

## Situação de cada defeito no desenho atual

| ID | Situação em `OBJECT-RUNTIME.md` |
|---|---|
| V-01 | Contratos da seção 9 são medidos, não declarados; S-11 exige medição antes de promessa de escala |
| V-02 | Definição versionada com `checksum` e validador de CI para projeção divergente |
| V-03 | Nenhum estado de garantia em memória de processo; escrita por RPC no banco |
| V-04 | Fora do escopo do runtime; entra quando houver ferramenta de build própria |
| V-05 | Fora do escopo do runtime; o repositório já declara Node.js `>=24` e Python 3.13 no CI |
| V-06 | S-11 mira milhões e a arquitetura foi escolhida contra esse número |

## Limitação desta verificação

Os seis itens foram verificados por leitura e execução local, sem banco, sem cluster e sem navegador. Nada aqui afirma comportamento de produção do pacote de referência — apenas o que os arquivos dizem e o que o script empacotado produz quando executado.
