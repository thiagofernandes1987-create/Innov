# Campanha QA — S-23 Documentos e Planejamento

**Data:** 29 de julho de 2026  
**Branch:** `feat/planning-teams-capacity-loop`  
**PR:** `#26`  
**Estado:** microblocos concluídos; sprint S-23 continua em andamento

## 1. Objetivo

Fechar dois microblocos verificáveis da sprint ativa S-23:

1. remover a relação ambígua e o erro técnico cru da coleção de Documentos;
2. oferecer lista, cartões e calendário reais sobre a mesma carteira de Planejamento.

Durante o replay limpo, a bateria revelou defeitos antigos nas fixtures de orçamento e SINAPI. Eles foram corrigidos sem enfraquecer triggers, RLS, segregação ou imutabilidade.

## 2. Ciclo executado

```text
reproduzir
→ consultar inventário, método, fluxos e vacinas
→ corrigir o menor contrato verificável
→ abrir PR
→ executar replay limpo
→ analisar a primeira falha
→ corrigir a causa raiz
→ repetir até lint, tipos, testes e build
→ verificar Supabase e preview
```

## 3. Documentos

### Antes

A coleção usava um embed de contagem entre `project_documents` e `project_document_versions`. Como existem dois vínculos entre essas tabelas, o PostgREST podia considerar a relação ambígua. A mensagem técnica do provedor era exibida diretamente ao usuário.

### Depois

- relação do projeto qualificada por `project_documents_project_id_fkey`;
- versões consultadas separadamente e agregadas por documento;
- coleção vazia não consulta versões;
- falha apresenta mensagem estável de domínio;
- log contém apenas contexto e código estável do provedor.

### Cenários

| Cenário | Resultado |
|---|---|
| documentos com versões | contagem agregada por documento |
| coleção vazia | sem consulta desnecessária de versões |
| falha na coleção ou nas versões | mensagem segura, sem SQL/PostgREST na interface |

## 4. Planejamento

A página mantém uma consulta e um conjunto de filtros, mas permite trabalhar os mesmos projetos em:

- **Lista:** comparação operacional por etapa, responsável, progresso, folga e situação;
- **Cartões:** leitura executiva e acesso ao cronograma;
- **Calendário:** término previsto e marcos futuros.

A preferência usa `useSyncExternalStore` sobre `localStorage`, com suporte a hidratação, atualização local e evento entre abas. Não há `setState` síncrono dentro de efeito.

## 5. Replay limpo e orçamento

O loop encontrou e corrigiu quatro defeitos de evidência:

1. bootstrap limpo não reproduzia privilégios padrão dos papéis da API do Supabase;
2. fixture tentava inserir conteúdo depois de congelar a versão;
3. variável `psql` era usada dentro de bloco `DO`;
4. importação oficial SINAPI era executada com identidade diferente da rotina de backend.

A suíte continua exigindo seis confirmações nominais:

1. orçamento vazio bloqueado;
2. composição, impostos e margem aprovados;
3. autoaprovação bloqueada;
4. aprovação independente registrada;
5. nova versão preservada e marcada para recálculo;
6. importação, busca, composição e guardas SINAPI aprovados.

## 6. Segurança SINAPI

`add_sinapi_reference_to_budget` permanece `SECURITY INVOKER`.

A auditoria elevada foi reduzida a uma função no schema não exposto `internal`. Ela:

- recebe somente o ID do item persistido;
- valida autor e papel organizacional;
- deriva a referência oficial do próprio item;
- fixa recurso, ação e estrutura do payload;
- evita evento duplicado;
- chama o helper genérico somente após os guards.

Verificação no Supabase:

```text
internal.write_sinapi_budget_item_audit
  SECURITY DEFINER: sim
  authenticated EXECUTE: sim

public.add_sinapi_reference_to_budget
  SECURITY DEFINER: não
  authenticated EXECUTE: sim

public.write_audit
  SECURITY DEFINER: sim
  authenticated EXECUTE: não
```

A porta pública transitória foi removida.

## 7. Precisão do CUB

Taxas percentuais do CUB eram divididas diretamente por 100 e podiam produzir resíduos binários, como:

```text
0.022400000000000003
```

O parser agora normaliza a taxa decimal em escala determinística antes de gerar JSON e SHA-256. O valor esperado permanece:

```text
0.0224
```

## 8. Portões executados

A execução GitHub Actions `1582` concluiu com sucesso:

- preflight e documentação canônica;
- contratos auditáveis de personas;
- vacinas e invariantes;
- ledger de migrations;
- testes de dependência de cronograma;
- testes de pipeline;
- eventos e notificações operacionais;
- composição e aprovação de orçamento;
- documentos comerciais;
- lint sem warnings;
- typecheck;
- testes TypeScript: **229 aprovados**;
- testes Python;
- build Next.js.

O preview Vercel do código anterior ao documento já estava `READY`. O commit documental deve repetir os portões antes do merge.

## 9. Prevenção

`tests/interface-foundation-contract.test.ts` protege:

- relação explícita e erro seguro em Documentos;
- cinco visualizações do pipeline CRM;
- três visualizações do portfólio de Planejamento;
- Gantt com dependências;
- orçamento com inclusão, remoção e recálculo;
- erros classificados de login;
- ícone da aplicação.

## 10. Limites declarados

Este documento **não** declara a sprint S-23 concluída.

Permanecem para os próximos microblocos:

- aplicar o padrão seguro às demais telas antigas que ainda exibem `error.message`;
- reconciliar outras coleções que ainda não possuem visualizações operacionais equivalentes;
- revisar estados de loading, vazio, bloqueio e recuperação por aplicativo;
- somente depois iniciar equipes, competências, jornadas, produtividade e alocação de recursos.
