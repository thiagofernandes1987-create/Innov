# Vacinas de engenharia — Innovar Platform

**Documento canônico:** sim  
**Regra:** todo erro relevante gera registro de causa raiz e prevenção reutilizável no mesmo PR.

## 1. Objetivo

Uma correção isolada resolve o sintoma. Uma **vacina** impede que a mesma causa raiz reapareça em outro módulo, etapa, ambiente ou implementação equivalente.

Cada erro detectado deve produzir, quando aplicável:

1. identificação da causa raiz;
2. arquivo `diretrizes/vacinas/VACINA-NNN-*.md`;
3. solução compartilhada ou padrão arquitetural;
4. varredura dos módulos suscetíveis;
5. correção das ocorrências equivalentes;
6. teste negativo ou validador automático;
7. atualização das diretrizes e do documento técnico da etapa;
8. referência no PR e no histórico.

## 2. Fluxo obrigatório

```text
erro detectado
→ reproduzir
→ separar sintoma de causa raiz
→ consultar catálogo de vacinas
→ aplicar vacina existente OU registrar nova vacina
→ procurar a mesma causa no repositório
→ corrigir módulos afetados
→ adicionar prevenção no CI
→ documentar evidências e limitações
```

Não é permitido encerrar um erro recorrente apenas com correção local quando existe uma causa raiz reutilizável.

### 2.1 Consulta obrigatória — antes de resolver

Este catálogo é **memória consultável**, não histórico. Diante de qualquer erro, teste quebrado ou comportamento inesperado, antes de propor correção:

1. reproduzir;
2. separar sintoma de causa raiz;
3. **consultar este catálogo**: essa causa raiz já apareceu?
4. se já apareceu, **aplicar a mesma solução registrada** — não inventar outra, não "melhorar" a registrada sem discussão;
5. se a solução registrada deixou de servir, isso é informação relevante: registrar por que deixou de servir.

Resolver do zero um problema já catalogado gera duas soluções diferentes para a mesma causa raiz, e é assim que a base fica incoerente.

### 2.2 Registro obrigatório — depois de resolver

Problema inédito é resolvido e então registrado. O registro responde **cinco perguntas**, todas obrigatórias:

| Campo | Pergunta |
|---|---|
| Qual foi o problema | o que quebrou, em termos observáveis |
| Como ocorreu | a sequência concreta que levou até a falha |
| Por que aconteceu | a causa raiz, não o sintoma |
| Como foi detectado | teste, CI, auditoria, uso ou relato — e por que não foi detectado antes |
| Qual foi a solução | o que se fez e o que impede a reincidência |

Modelo do arquivo, criado no mesmo PR da correção:

```markdown
# VACINA-NNN — <assunto>

**Estado:** aplicada | parcial | proposta
**Detectada em:** <etapa / PR / auditoria>

## Qual foi o problema
## Como ocorreu
## Por que aconteceu
## Como foi detectado
## Qual foi a solução
## Varredura e ocorrências equivalentes
## Prevenção automática
## Limitações da prevenção
```

### 2.3 Substituição — quando a solução nova é melhor que a registrada

Uma vacina pode ser substituída. Catálogo congelado apodrece: a melhor solução de seis meses atrás pode ser a pior de hoje, e sem caminho de substituição a regra ruim passa a ser contornada em silêncio.

A substituição passa por **dois portões, nesta ordem**:

1. **Garantia preservada — eliminatório.** A solução nova cobre a mesma causa raiz com garantia igual ou maior. Retorno sobre investimento aplicado a proteção produz a conclusão errada com cara de maturidade (*"o risco é baixo, o custo é alto, vale abrir mão"*); por isso este portão vem antes e não é negociável.
2. **Retorno material.** Só entre as soluções que passam no portão 1 é que desempenho, custo, complexidade e manutenção decidem. O ganho precisa ser **material**, não apenas mensurável: ordem de grandeza, eliminação de uma classe de falha ou redução real de superfície. Troca por ganho marginal custa retreino, redocumentação e risco de regressão.

