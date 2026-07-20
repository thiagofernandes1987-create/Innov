# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.1.0  
**Versão implementada da plataforma:** 0.17.0  
**Atualizado em:** 20 de julho de 2026  
**Fonte de verdade:** repositório `thiagofernandes1987-create/Innov`; `main` para estado estável e branch explicitamente documentada para etapa em execução.

## 1. Propósito

A Innovar Platform é a plataforma modular da **Innovar Construções e Reformas** para gerir o ciclo completo de clientes, contratos, obras e pós-obra:

```text
lead → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras
→ estoque → financeiro → indicadores → entrega → pós-venda → auditoria
```

A plataforma atende inicialmente a operação de construção e reforma de alto padrão da Innovar, com arquitetura preparada para múltiplas organizações, clientes, obras, depósitos e perfis.

## 2. Regra de continuidade

O GitHub é o repositório definitivo de código, migrations, documentação, testes e procedimentos de recuperação. A solução deve ser reconstruível mesmo que qualquer contêiner, conversa, ambiente local ou artefato temporário seja perdido.

Nenhum segredo pode ser usado como dependência documental. Credenciais ficam em cofres de ambiente; o repositório informa somente nome, finalidade e forma segura de configuração.

## 3. Princípios inegociáveis

1. **Modular e plug-and-play:** aplicativos podem ser habilitados ou desabilitados por organização.
2. **Multiempresa e multiobra:** todos os dados operacionais pertencem a uma organização e, quando aplicável, a uma obra.
3. **Autorização real:** menu oculto não é controle de acesso; rotas, RPCs, tabelas e arquivos validam capacidade e escopo.
4. **RLS por padrão:** tabelas de negócio expostas ao Supabase usam Row Level Security.
5. **Service Role somente no servidor:** jamais enviada ao navegador ou persistida em documentação.
6. **Documentos privados:** arquivos sensíveis ficam em buckets privados e são entregues por URL assinada ou rota autenticada.
7. **Versionamento e imutabilidade:** documentos, orçamentos, propostas, contratos, baselines, snapshots, movimentos e fechamentos relevantes são congelados quando publicados ou concluídos.
8. **Auditoria:** alterações críticas geram evidência de ator, data, ação e contexto.
9. **Idempotência:** webhooks, importações, geração de documentos, recebimentos e aplicações financeiras não podem produzir duplicidade por repetição.
10. **Documentação viva:** SPEC, inventário, módulos, roadmap, recuperação e documento da etapa são atualizados no mesmo PR.
11. **Saldo derivado:** saldos financeiros e físicos não são editados diretamente quando podem ser reconstruídos pelo razão de eventos/movimentos.
12. **CI como bloqueio:** nenhuma etapa é considerada pronta com validação incompleta.

## 4. Atores e perfis canônicos

- Super Administrador;
- Direção;
- Administrador;
- Comercial/Vendas;
- Gestor de Obras;
- Engenharia;
- Orçamentista;
- Financeiro;
- Qualidade;
- Compras;
- Pós-venda/SAC;
- Cliente.

A plataforma também aceita perfis personalizados. Perfis personalizados não devem ser sobrescritos automaticamente por instaladores de módulos.

## 5. Modelo de autorização

### 5.1 Níveis de acesso

- `NONE`;
- `READ`;
- `READ_WRITE`/`EDIT`;
- `FULL`/`DELETE`.

### 5.2 Capacidades granulares

- criar;
- ler;
- editar;
- excluir;
- aprovar;
- liberar ao cliente;
- assinar;
- exportar;
- administrar;
- visualizar dados financeiros sensíveis;
- atribuir usuários;
- configurar.

### 5.3 Escopos

- organização;
- cliente;
- obra;
- depósito/recurso quando definido pelo módulo.

Negação explícita tem precedência sobre permissão. A resolução considera módulo habilitado, perfil, capacidade, escopo, overrides e vínculo ativo.

## 6. Aplicativos modulares

O catálogo canônico contém:

