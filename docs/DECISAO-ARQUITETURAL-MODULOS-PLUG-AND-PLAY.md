# Decisão Arquitetural — Plataforma Modular Plug-and-Play

**Status:** obrigatório  
**Aplicação:** Innovar Platform  
**Princípio:** nenhum aplicativo, perfil ou permissão de negócio deve ficar rigidamente acoplado ao menu, ao usuário ou ao código de outro módulo.

## 1. Objetivo

A Innovar Platform será construída como um **monólito modular extensível**, com contratos explícitos entre o núcleo e os aplicativos. Essa abordagem preserva implantação simples no início e permite acrescentar, desabilitar, substituir ou remover módulos sem reescrever o sistema inteiro.

Exemplos de aplicativos:

- CRM e Vendas;
- Financeiro;
- Orçamentos;
- Clientes;
- Obras;
- Planejamento;
- Tarefas;
- Diário de Obras;
- Documentos;
- Contratos;
- Assinaturas;
- Qualidade;
- Compras;
- Estoque;
- Pós-venda;
- Ocorrências e SAC;
- Equipes e Recursos;
- Administração.

## 2. Núcleo da plataforma

O núcleo deverá oferecer apenas serviços transversais:

- autenticação;
- organizações;
- clientes e usuários;
- registro de aplicativos;
- perfis de acesso;
- permissões;
- auditoria;
- eventos;
- arquivos privados;
- notificações;
- configurações;
- feature flags;
- observabilidade.

O núcleo não deverá conter regras específicas de orçamento, obra, CRM, assinatura ou qualquer outro domínio.

## 3. Contrato obrigatório de um aplicativo

Cada aplicativo será registrado por um manifesto contendo:

```ts
export interface InnovarModuleManifest {
  key: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: string;
  routes: ModuleRoute[];
  navigation: ModuleNavigationItem[];
  capabilities: ModuleCapability[];
  dependencies: string[];
  featureFlags: string[];
  migrations: string[];
  eventSubscriptions: string[];
  eventPublications: string[];
}
```

Um módulo somente poderá ser habilitado quando suas dependências estiverem satisfeitas.

## 4. Registro de aplicativos

O banco deverá possuir um catálogo dinâmico:

- `applications` — catálogo dos módulos disponíveis;
- `organization_applications` — módulos habilitados por organização;
- `application_capabilities` — ações disponíveis em cada módulo;
- `access_profiles` — perfis reutilizáveis;
- `profile_capabilities` — permissões do perfil;
- `user_profile_assignments` — perfis atribuídos aos usuários;
- `user_capability_overrides` — exceções específicas por usuário;
- `permission_audit_events` — trilha de alterações.

Desabilitar um módulo não deverá apagar seu histórico. Os dados permanecem arquivados e inacessíveis até nova habilitação ou processo formal de retenção.

## 5. Permissões por capacidade

Os níveis visuais básicos serão:

1. sem acesso;
2. somente leitura;
3. leitura e edição;
4. leitura, edição e exclusão.

Internamente as permissões serão granulares:

- `create`;
- `read`;
- `update`;
- `delete`;
- `approve`;
- `release_to_client`;
- `sign`;
- `export`;
- `manage`;
- `view_sensitive_financials`;
- `assign_users`;
- `configure`.

O sistema nunca deverá depender apenas de ocultar itens do menu. As mesmas permissões serão aplicadas em:

- interface;
- componentes de servidor;
- Route Handlers;
- APIs;
- RPCs;
- políticas RLS;
- Storage;
- eventos e jobs.

## 6. Perfis plug-and-play

Perfis serão **conjuntos editáveis de capacidades**, e não condições fixas no código.

Perfis iniciais:

- Direção;
- Administrador;
- Vendas;
- Financeiro;
- Orçamentista;
- Operacional;
- Gestor de Obras;
- Engenharia;
- Qualidade;
- Pós-venda;
- SAC;
- Cliente;
- Usuário comum.

Será possível:

- criar novos perfis;
- duplicar perfis;
- editar permissões;
- desativar perfis;
- atribuir vários perfis ao mesmo usuário;
- aplicar exceções por usuário;
- restringir acesso por organização, cliente ou obra.

Perfis são templates. A autorização final será calculada por capacidades efetivas.

## 7. Resolução das permissões

A permissão efetiva seguirá esta ordem:

```text
módulo habilitado na organização
→ perfil atribuído
→ capacidades do perfil
→ restrições de escopo
→ override individual
→ política de segurança
```

Regras negativas explícitas prevalecem sobre permissões herdadas.

## 8. Dashboard e menu dinâmicos

Após o login, a plataforma deverá consultar o registro de aplicativos e montar:

