# SPEC — Innovar Platform

**Documento canônico:** sim  
**Revisão documental:** 1.0.0  
**Versão implementada da plataforma:** 0.16.0  
**Atualizado em:** 20 de julho de 2026  
**Fonte de verdade:** branch `main` do repositório `thiagofernandes1987-create/Innov`

## 1. Propósito

A Innovar Platform é a plataforma modular da **Innovar Construções e Reformas** para gerir o ciclo completo de clientes, obras e pós-obra:

```text
lead → cliente → orçamento → proposta → contrato → assinatura
→ obra → planejamento → execução → qualidade → compras
→ financeiro → indicadores → entrega → pós-venda → auditoria
```

A plataforma atende inicialmente a operação de construção e reforma de alto padrão da Innovar, com arquitetura preparada para múltiplas organizações, clientes e obras.

## 2. Regra de continuidade

O GitHub é o repositório definitivo de código, migrations e documentação. A solução deve ser reconstruível mesmo que qualquer contêiner, conversa, ambiente local ou artefato temporário seja perdido.

Nenhum segredo pode ser usado como dependência documental. Credenciais ficam em cofres de ambiente; o repositório informa somente nome, finalidade e forma segura de configuração.

## 3. Princípios inegociáveis

1. **Modular e plug-and-play:** aplicativos podem ser habilitados ou desabilitados por organização.
2. **Multiempresa e multiobra:** todos os dados operacionais pertencem a uma organização; uma cliente pode possuir várias obras.
3. **Autorização real:** menu oculto não é controle de acesso; rotas, RPCs, tabelas e arquivos devem validar capacidade e escopo.
4. **RLS por padrão:** tabelas de negócio expostas ao Supabase usam Row Level Security.
5. **Service Role somente no servidor:** jamais enviada ao navegador ou persistida em documentação.
6. **Documentos privados:** arquivos sensíveis ficam em buckets privados e são entregues por URL assinada ou rota autenticada.
7. **Versionamento e imutabilidade:** documentos, orçamentos, propostas, contratos, baselines e snapshots relevantes são versionados e congelados quando publicados ou concluídos.
8. **Auditoria:** alterações críticas geram evidência de ator, data, ação e contexto.
9. **Idempotência:** webhooks, importações, geração de documentos e aplicações financeiras não podem produzir duplicidade por repetição.
10. **Documentação viva:** SPEC, inventário, módulos, roadmap e recuperação são atualizados no mesmo PR da alteração.

## 4. Atores e perfis canônicos

Perfis-base existentes:

- Super Administrador;
- Direção;
- Administrador;
- Comercial/Vendas;
- Gestor de Obras;
- Engenharia;
- Orçamentista;
- Financeiro;
- Qualidade;
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
- obra.

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

## 7. Fluxos implementados

### 7.1 Comercial e contratual

```text
orçamento versionado → cálculo → validação → aprovação
→ proposta PDF → liberação → aceite
→ contrato → assinatura → aditivo → valor/prazo consolidado
```

Inclui custos diretos, indiretos e fixos, taxa administrativa, BDI, markup, margem, lucro, capital, ROI, payback, cenários e memória de cálculo.

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

### 7.6 Financeiro operacional

```text
contrato/pedido/medição → lançamento → parcelas
→ aprovação → liquidação → comprovante → fluxo de caixa
```

### 7.7 Relatórios executivos

```text
dados autorizados → métricas consolidadas → filtros
→ dashboards → metas → relatórios salvos
→ snapshots imutáveis → exportação auditada
```

## 8. Regras essenciais por domínio

### 8.1 Orçamentos

- mudança financeira após congelamento exige nova versão;
- validações bloqueantes impedem congelamento e aprovação;
- margem e markup são indicadores distintos;
- dupla contagem de taxa administrativa, custos fixos ou lucro deve ser bloqueada;
- aprovações críticas podem exigir MFA AAL2 e separação de funções.

### 8.2 Propostas e contratos

- cliente recebe somente versões liberadas;
- PDFs possuem hash SHA-256;
- documentos enviados ou assinados são imutáveis;
- aditivo assinado é aplicado uma única vez;
- valores original, aditivos e consolidado permanecem rastreáveis.

### 8.3 Obras

- obra pertence a uma organização e pode estar vinculada a cliente e contrato;
- progresso operacional é armazenado como fração de `0` a `1`;
- interfaces analíticas convertem para `0` a `100%`;
- baseline é imutável;
- bloqueios de tarefa exigem justificativa;
- documentos liberados possuem versão e hash.

### 8.4 Assinaturas

- token público bruto nunca é persistido; somente hash;
- original, convertido, preenchimentos, anexos, PDF final e auditoria possuem hashes;
- sandbox serve somente para homologação;
- provedores externos exigem credenciais e revisão jurídica;
- conclusão é idempotente.