1. dashboard;
2. CRM e Vendas;
3. clientes;
4. obras;
5. planejamento;
6. tarefas;
7. diário de obras;
8. equipes;
9. orçamentos;
10. propostas;
11. contratos;
12. aditivos;
13. assinaturas;
14. documentos;
15. qualidade;
16. compras e suprimentos;
17. estoque e inventário;
18. financeiro operacional;
19. pós-venda e SAC;
20. relatórios e indicadores;
21. auditoria;
22. administração.

O contrato atualizado de cada aplicativo está em [`MODULOS.md`](./MODULOS.md).

## 7. Fluxos implementados ou em execução

### 7.1 Comercial e contratual

```text
orçamento versionado → cálculo → validação → aprovação
→ proposta PDF → liberação → aceite
→ contrato → assinatura → aditivo → valor/prazo consolidado
```

### 7.2 Gestão de obras

```text
contrato ativo → obra → EAP → cronograma → tarefas
→ equipes/recursos → diário → documentos/mídias
→ snapshots previsto x realizado → portal do cliente
```

### 7.3 Assinatura avançada

```text
PDF/DOCX → hash original → conversão → layout
→ campos → assinatura/rubrica/foto/anexo
→ PDF final → evidência → entrega ao cliente
```

### 7.4 Qualidade

```text
biblioteca → documento → modelo FVS/FVM/formulário
→ publicação → distribuição → preenchimento
→ anexos → pontuação → revisão → aprovação/rejeição
```

### 7.5 Compras

```text
solicitação → convite seguro → cotação → comparação
→ seleção → aprovação → pedido → recebimento → FVM
```

### 7.6 Estoque, Inventário e Almoxarifado — Etapa 17

```text
recebimento aceito → entrada idempotente → saldo físico
→ reserva → saldo disponível → consumo/devolução/transferência
→ custódia de ativos → inventário físico → ajuste/reversão → auditoria
```

Estado: em execução na branch `feature/etapa-17-estoque-inventario-almoxarifado`, PR `#14`, sem merge.

### 7.7 Financeiro operacional

```text
contrato/pedido/medição → lançamento → parcelas
→ aprovação → liquidação → comprovante → fluxo de caixa
```

### 7.8 Relatórios executivos

```text
dados autorizados → métricas consolidadas → filtros
→ dashboards → metas → relatórios salvos
→ snapshots imutáveis → exportação auditada
```

## 8. Regras essenciais por domínio

### 8.1 Orçamentos, propostas e contratos

- mudança financeira após congelamento exige nova versão;
- validações bloqueantes impedem congelamento e aprovação;
- cliente recebe somente versões liberadas;
- PDFs possuem hash SHA-256;
- documentos enviados ou assinados são imutáveis;
- aditivo assinado é aplicado uma única vez.

### 8.2 Obras e campo

- obra pertence a uma organização e pode estar vinculada a cliente e contrato;
- progresso operacional é armazenado como fração de `0` a `1`;
- baseline é imutável;
- bloqueios de tarefa exigem justificativa;
- documentos liberados possuem versão e hash.

### 8.3 Assinaturas e documentos

- token público bruto nunca é persistido; somente hash;
- original, convertido, preenchimentos, anexos, PDF final e auditoria possuem hashes;
- sandbox serve somente para homologação;
- conclusão é idempotente;
- buckets sensíveis permanecem privados.

### 8.4 Qualidade e Compras

- schema de formulário publicado é imutável;
- recebimento vazio é inválido;
- recebimento pode ser parcial;
- quantidades aceitas e rejeitadas são rastreadas;
- pedido e recebimento pertencem à mesma organização e obra;
- somente quantidade aceita pode alimentar estoque.

### 8.5 Estoque — Etapa 17

- saldo físico é a soma algébrica de linhas de movimentos `POSTED`;
- saldo reservado é derivado de reservas ativas;
- saldo disponível é físico menos reservado;
- saldo não é editável diretamente;
- movimento `POSTED` é imutável;
- correção ocorre por reversão vinculada ao original;
- transferência é atômica e conserva quantidade por item, lote e ativo;
- saldo negativo é bloqueado por padrão;
- importação de recebimento de Compras é idempotente;
- quantidade rejeitada não entra no estoque;
- inventário físico aprovado gera ajuste imutável;
- vínculos multiempresa e multiobra incompatíveis são bloqueados;
- custos sensíveis são mascarados no banco.