**A comparação é executada e commitada.** Um script que qualquer pessoa roda de novo, não um número no documento. O tipo de evidência é declarado: `medida` (bancada comparativa), `negativa` (teste que prova que a causa raiz continua bloqueada, quando não se pode rodar a versão vulnerável) ou `argumento` (quando as duas anteriores são impossíveis — e aí o peso da decisão sobe).

**Momento proibido:** substituir uma vacina **no mesmo PR da correção que ela barrou**. O valor da vacina é vencer o julgamento do momento; se quem está sendo barrado puder removê-la no instante em que é barrado, a proteção deixa de existir. A correção sai conforme a vacina vigente; a substituição vai para PR próprio, decidida pelo responsável. Sessão assistida propõe, não substitui.

A vacina antiga passa a `substituída` e permanece no repositório. O campo `Substitui:` da nova aponta para ela. Estrutura completa do registro de substituição, com todos os campos obrigatórios, em `diretrizes/METODO-DE-TRABALHO.md`, seção 3.5.

O método de trabalho que envolve este protocolo está em `diretrizes/METODO-DE-TRABALHO.md`.

## 3. Estado das vacinas

Vocabulário de estado: `vigente` (grafado historicamente como `aplicada`), `parcial`, `proposta`, `substituída` e `revogada`. Nenhuma vacina é removida da tabela — substituída e revogada permanecem, com o apontamento de quem as sucedeu.

