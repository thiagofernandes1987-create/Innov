# Campanha QA — S-23 Diário, EAP e Documentos internos

**Data:** 29 de julho de 2026  
**Branch:** `fix/s23-safe-project-support-pages`  
**PR:** `#28`  
**Estado:** microbloco concluído; sprint S-23 continua em andamento

## 1. Escopo

O microbloco revisou três páginas auxiliares do projeto:

- Diário de obra;
- Estrutura Analítica do Projeto (EAP);
- Documentos internos e suas versões.

Foram tratadas quatro classes de falha:

1. erro técnico do provedor exposto ao usuário;
2. falha de consulta convertida em `404`;
3. coleção indisponível apresentada como vazia;
4. dependência parcial usada como se estivesse confirmada.

## 2. Diário de obra

- projeto e coleção possuem resultados e logs independentes;
- falha do projeto é tratada antes de `notFound()`;
- falha da coleção não mostra “Nenhum diário registrado”;
- a tabela é substituída por estado de indisponibilidade;
- o formulário de novo diário continua disponível porque não depende da leitura da coleção.

### Cenários

| Cenário | Resultado |
|---|---|
| registros carregados | tabela e contagem de mídias exibidas |
| coleção vazia confirmada | estado “Nenhum diário registrado” |
| coleção indisponível | aviso seguro; nenhuma conclusão sobre produção |
| projeto indisponível | aviso seguro, sem 404 falso |

## 3. EAP

- o peso raiz não é calculado quando os pacotes não carregam;
- árvore e estado vazio exigem consulta bem-sucedida;
- a hierarquia atual não é reconstruída sobre coleção parcial;
- o formulário de novo pacote fica bloqueado sem a lista confiável de pais;
- projeto indisponível não vira 404.

## 4. Documentos internos

O embed entre `project_documents` e `project_document_versions` foi removido. As consultas agora são explícitas:

```text
projeto
→ documentos
→ versões dos documentos encontrados
→ URLs temporárias dos arquivos encontrados
```

Cada etapa possui erro e estado próprios.

- coleção vazia não consulta versões nem storage;
- falha de documentos ou versões bloqueia a coleção;
- falha somente das URLs preserva metadados, hashes, estados e ações de liberação;
- link inexistente não usa `href="#"`;
- o usuário vê “link indisponível” até nova assinatura;
- upload permanece disponível por não depender da leitura da coleção;
- projeto indisponível não vira 404.

## 5. Logger seguro

`reportDataAccessError` passou a aceitar erros de banco e storage.

Somente um identificador estável é registrado:

```text
code → statusCode → name → UNKNOWN
```

Mensagem, detalhe, hint, consulta, caminho e payload continuam fora do log.

## 6. Prevenção

`tests/interface-foundation-contract.test.ts` agora protege sete coleções de obra e verifica adicionalmente:

- Diário mantém cadastro independente quando apenas a coleção falha;
- EAP bloqueia peso e hierarquia sem itens confirmados;
- Documentos consulta versões separadamente;
- assinatura de URLs possui guarda própria;
- não existe link de fallback `#`;
- nenhuma das páginas usa `error.message` diretamente.

## 7. Evidências executadas

GitHub Actions `1603` aprovou:

- preflight;
- replay e testes de banco;
- cronograma, pipeline e eventos;
- orçamento e documentos comerciais;
- lint;
- typecheck;
- testes TypeScript;
- testes Python;
- build Next.js.

Preview Vercel `dpl_7K8mL7FYfGZpZv81wuq5zGPWMnGw`: `READY`.

## 8. Limites

Este microbloco não conclui a S-23. Permanecem:

- tela de criação de obra e mensagens de ações;
- demais coleções fora do contexto de projeto;
- revisão dos estados de carregamento e recuperação por aplicativo;
- reconciliação final do inventário da sprint.

Equipes, competências, jornadas, produtividade e alocação avançada continuam bloqueadas até essa reconciliação.