### 8.6 Financeiro e Relatórios

- leitura e escrita financeira exigem capacidade sensível;
- baixa e comprovante são atômicos;
- saldos são derivados das parcelas e liquidações;
- snapshots concluídos são imutáveis;
- exportações registram hash, formato, usuário, nome e quantidade de linhas;
- views internas não são concedidas diretamente a usuários autenticados.

## 9. Dados, banco e migrations

- banco principal: PostgreSQL no Supabase;
- autenticação: Supabase Auth;
- armazenamento: Supabase Storage privado;
- migrations ficam exclusivamente em `supabase/migrations/`;
- migrations aplicadas nunca são reescritas; correções usam nova migration;
- funções `security definer` precisam de `search_path` explícito e checagem interna de autorização;
- funções auxiliares não destinadas a RPC têm execução revogada;
- chaves estrangeiras em caminhos de RLS e consulta possuem índices adequados.

## 10. Frontend e backend

- Next.js 16 e React 19;
- TypeScript estrito;
- Server Components e Server Actions quando adequado;
- rotas API para downloads, geração e webhooks;
- validação server-side;
- `server-only` em módulos com credenciais privilegiadas;
- componentes acessíveis, responsivos e com alternativa a drag-and-drop.

## 11. Ambientes

### Desenvolvimento

- `.env.local` não versionado;
- provider de assinatura `sandbox`;
- dados artificiais separados de produção.

### Homologação

- Supabase dedicado;
- contas de teste provisionadas server-side;
- secrets em ambiente protegido;
- E2E autenticado para fluxos críticos;
- dados artificiais removidos ou revertidos após execução.

### Produção

Exige, no mínimo:

- revisão jurídica, fiscal e contábil aplicável;
- provider jurídico real;
- revisão LGPD;
- pentest;
- backup e restauração testados;
- observabilidade;
- rotação de segredos;
- análise antimalware de anexos;
- aprovação explícita de publicação.

## 12. Variáveis de ambiente conhecidas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
SIGNATURE_PROVIDER=
SIGNATURE_WEBHOOK_SECRET=
SIGNATURE_EMAIL_WEBHOOK_URL=
DEMO_ADMIN_PASSWORD=
DEMO_CLIENT_PASSWORD=
```

Nenhum valor secreto pode ser documentado ou commitado.

## 13. Qualidade e CI

Comandos obrigatórios da Etapa 17:

```bash
pnpm validate:docs
pnpm validate:stage17
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

Definition of Done adicional:

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## 14. Próxima etapa oficial

A etapa oficial em execução é a **Etapa 17 — Estoque, Inventário e Almoxarifado**.

Após sua conclusão, a fila permanece:

- Etapa 18 — Consolidação de CRM, Clientes e SAC;
- Etapa 19 — Auditoria e observabilidade unificadas;
- Etapa 20 — Prontidão de produção;
- Etapa 21 — WMS avançado e automação logística, fiscal e patrimonial.

A Etapa 21 inclui:

- WMS avançado;
- endereçamento automatizado;
- RFID em tempo real;
- ressuprimento automático sem aprovação;
- roteirização logística;
- integração fiscal de entrada;
- depreciação contábil oficial.

O planejamento detalhado está em `docs/ETAPA-21-WMS-AVANCADO-AUTOMACAO-LOGISTICA.md`. Nenhuma capacidade da Etapa 21 é considerada implementada atualmente.

## 15. Regra documental

Toda alteração de escopo, ordem ou arquitetura atualiza no mesmo PR:

- `diretrizes/SPEC.md`;
- `diretrizes/INVENTARIO.md`;
- `diretrizes/MODULOS.md`;
- `diretrizes/ARQUITETURA.md` quando afetada;
- `diretrizes/ROADMAP.md`;
- documento técnico da etapa;
- validador documental quando o novo requisito se tornar obrigatório.
