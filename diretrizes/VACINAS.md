# Vacinas de engenharia — Innovar Platform

**Documento canônico:** sim  
**Atualizado em:** 04 de agosto de 2026  
**Regra:** todo erro relevante gera causa raiz, prevenção reutilizável, varredura e evidência no mesmo PR.

## 1. Objetivo

Uma correção isolada resolve o sintoma. Uma vacina impede que a mesma causa raiz reapareça em outro módulo, etapa, ambiente ou implementação equivalente.

Fluxo obrigatório:

```text
erro detectado
→ reproduzir
→ separar sintoma de causa raiz
→ consultar catálogo
→ aplicar vacina existente ou registrar nova
→ varrer o repositório
→ corrigir equivalentes
→ adicionar prevenção no CI
→ documentar evidências e limitações
```

## 2. Protocolo

Antes de resolver, consultar o catálogo. Depois de resolver, responder:

1. Qual foi o problema;
2. Como ocorreu;
3. Por que aconteceu;
4. Como foi detectado;
5. Qual foi a solução.

Vacina pode ser substituída somente em PR próprio, preservando garantia igual ou maior e demonstrando ganho material. A vacina substituída permanece no histórico.

## 3. Estado das vacinas

| ID | Causa raiz | Estado | Prevenção principal |
|---|---|---|---|
| `VACINA-001` | relação Supabase variável | aplicada | helpers canônicos de relação |
| `VACINA-002` | validador acoplado à forma textual | aplicada | validação semântica |
| `VACINA-003` | ledger local diverge do remoto | aplicada | validador de migrations |
| `VACINA-004` | função herda `EXECUTE` indevido | aplicada | revoke explícito |
| `VACINA-005` | estado crítico alterado fora da RPC | aplicada | guards e testes negativos |
| `VACINA-006` | actions usam runtime obsoleto | aplicada | Node 24 e varredura |
| `VACINA-007` | scanner confunde placeholder e segredo | aplicada | classificação semântica |
| `VACINA-008` | CI e homologação instalam diferente | aplicada | política pnpm única |
| `VACINA-009` | E2E valida pré-requisito tarde | aplicada | preflight e artefato inicial |
| `VACINA-010` | JSON montado manualmente | aplicada | `JSON.stringify` |
| `VACINA-011` | identificador reservado em scripts | aplicada | nomes semânticos e scanner |
| `VACINA-012` | documentação diverge do estado real | aplicada | manifesto e bloqueio de frases obsoletas |
| `VACINA-013` | fixture contorna campo sensível | aplicada | fronteira autorizada e fixture mínima |
| `VACINA-014` | lista fixa de migrations/testes envelhece | aplicada | descoberta lexical |
| `VACINA-015` | efeito colateral dentro de setState | aplicada | cálculo fora do atualizador |
| `VACINA-016` | validador perde procedência de vacina | aplicada | citação junto do código protegido |
| `VACINA-017` | parser assume LF | vigente | normalização CRLF/LF |
| `VACINA-018` | login confunde infraestrutura e credencial | vigente | classificação por código/status |
| `VACINA-019` | breakpoint remove navegação | vigente | destino equivalente responsivo |
| `VACINA-020` | `pg_isready` aprova bootstrap incompleto | vigente | marcador de bootstrap |
| `VACINA-021` | DDL oculta custo de RLS/FK | vigente | advisor pós-DDL |
| `VACINA-022` | persona diverge da autorização | vigente | guard persona–papel |
| `VACINA-023` | amostra exige efeito de produção | vigente | persistência explicitamente desligável |
| `VACINA-024` | conteúdo corta sem overflow global | vigente | inspeção de card/breakpoint |
| `VACINA-025` | lint aceita warnings | vigente | `--max-warnings=0` |
| `VACINA-026` | teste não executado passa | vigente | pré-requisito obrigatório |
| `VACINA-027` | mock aprovado não chega ao código | vigente | QA de fidelidade |
| `VACINA-028` | capacidade não tem porta de entrada | vigente | cobertura menu–rota–persona |
| `VACINA-029` | runner Python depende de POSIX | vigente | wrapper Node portátil |
| `VACINA-030` | menu desktop é recortado | vigente | modo compacto intermediário |
| `VACINA-031` | estado mistura tokens de tema | vigente | tokens semânticos completos |
| `VACINA-032` | função de extensão sem schema | vigente | qualificação `extensions.*` |
| `VACINA-033` | simulador e provider concluem estados diferentes | vigente | RPC transacional única |
| `VACINA-034` | permissão é confundida com independência | vigente | segundo ator obrigatório |
| `VACINA-035` | `CASE` textual alimenta enum | vigente | casts explícitos |
| `VACINA-036` | consulta presume coluna inexistente | vigente | contrato real da tabela |
| `VACINA-037` | orçamento sem composição/formação | vigente | readiness e testes de banco |
| `VACINA-038` | fonte externa publicada sem evidência | vigente | origem, data-base, hash e fail-closed |
| `VACINA-039` | fonte mensal altera histórico | vigente | snapshot imutável |
| `VACINA-040` | fluxo obriga documento predecessor | vigente | modo explícito e FK opcional |
| `VACINA-041` | alçada existe só na interface | vigente | regra no banco e trilha |
| `VACINA-042` | falha de formulário apaga contexto | vigente | `useActionState` e dependências separadas |
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
| `VACINA-059` | `TRUNCATE` não passa por RLS, e 213 tabelas o concediam a `anon` e `authenticated` — inclusive `emitted_documents`, cuja imutabilidade vinha só da ausência de política | aplicada | `revoke truncate, trigger, references` em todo o esquema e no padrão de privilégios, `revoke update, delete` no documento emitido, e o instantâneo do ledger passou a carregar os privilégios perigosos, conferidos no CI |
| `VACINA-060` | Leitor que não entende o arquivo responde zero, e zero é um número plausível — o pacote SINAPI mudou de formato, o botão dizia "0 insumos válidos" e 61% dos itens analíticos entravam custando nada | aplicada | leitor do formato publicado com as quatro armadilhas recusadas em vez de adivinhadas, custo da sub-composição vindo da aba que já estava carregada, `pnpm sinapi:layout` cobrando o contrato contra o pacote de hoje, `prebuild` apontado para o leitor em uso, `automatic-update-v2.ts` removido, e ausência de custo representada como ausência — `price_status` de vocabulário fechado, `check` amarrando custo e status, e `items_without_cost` na versão |
| `VACINA-061` | Guarda que lê o valor **novo** do campo que decide se ela se aplica é guarda opcional para quem sabe qual campo desligar — trocar `source_key` tornava o custo publicado pela CAIXA editável, com a procedência intacta ao lado | aplicada | a regra passou a olhar o que a linha **é**: recusa no `UPDATE` quando era oficial **ou** quando passaria a ser, conferência contra o pai antigo e novo nos filhos, o CUB com gatilho além da RLS, e `revoke` de escrita nas tabelas de sistema |
| `VACINA-062` | Correção visual considerada concluída sem observar o preview publicado | vigente | captura obrigatória no mesmo viewport, tema e persona, comparação antes/depois e revisão de logs |
| `VACINA-063` | Rede lógica tratada como linhas independentes permite ciclo, duplicidade ou referência fora do escopo | parcial | validação de escopo, duplicidade, hierarquia e ciclo antes da gravação; RPC transacional concorrente ainda pendente |
| `VACINA-064` | Aplicativo declarado no registry do código e ausente de `app_modules` some da central sem erro nenhum | vigente | `validate:modulos-semeados` cruza registry, semeadura, menus e roteador nas cinco direções |
| `VACINA-065` | Função `security definer` que recebe `organization_id` por parâmetro e é concedida a `authenticated` escreve em empresa alheia sem conferir participação | vigente | `validate:definer-com-guarda` exige guarda no corpo; sete funções corrigidas com o guarda da própria família |
| `VACINA-066` | Regra que manda o achado novo para o fim do arquivo protege o foco e espalha a lógica do módulo, porque trata posição física e dono lógico como a mesma coisa | vigente | Marco vira rótulo; `validate:inventory` exige `Marco:` na sprint e impede fechar Marco com sprint aberta apontando para ele (R9) |
| `VACINA-067` | Número afirmado em documento canônico envelhece e passa a mentir com cara de medição — em 11/08/2026, cinco documentos diziam 54 validadores — inclusive o `CLAUDE.md` — quando o real era 43 | vigente | `validate:numeros-afirmados` confere as quantidades declaradas contra o repositório e acusa documento que se contradiz na data; citação com data no entorno é isenta, porque medição datada não envelhece |

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
├── VACINA-058-ACAO-INEXISTENTE-EM-HAS-MODULE-PERMISSION-NEGA-TODO-MUNDO.md
├── VACINA-059-RLS-NAO-COBRE-TRUNCATE.md
├── VACINA-060-LEITOR-QUE-NAO-ENTENDE-O-ARQUIVO-RESPONDE-ZERO.md
├── VACINA-061-GUARDA-QUE-LE-O-VALOR-NOVO-DO-CAMPO-QUE-DECIDE-A-GUARDA.md
├── VACINA-062-CORRECAO-VISUAL-EXIGE-CAPTURA-DO-PREVIEW.md
├── VACINA-063-REDE-LOGICA-VALIDADA-ANTES-DA-GRAVACAO.md
├── VACINA-064-MODULO-DECLARADO-NO-CODIGO-E-AUSENTE-DO-CATALOGO.md
├── VACINA-065-DEFINIDORA-QUE-RECEBE-A-ORGANIZACAO-E-NAO-CONFERE-PARTICIPACAO.md
├── VACINA-066-REGRA-QUE-PROTEGE-O-FOCO-DESTROI-A-COERENCIA.md
└── VACINA-067-NUMERO-AFIRMADO-EM-DOCUMENTO-CANONICO-ENVELHECE.md
```

## 5. Aplicação no Encerramento da Etapa 22

A Etapa 22 reutiliza especialmente `VACINA-002`, `VACINA-007`, `VACINA-009`, `VACINA-012`, `VACINA-014`, `VACINA-016`, `VACINA-021`, `VACINA-025` e `VACINA-026`.

Regra de fechamento:

```text
evidência sintética aprovada
≠ homologação real
≠ piloto real
≠ autorização de produção
```

- QR, pairing, número, sessão, tráfego e piloto reais permanecem `BLOCKED_NOT_EXECUTED` quando não houve execução objetiva;
- dependência externa não recebe check por possuir documentação ou teste fake;
- o inventário, o manifesto, a decisão e as evidências precisam concordar;
- CI verde comprova o head testado, não autoriza operação externa;
- PR permanece draft até revisão técnica e de segurança.

Essa aplicação não cria uma vacina nova porque as causas raiz já são cobertas: documentação divergente, teste não executado tratado como sucesso e validador textual sem contrato semântico.

## 6. Critérios para nova vacina

Criar nova vacina quando a causa raiz for inédita, tiver risco de recorrência e puder ser prevenida por padrão, teste ou CI. Não criar vacina apenas para registrar uma decisão de projeto já coberta.

## 7. Definition of Done de erro

- [ ] causa raiz registrada;
- [ ] vacina existente aplicada ou nova vacina criada;
- [ ] repositório varrido;
- [ ] ocorrências equivalentes corrigidas;
- [ ] teste negativo criado;
- [ ] CI atualizado;
- [ ] documentação da etapa atualizada;
- [ ] limitações registradas;
- [ ] correção confirmada em CI ou homologação aplicável.