### 8.5 Qualidade

- schema de formulário publicado é imutável;
- nova alteração exige nova versão;
- anexos ficam privados;
- respostas possuem ciclo de revisão;
- FVS/FVM podem ser abertas por processos de campo e recebimento.

### 8.6 Compras

- fornecedor não possui autoinscrição pública;
- convite usa token aleatório com somente hash persistida;
- recebimento vazio é inválido;
- recebimento pode ser parcial;
- quantidades aceitas e rejeitadas são rastreadas;
- pedido e recebimento devem pertencer à mesma organização e obra.

### 8.7 Financeiro

- leitura e escrita financeira exigem capacidade sensível;
- baixa e comprovante são atômicos;
- importações de contrato e pedido são idempotentes;
- saldos são derivados das parcelas e liquidações;
- anexos financeiros ficam privados.

### 8.8 Relatórios

- interface não consulta diretamente tabelas internas de outros módulos;
- RPCs analíticas aplicam autorização e mascaramento;
- snapshots concluídos são imutáveis;
- exportações registram hash, formato, usuário, nome e quantidade de linhas;
- valores de contratos, compras e financeiro exigem acesso sensível;
- views internas não são concedidas a usuários autenticados.

## 9. Dados, banco e migrations

- banco principal: PostgreSQL no Supabase;
- autenticação: Supabase Auth;
- armazenamento: Supabase Storage privado;
- migrations ficam exclusivamente em `supabase/migrations/`;
- migrations aplicadas nunca devem ser reescritas para corrigir ambientes existentes; correções usam nova migration;
- funções `security definer` precisam de `search_path` explícito e checagem interna de autorização;
- funções auxiliares não destinadas a RPC devem ter execução revogada de `public`, `anon` e `authenticated`;
- chaves estrangeiras em caminhos de RLS e consulta precisam de índices adequados.

## 10. Frontend e backend

- Next.js 16 e React 19;
- TypeScript estrito;
- Server Components e Server Actions quando adequado;
- rotas API para downloads, geração e webhooks;
- validação server-side;
- `server-only` em módulos com credenciais privilegiadas;
- componentes acessíveis, responsivos e com alternativa a drag-and-drop.

## 11. Ambientes

### 11.1 Desenvolvimento

- `.env.local` não versionado;
- provider de assinatura `sandbox`;
- dados artificiais separados de produção.

### 11.2 Homologação

- Supabase dedicado;
- contas de teste provisionadas server-side;
- secrets em ambiente protegido do GitHub;
- E2E autenticado para fluxos críticos;
- dados de teste removidos após execução.

### 11.3 Produção

Exige, no mínimo:

- revisão jurídica e contábil;
- provider jurídico real configurado;
- revisão LGPD;
- pentest;
- política de backup e restauração;
- observabilidade;
- rotação de segredos;
- antivírus ou serviço de análise de anexos;
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

Comandos obrigatórios:

```bash
pnpm validate:docs
pnpm lint
pnpm typecheck
pnpm test
pnpm test:python
pnpm build
```

Validadores estruturais existentes cobrem Etapas 9, 12, 12.1, 12.2, 13, 14, 15 e 16.

## 14. Estado atual

- Etapas 9 a 16 consolidadas na `main`;
- módulos comercial/contratual, obra, modularidade, assinatura avançada, qualidade, compras, financeiro e relatórios implementados;
- Supabase de homologação recebeu migrations das etapas recentes;
- documentação histórica disponível em `docs/`;
- documentação canônica concentrada em `diretrizes/`;
- alguns aplicativos do catálogo permanecem parciais ou planejados, conforme inventário.

## 15. Próxima etapa oficial

**Etapa 17 — Estoque, Inventário e Almoxarifado.**

Escopo planejado:

- itens, categorias e unidades;
- depósitos e localizações;
- saldo por organização, obra e depósito;
- entradas por recebimento de compras;
- saídas para obra, equipe ou responsável;
- transferências;
- devoluções;
- perdas e ajustes;
- reservas;
- estoque mínimo e alertas;
- lote e validade quando aplicável;
- ferramentas e ativos controlados;
- inventário físico e divergências;
- trilha de auditoria;
- RLS e integração com Compras, Obras, Equipes, Financeiro e Relatórios.

A etapa deve começar somente depois da consolidação da documentação viva na `main`.

## 16. Fora do escopo imediato

- ERP contábil completo;
- emissão fiscal oficial;
- conciliação bancária automática;
- CNAB e Open Finance;
- WMS avançado;
- ressuprimento automático sem aprovação;
- BI público;
- data warehouse externo;
- IA generativa tomando decisões financeiras ou contratuais sem aprovação humana.
