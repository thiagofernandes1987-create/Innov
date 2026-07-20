# Padrão inegociável de documentação

## 1. Regra

Código sem documentação atualizada é entrega incompleta.

A documentação deve ser alterada no mesmo PR da mudança funcional. Não é permitido adiar a atualização para uma etapa futura.

## 2. Documentos canônicos

Toda mudança deve avaliar impacto em:

- `diretrizes/SPEC.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/MODULOS.md`;
- `diretrizes/ARQUITETURA.md`;
- `diretrizes/ROADMAP.md`;
- `diretrizes/RECUPERACAO.md`;
- documento técnico em `docs/`.

## 3. Definition of Done documental

Uma etapa somente pode ser marcada como concluída quando:

- [ ] requisitos e exclusões estão documentados;
- [ ] módulo e estado foram atualizados;
- [ ] rotas foram inventariadas;
- [ ] tabelas, views, enums e relações foram registradas;
- [ ] RPCs e funções privilegiadas foram registradas;
- [ ] RLS e capacidades foram descritas;
- [ ] buckets, tipos e limites foram registrados;
- [ ] variáveis de ambiente foram listadas sem valores;
- [ ] workers e dependências externas foram registrados;
- [ ] migrations foram listadas;
- [ ] testes executados foram registrados;
- [ ] limitações e pendências foram registradas;
- [ ] roadmap foi atualizado;
- [ ] recuperação foi atualizada quando necessário;
- [ ] `pnpm validate:docs` passou;
- [ ] CI completo passou.

## 4. Documento técnico de etapa

Nome:

```text
docs/ETAPA-XX-NOME-DA-ETAPA.md
```

Seção mínima:

```markdown
# Etapa XX — Nome

## Estado
## Objetivo
## Escopo incluído
## Fora do escopo
## Fluxos
## Modelo de dados
## Rotas
## RPCs e integrações
## Segurança e RLS
## Storage
## Migrations
## Testes
## Homologação
## Limitações
## Próximos passos
```

## 5. Mudanças de banco

Todo PR com migration deve documentar:

- nome de cada arquivo;
- ordem;
- objetos criados/alterados;
- compatibilidade com ambientes existentes;
- backfill, se houver;
- riscos de lock;
- rollback operacional ou estratégia corretiva;
- testes de integridade;
- privilégios concedidos/revogados.

Não incluir SQL secreto, credenciais ou dados reais pessoais.

## 6. Mudanças de módulo

Atualizar obrigatoriamente:

- chave e nome;
- status;
- rota-base;
- dependências;
- capacidades;
- dados sensíveis;
- integrações;
- buckets;
- limitações;
- documento histórico.

O validador compara as chaves de `lib/modules/registry.ts` com `diretrizes/MODULOS.md` e `diretrizes/INVENTARIO.md`.

## 7. Mudanças de segurança

Registrar:

- ameaça tratada;
- autorização exigida;
- política RLS;
- função `security definer`, quando houver;
- `search_path`;
- privilégios revogados;
- idempotência;
- auditoria;
- teste negativo.

## 8. Mudanças de ambiente

Nova variável precisa aparecer em:

- `.env.example`;
- `diretrizes/SPEC.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/RECUPERACAO.md`;
- workflow/hosting quando aplicável.

Somente o nome e a finalidade são versionados.

## 9. Mudanças de rota

Registrar:

- método e caminho;
- público, cliente ou interno;
- módulo responsável;
- capacidade necessária;
- tipo de resposta;
- dados sensíveis;
- auditoria/download quando aplicável.

## 10. Pull request

A descrição do PR deve conter:

- objetivo;
- entregas;
- segurança;
- migrations;
- homologação;
- CI;
- documentação atualizada;
- limitações;
- fora do escopo.

## 11. Fonte histórica

`docs/ETAPA-*` registra como a etapa foi implementada naquele momento.

`diretrizes/*` registra como a plataforma funciona agora.

Não apagar documento histórico para esconder mudança. Atualizar o canônico e, quando relevante, adicionar adendo histórico.

## 12. Proibição de dependência em conversa ou contêiner

Não pode existir requisito, decisão, credencial, migration, script ou procedimento necessário apenas em:

- chat;
- memória do assistente;
- `/mnt/data`;
- contêiner efêmero;
- arquivo local não commitado;
- anotação privada sem cópia no repositório.

Quando uma decisão tomada em conversa alterar o projeto, ela deve ser registrada antes da execução funcional seguinte.

## 13. Revisão periódica

Ao final de cada etapa:

1. comparar registry, rotas e migrations com inventário;
2. revisar documentos canônicos;
3. executar `pnpm validate:docs`;
4. registrar divergências como bloqueio do PR;
5. somente então liberar revisão/merge.