| ID | Causa raiz | Estado | Prevenção principal |
|---|---|---|---|
| `VACINA-001` | Relações Supabase podem chegar como `objeto | array | null` | aplicada | normalização central em `lib/supabase/relations.ts` e CI |
| `VACINA-002` | Validador acoplado à forma textual, não ao contrato | aplicada | validação semântica e arquivos reais |
| `VACINA-003` | Ledger local de migrations diverge do Supabase remoto | aplicada | `validate-supabase-migrations.mjs` |
| `VACINA-004` | Função PostgreSQL herda `EXECUTE` de `PUBLIC/anon` | aplicada | revoke explícito, auditoria e migrations de privilégio mínimo |
| `VACINA-005` | Estado crítico pode ser alterado fora da RPC de domínio | aplicada | privilégios por coluna, guards por identidade SQL e testes negativos |
| `VACINA-006` | Workflows usam actions com runtime Node.js 20 obsoleto | aplicada | majors Node.js 24 e varredura de todos os workflows |
| `VACINA-007` | Scanner de segredos confunde placeholders com credenciais | aplicada | classificação semântica do valor e varredura histórica preservada |
| `VACINA-008` | CI e homologação usam políticas diferentes de instalação | aplicada | versão/política pnpm alinhadas em todos os workflows |
| `VACINA-009` | E2E valida pré-requisitos tarde e perde relatório | aplicada | secrets antes da instalação e artefato inicial obrigatório |
| `VACINA-010` | JSON de workflow montado manualmente em shell | aplicada | `JSON.stringify` e validação de artefato parseável |
| `VACINA-011` | Script usa identificador reservado `module` | aplicada | nomes semânticos e varredura de `scripts/*.mjs` |
| `VACINA-012` | Documentação pós-merge diverge do estado real do GitHub | aplicada | `ESTADO-ATUAL.json`, fechamento pós-merge e bloqueio de frases obsoletas |
| `VACINA-013` | Fixture técnica tenta escrever coluna sensível diretamente | aplicada | fixture mínima, guards preservados e valores sensíveis somente por RPC autorizada |
| `VACINA-014` | Runner de teste de banco encadeia migrations por lista fixa e envelhece | aplicada | descoberta por padrão de nome, ordem lexicográfica e contagem impressa |
| `VACINA-015` | Efeito colateral disparado dentro do atualizador de `setState` | aplicada | próximo estado calculado fora do atualizador e verificação em navegador com console tratado como reprovação |
| `VACINA-016` | Trocar lista fixa por descoberta apagou a citação que outro validador cobrava | aplicada | procedência da vacina citada em comentário junto do código protegido, e `validate:docs` promovido a portão de CI |
| `VACINA-017` | Parser de documento assume LF e falha em checkout CRLF | vigente | normalização `/\r?\n/` na entrada e teste do validador no checkout real |
| `VACINA-018` | Login atribui falha de infraestrutura às credenciais | vigente | classificação por `code`/`status`, transporte cercado e teste por família de causa |
| `VACINA-019` | Breakpoint esconde navegação sem oferecer modo equivalente | vigente | menu responsivo com os mesmos destinos, alvo de 44 px e teste de marcação |
| `VACINA-020` | `pg_isready` aprova o servidor temporário do bootstrap | vigente | marcador de bootstrap concluído antes da sondagem de prontidão |
| `VACINA-021` | DDL funcional deixa custo de RLS e FKs invisível em teste pequeno | vigente | advisor pós-DDL, initplan de `auth.uid()` e índices de cobertura |
| `VACINA-022` | Persona documentada não concorda com papel e autorização do ator | vigente | guard persona–papel, evento próprio e teste sob identidade real |
| `VACINA-023` | Amostra visual herda efeito de produção e exige sessão real | vigente | persistência explícita, ligada por padrão e desligada só na fixture |
| `VACINA-024` | Conteúdo interno corta sem causar overflow global | vigente | inspeção do card e empilhamento de título/SLA no breakpoint |
| `VACINA-025` | Lint retorna sucesso mesmo acumulando avisos | vigente | `--max-warnings=0` e correção da lógica denunciada |
| `VACINA-026` | Runner retorna sucesso quando o teste de banco não executa | vigente | PostgreSQL Docker portátil, confirmação mínima e falha sem pré-requisito |
| `VACINA-027` | Mock aprovado não chega à implementação por falta de comparação | vigente | fonte visual versionada, captura no mesmo viewport e QA lado a lado |
| `VACINA-028` | Capacidade existe sem menu, ação primária ou rotina que a exercite | vigente | cobertura módulo–menu–rota–persona e fluxo documental completo |
| `VACINA-029` | Runner Python usa sintaxe de ambiente específica de POSIX | vigente | wrapper Node define ambiente e interpretador por plataforma |
| `VACINA-030` | Menu inline é recortado na largura intermediária | vigente | menu compacto em notebooks e teste estrutural de breakpoint |
| `VACINA-031` | Estado mistura token de fundo com primeiro plano fixo | vigente | cores semânticas em texto, fundo e borda, validadas por teste |
| `VACINA-032` | `SECURITY DEFINER` usa função de extensão sem schema explícito | vigente | `extensions.digest`, varredura das definições finais e portão de CI |
| `VACINA-033` | Simulador e provedor concluem estados de negócio diferentes | vigente | RPC transacional única chamada por todos os adaptadores |
| `VACINA-034` | Permissão de aprovação é confundida com independência do aprovador | vigente | bloqueio de solicitante/selecionador e cenário com segundo ator |
| `VACINA-035` | `CASE` textual alimenta coluna enum sem tipo explícito | vigente | casts enum por ramo e execução real das transições |
| `VACINA-036` | Consulta presume coluna convencional ausente no schema real | vigente | ordem derivada da linha da solicitação e fluxo até saldo físico |
| `VACINA-037` | Orçamento existe sem composição, procedência ou formação de preço utilizável | vigente | bloqueios de prontidão, classificação de itens, UI completa e `test:db:budgets` |
| `VACINA-038` | Fonte externa é tratada como dado confiável sem origem, data-base e coerência | vigente | domínio oficial, hashes, validações fail-closed e teste do parser |
| `VACINA-039` | Atualização mensal de referência pode alterar orçamento histórico | vigente | snapshot por UF/data/regime/hash, catálogo oficial imutável e custo copiado |
| `VACINA-040` | Fluxo comercial obrigatório exclui projeto ou proposta sem documento predecessor | vigente | modo explícito, FK opcional, data de corte e validação estrutural |
| `VACINA-041` | Alçada comercial existe apenas como campo de interface | vigente | regra no banco, decisão independente, trilha e teste negativo |
| `VACINA-042` | Falha de formulário apaga preenchimento, mistura dependências e pode deixar o autor sem acesso | vigente | `useActionState`, erros por campo, dependências separadas, membership e papel preservado |
| `VACINA-043` | Cor amostrada da referência escura vira texto invisível no tema claro | aplicada | token no lugar do hex em superfície que muda, e auditoria de contraste medida nos dois temas |
| `VACINA-044` | Grade de faixa única sem `minmax(0, …)` não encolhe e a página rola de lado | aplicada | faixa declarada como `minmax(0, 1fr)`, tabela com rolagem própria e verificação de transbordo nos três breakpoints |
| `VACINA-045` | Numeração de linha contada por `\n` erra assim que a linha quebra sozinha | aplicada | numeração por espelho, com fonte, largura de conteúdo e rolagem compartilhadas com o campo |
| `VACINA-046` | Medidor de alvo de toque reprova a caixa de marcar em vez de medir o rótulo que responde ao toque | aplicada | o medidor resolve a associação de rótulo antes de reprovar, e a correção é verificada nos dois sentidos |
| `VACINA-047` | Constante exportada de módulo `"use server"` chega ao cliente como `undefined` | aplicada | tipo e valor inicial moram no módulo puro, e a action importa de lá |
| `VACINA-048` | `textarea` enviado por formulário chega com CRLF e nunca bate com o que está na tela | aplicada | normalização para `\n` na entrada da action, antes de gravar, comparar ou versionar |
| `VACINA-049` | Salvar rebaixava modelo publicado a rascunho em silêncio | aplicada | estado seguinte decidido a partir do atual, e mudança de publicação exigida também na política do banco |
| `VACINA-050` | Acervo compartilhado amarrado ao módulo que o emite transforma toda circulação legítima em exceção | aplicada | aplicativo próprio para o acervo, tipo classifica, disponibilização por aplicativo separada da permissão, e teste que exige o mesmo documento em mais de um módulo |
| `VACINA-051` | `select` controlado perde a seleção no DOM na volta da server action, e é o DOM que o formulário envia | aplicada | efeito que reencosta o DOM no estado após cada renderização, e comparação por número entre o que foi conferido e o que foi gravado |
| `VACINA-052` | Embed entre tabelas com dois caminhos devolve PGRST201 e derruba a consulta inteira — a tela de obras listava zero com duas no banco | aplicada | chave nomeada em todo embed ambíguo, falha de carga separada de registro inexistente, e validador que reconstrói o grafo de chaves estrangeiras a partir das migrations |
| `VACINA-053` | Chave de módulo ausente de `app_modules` faz o guarda negar todo mundo em silêncio, inclusive `SUPER_ADMIN` | aplicada | guarda por participação na organização onde a intenção é universal, migration de semeadura para o módulo `modelos`, log em falha silenciosa e validador de chaves citadas em SQL |
| `VACINA-054` | `Escape` com lista de sugestão aberta fechava o formulário inteiro e descartava o preenchimento | aplicada | camada interna aberta consome a tecla e barra a propagação, e roteiro que exige formulário aberto no primeiro `Escape` e fechado no segundo |
| `VACINA-055` | Embed sem chave estrangeira devolve PGRST200 e derruba a consulta; e validador aprova tanto por estar certo quanto por não enxergar | aplicada | leitura em duas consultas com `lib/pessoas/nomes.ts`, ramo de PGRST200 no validador de embeds, leitor de `select` sensível a profundidade e universo de tabelas vindo dos `create table` |
| `VACINA-056` | Verificação que sai 0 quando a dependência falta, e que não está em workflow nenhum, é indistinguível de verificação que passou | aplicada | `--exigir` nos dois scripts que se autodispensavam, e confronto de RPCs chamadas contra declaradas no `validate:code-map`, com débito congelado e responsável nomeado |
| `VACINA-057` | Validador que confere o arquivo aprova enquanto o efeito não existe — três tabelas do Object Runtime passaram 40 dias ausentes do banco com o CI verde | aplicada | `validate:migrations-applied` cruza arquivos com o ledger de aplicadas, por nome lógico, com instantâneo datado e débito congelado |
| `VACINA-058` | Ação inexistente em `has_module_permission` cai no `else false` e nega todo mundo, inclusive SUPER_ADMIN — `publish_object_definition` nunca foi executável, e a fixture de teste era mais permissiva que a função real | aplicada | as três RPCs pedem `administer`, a fixture honra o vocabulário fechado das seis ações e `validate:module-keys` confere o quinto argumento sobre o estado final das funções |