- tela inicial com cartões dos módulos autorizados;
- menu lateral filtrado;
- busca global limitada aos módulos autorizados;
- atalhos por perfil;
- indicadores por aplicativo;
- estado “módulo desabilitado” sem expor dados.

Exemplo:

- perfil Orçamentista visualiza Orçamentos, Clientes autorizados, Documentos e Relatórios pertinentes;
- perfil Vendas visualiza CRM, Leads, Clientes e Propostas comerciais;
- perfil Financeiro visualiza Financeiro, Contratos, Compras e Relatórios financeiros;
- perfil Operacional visualiza Obras, Planejamento, Tarefas, Diário, Equipes e Documentos de campo;
- usuário comum visualiza apenas os aplicativos explicitamente concedidos.

## 9. Isolamento entre módulos

Módulos não deverão consultar diretamente tabelas internas de outros módulos sem contrato.

Integrações ocorrerão por:

- serviços públicos do módulo;
- contratos compartilhados;
- eventos de domínio;
- views ou RPCs autorizadas;
- referências estáveis por identificador.

Exemplo:

```text
CRM publica opportunity.won
→ módulo de Clientes cria ou vincula cliente
→ módulo de Orçamentos cria contexto comercial
→ módulo de Contratos recebe proposta aceita
→ módulo de Obras cria obra a partir do contrato ativo
```

## 10. Eventos de domínio

O Event Bus deverá permitir integração desacoplada:

- `lead.created`;
- `opportunity.won`;
- `budget.approved`;
- `proposal.accepted`;
- `contract.signed`;
- `project.created`;
- `work.progress.updated`;
- `service_case.completed`;
- `document.signed`.

Consumidores deverão ser idempotentes.

## 11. Ciclo de vida do aplicativo

Cada módulo deverá suportar:

- instalado;
- habilitado;
- desabilitado;
- em manutenção;
- obsoleto;
- arquivado.

Operações de remoção deverão distinguir:

- remover acesso;
- desabilitar o aplicativo;
- desinstalar código;
- arquivar dados;
- excluir dados conforme política legal.

A exclusão física nunca deverá ser a ação padrão.

## 12. Extensibilidade futura

Para adicionar um módulo novo, deverá ser suficiente:

1. criar seu pacote;
2. registrar o manifesto;
3. adicionar migrations próprias;
4. declarar capacidades;
5. declarar dependências;
6. registrar rotas e navegação;
7. configurar eventos;
8. habilitar na organização;
9. conceder capacidades a um perfil.

Não deverá ser necessário editar manualmente todos os menus, dashboards ou regras de autorização existentes.

## 13. Estrutura recomendada

```text
apps/web/
  app/
  modules/
    crm/
    budgets/
    works/
    planning/
    documents/
    signatures/

packages/
  module-sdk/
  authorization/
  event-bus/
  contracts/
  ui/

supabase/migrations/
  core/
  modules/
```

Cada módulo deverá possuir:

```text
manifest.ts
permissions.ts
routes.ts
navigation.ts
server/
components/
queries/
actions/
tests/
migrations/
```

## 14. Regra contra acoplamento por papel

Não utilizar condições espalhadas como:

```ts
if (role === "ORCAMENTISTA") { ... }
```

Utilizar capacidades:

```ts
await requireCapability("budgets", "update");
```

Os nomes dos perfis poderão mudar sem alterar a regra de negócio.

## 15. Auditoria administrativa

Toda alteração deverá registrar:

- quem realizou;
- perfil afetado;
- usuário afetado;
- módulo;
- capacidade anterior;
- capacidade nova;
- justificativa;
- organização;
- data e hora;
- correlação.

## 16. Critérios de aceite

- [ ] Novo módulo pode ser registrado sem editar menu estático.
- [ ] Módulo pode ser habilitado ou desabilitado por organização.
- [ ] Perfil pode ser criado pela administração sem alteração de código.
- [ ] Usuário pode possuir vários perfis.
- [ ] Override individual pode conceder ou negar capacidade.
- [ ] Usuário sem capacidade recebe bloqueio no backend.
- [ ] RLS impede acesso direto aos dados.
- [ ] Menu e dashboard refletem as capacidades efetivas.
- [ ] Desativar módulo não apaga dados históricos.
- [ ] Eventos entre módulos são idempotentes.
- [ ] Toda mudança administrativa é auditada.

## 17. Regra permanente

Toda nova etapa deverá responder antes da implementação:

1. Isto pertence ao núcleo ou a um módulo?
2. Quais capacidades o módulo oferece?
3. Quais dependências possui?
4. Quais eventos publica e consome?
5. Como é habilitado por organização?
6. Como aparece no dashboard e no menu?
7. Como é protegido no backend, RLS e Storage?
8. Como pode ser removido ou desabilitado sem corromper outros módulos?