## 4. Arquivos

```text
diretrizes/vacinas/
├── VACINA-001-RELACOES-SUPABASE.md
├── VACINA-002-VALIDADORES-SEMANTICOS.md
├── VACINA-003-LEDGER-MIGRATIONS-SUPABASE.md
├── VACINA-004-PRIVILEGIOS-RPCS.md
├── VACINA-005-WORKFLOW-PROTEGIDO.md
├── VACINA-006-RUNTIME-GITHUB-ACTIONS.md
├── VACINA-007-SCANNER-DE-SEGREDOS.md
├── VACINA-008-INSTALACAO-HOMOLOGACAO.md
├── VACINA-009-PREREQUISITOS-E-RELATORIO-E2E.md
├── VACINA-010-JSON-DE-RELATORIOS.md
├── VACINA-011-IDENTIFICADORES-RESERVADOS-NODE-NEXT.md
├── VACINA-012-ESTADO-POS-MERGE.md
├── VACINA-013-FIXTURES-RESPEITAM-FRONTEIRAS-SENSIVEIS.md
├── VACINA-014-LISTA-FIXA-DE-MIGRATIONS-EM-TESTE.md
├── VACINA-015-EFEITO-DENTRO-DO-ATUALIZADOR-DE-ESTADO.md
├── VACINA-016-VALIDADOR-QUE-CITA-OUTRO-VALIDADOR.md
├── VACINA-017-VALIDADOR-PORTAVEL-CRLF.md
├── VACINA-018-ERRO-DE-AUTENTICACAO-POR-CODIGO.md
├── VACINA-019-NAVEGACAO-RESPONSIVA-SEM-SUMIR.md
├── VACINA-020-PRONTIDAO-POSTGRES-CONTAINER.md
├── VACINA-021-DDL-CONFERIDO-PELO-ADVISOR.md
├── VACINA-022-PERSONA-E-AUTORIZACAO-COERENTES.md
├── VACINA-023-AMOSTRA-SEM-EFEITO-DE-PRODUCAO.md
├── VACINA-024-METADADO-RESPONSIVO-SEM-CORTE.md
├── VACINA-025-LINT-SEM-AVISO-ACEITO.md
├── VACINA-026-TESTE-NAO-EXECUTADO-NAO-PASSA.md
├── VACINA-027-MOCK-APROVADO-EXIGE-QA-DE-FIDELIDADE.md
├── VACINA-028-CAPACIDADE-EXIGE-PORTA-DE-ENTRADA.md
├── VACINA-029-RUNNER-PYTHON-PORTAVEL.md
├── VACINA-030-MENU-DESKTOP-SEM-CORTE.md
├── VACINA-031-ESTADO-SEMPRE-USA-TOKENS-DE-TEMA.md
├── VACINA-032-FUNCAO-DE-EXTENSAO-QUALIFICADA.md
├── VACINA-033-SIMULADOR-E-PROVEDOR-CONCLUEM-O-MESMO-DOMINIO.md
├── VACINA-034-APROVACAO-EXIGE-ATOR-INDEPENDENTE.md
├── VACINA-035-TRANSICAO-ENUM-TIPADA.md
├── VACINA-036-CONSULTA-SEGUE-CONTRATO-REAL-DA-TABELA.md
├── VACINA-037-ORCAMENTO-EXIGE-COMPOSICAO-E-FORMACAO-DE-PRECO.md
├── VACINA-038-FONTE-EXTERNA-NAO-PUBLICA-SEM-EVIDENCIA.md
├── VACINA-039-FONTE-MENSAL-NAO-ALTERA-ORCAMENTO-HISTORICO.md
├── VACINA-040-FLUXO-NAO-OBRIGA-DOCUMENTO-ANTERIOR.md
├── VACINA-041-ALCADA-NAO-E-SOMENTE-CAMPO.md
├── VACINA-042-FALHA-DE-FORMULARIO-NAO-APAGA-CONTEXTO.md
├── VACINA-043-COR-AMOSTRADA-DA-REFERENCIA-ESCURA.md
├── VACINA-044-GRADE-DE-FAIXA-UNICA-NAO-ENCOLHE.md
├── VACINA-045-NUMERO-DE-LINHA-ACOMPANHA-A-LINHA-QUE-QUEBRA.md
├── VACINA-046-ALVO-DE-TOQUE-E-O-ROTULO-NAO-A-CAIXA.md
├── VACINA-047-USE-SERVER-SO-EXPORTA-FUNCAO.md
├── VACINA-048-TEXTAREA-ENVIA-CRLF.md
├── VACINA-049-SALVAR-NAO-MUDA-ESTADO-DE-PUBLICACAO.md
├── VACINA-050-ACERVO-COMPARTILHADO-NAO-SE-PRENDE-AO-EMISSOR.md
├── VACINA-051-SELECT-PERDE-O-DOM-NA-VOLTA-DA-SERVER-ACTION.md
├── VACINA-052-EMBED-AMBIGUO-DEVOLVE-PGRST201-E-DERRUBA-A-CONSULTA-INTEIRA.md
├── VACINA-053-CHAVE-DE-MODULO-INEXISTENTE-NEGA-TODO-MUNDO.md
├── VACINA-054-ESCAPE-FECHA-UMA-CAMADA-POR-VEZ.md
├── VACINA-055-EMBED-DE-RELACAO-INEXISTENTE-E-O-VALIDADOR-QUE-NAO-ENXERGA.md
├── VACINA-056-VERIFICACAO-QUE-SE-AUTODISPENSA-PARECE-VERIFICACAO-QUE-PASSOU.md
├── VACINA-057-VALIDADOR-CONFERE-O-ARTEFATO-E-NAO-O-EFEITO.md
└── VACINA-058-ACAO-INEXISTENTE-EM-HAS-MODULE-PERMISSION-NEGA-TODO-MUNDO.md
```

## 5. Critérios para nova vacina

Criar nova vacina quando pelo menos uma condição ocorrer:

- o erro já apareceu em mais de um arquivo ou módulo;
- há risco de reaparecer em etapas futuras;
- a correção depende de uma convenção não óbvia;
- envolve segurança, multiempresa, RLS, migrations, idempotência, concorrência ou imutabilidade;
- o CI poderia detectar preventivamente;
- a causa raiz é diferente das vacinas existentes.

## 6. Definition of Done de erro

- [ ] causa raiz registrada;
- [ ] vacina existente aplicada ou nova vacina criada;
- [ ] repositório varrido pela mesma causa;
- [ ] ocorrências equivalentes corrigidas;
- [ ] teste negativo criado;
- [ ] CI atualizado;
- [ ] documentação da etapa atualizada;
- [ ] limitações registradas;
- [ ] correção confirmada em CI ou homologação aplicável.
