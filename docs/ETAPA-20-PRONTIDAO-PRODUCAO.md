# Etapa 20 — Prontidão de Produção

## Estado

**Em implementação.**  
Branch: `feature/etapa-20-prontidao-producao`  
Base empilhada: `chore/encerramento-etapa-19` / PR `#22`  
Versão implementada atual: `0.19.0`  
Produção: não liberada

## Objetivo

Transformar a plataforma tecnicamente homologada em uma solução operável com segurança, recuperabilidade, evidência, experiência consistente e publicação controlada.

```text
plataforma homologada
→ riscos produtivos classificados
→ segurança e recuperação comprovadas
→ experiência consolidada
→ observabilidade externa
→ validação jurídica/LGPD
→ publicação controlada
```

## Escopo incluído

### 1. Governança de produção

- manifesto de estado legível por máquina;
- checklist de go-live;
- matriz de bloqueios, responsáveis e evidências;
- plano de rollback;
- critérios explícitos de `GO`, `NO_GO` e `CONDITIONAL_GO`;
- proibição de publicação automática.

### 2. Segurança

- revisão de RLS, privilégios e funções `SECURITY DEFINER`;
- proteção contra senhas comprometidas;
- MFA adicional para ações críticas;
- segregação de funções;
- rate limiting e proteção de endpoints quando aplicável;
- pentest e registro de remediações;
- revisão de headers, cookies, sessões e exposição no bundle;
- antimalware e quarentena de anexos.

### 3. Concorrência e carga

- duas ou mais conexões disputando a mesma posição de estoque;
- validação de advisory locks;
- testes de carga representativos;
- comportamento sob retry, timeout e falha parcial;
- limites documentados;
- dados artificiais isolados e revertidos.

### 4. Backup e recuperação

- backup do PostgreSQL;
- inventário de buckets privados;
- restauração em ambiente isolado;
- validação de migrations e ledger após restauração;
- medição de RPO e RTO;
- evidência reproduzível;
- plano de contingência para Auth, DNS e providers.

### 5. Assinatura jurídica

- seleção de provider real;
- webhook autenticado e idempotente;
- evidências e hashes;
- política de retry e reconciliação;
- cópia ao cliente;
- revisão jurídica do fluxo e dos termos;
- fallback operacional.

### 6. Retenção e telemetria

- APM/telemetria externa sem dados sensíveis;
- correlação com `correlation_id`;
- alertas de disponibilidade e erro;
- worker de retenção com dry-run;
- preservação legal;
- exportação antes de purge quando aplicável;
- auditoria da execução técnica.

### 7. Experiência e acessibilidade

- adoção permanente de `diretrizes/UI-UX-PRO-MAX.md`;
- consolidação dos tokens e componentes-base;
- correção de classes sem implementação visual;
- revisão da navegação interna e do dashboard;
- estados de loading, vazio, erro, indisponibilidade e acesso negado;
- WCAG 2.2 AA;
- teclado, foco, zoom e reflow;
- revisão desktop, tablet e mobile;
- motion discreto e redução de movimento.

### 8. Jurídico, contábil e LGPD

- bases legais e finalidades;
- consentimentos e registros;
- retenção e descarte;
- atendimento a titulares;
- contratos e termos;
- responsabilidades de fornecedores;
- classificação de dados sensíveis;
- validação de integrações fiscais e contábeis aplicáveis.

## Fora do escopo

- WMS avançado;
- RFID;
- roteirização logística;
- ressuprimento automático sem aprovação;
- integração fiscal completa de entrada;
- depreciação contábil oficial;
- expansão funcional não relacionada à prontidão;
- publicação sem evidência e aprovação explícita.

Esses itens pertencem à Etapa 21 ou a etapas posteriores.

## Fluxos

### Fluxo de prontidão

```text
requisito
→ risco
→ implementação ou procedimento
→ teste
→ evidência
→ revisão
→ decisão de go-live
```

### Fluxo de anexo protegido

```text
sessão autorizada
→ validação de módulo e contexto
→ tipo e tamanho
→ hash
→ quarentena
→ análise antimalware
→ liberação ou bloqueio
→ armazenamento privado
→ download autenticado
→ auditoria
```

### Fluxo de incidente

```text
detecção
→ classificação
→ contenção
→ comunicação
→ recuperação
→ validação
→ causa raiz
→ vacina
→ post-mortem
```

### Fluxo de backup e restauração

```text
snapshot
→ verificação de integridade
→ armazenamento protegido
→ restauração isolada
→ migrations/ledger
→ smoke tests
→ RPO/RTO
→ evidência
```

## Modelo de dados

A primeira fatia da Etapa 20 não cria schema novo. Qualquer necessidade posterior de banco deve usar migration append-only e documentar:

- objeto criado ou alterado;
- RLS;
- privilégios;
- índices;
- impacto em lock;
- backfill;
- estratégia corretiva;
- retenção;
- teste de integridade.

## Rotas

A fundação inicial não adiciona rota pública. Rotas futuras da etapa devem ser internas e autorizadas, salvo fluxo explicitamente destinado ao cliente.

Superfícies prioritárias de revisão:

```text
/app
/app/auditoria
/app/estoque
/app/assinaturas
/app/documentos
/app/qualidade
/app/ocorrencias
/cliente
```

## RPCs e integrações

Integrações planejadas:

- provider jurídico de assinatura;
- serviço antimalware;
- telemetria/APM;
- rotina de backup;
- worker de retenção;
- canal de incidentes.

Toda integração deve possuir timeout, retry controlado, idempotência, sanitização, health check, auditoria e procedimento de indisponibilidade.

## Segurança e RLS

- nenhuma política é flexibilizada para produção;
- nenhuma RPC operacional para `anon`;
- Service Role somente no servidor;
- `SECURITY DEFINER` com `search_path` explícito e autorização interna;
- dados sensíveis sem exposição em logs;
- arquivos privados sem URL pública permanente;
- ações críticas podem exigir MFA, motivo e alçada;
- testes negativos obrigatórios.

## Storage

Buckets existentes permanecem privados. A etapa deve inventariar:

- tipos permitidos;
- limites de tamanho;
- contexto de organização e recurso;
- hash;
- quarentena;
- análise antimalware;
- política de retenção;
- download autenticado;
- remoção de órfãos;
- backup ou estratégia de recuperação.

## UI/UX Pro Max

A direção visual canônica é **Arquitetura em operação**:

- azul profundo, cobre e materiais naturais;
- densidade controlada;
- hierarquia por estrutura, não por decoração;
- cards somente para agrupamentos reais;
- status semânticos com texto;
- navegação clara e autorizada;
- foco visível e alvos de 44px;
- sem preset SaaS rosa/fúcsia;
- sem métricas inventadas;
- sem depender de hover ou cor;
- estados completos e responsividade real.

A primeira implantação cobre o shell interno e a central de aplicativos, criando base reutilizável para os módulos seguintes.

## Migrations

Nenhuma migration criada na fundação inicial.

Migrations futuras devem ser listadas aqui em ordem lexical e alinhadas ao ledger remoto.

## Testes

### Estruturais

- `pnpm validate:docs`;
- `pnpm validate:vaccines`;
- `pnpm validate:migrations`;
- `pnpm validate:stage20`;
- validadores das Etapas 9 a 19.

### Qualidade

- lint;
- typecheck;
- testes TypeScript;
- testes Python;
- build de produção.

### UI/UX

- presença dos tokens canônicos;
- classes usadas pelo dashboard possuem implementação;
- link de salto;
- foco visível;
- alvos mínimos;
- redução de movimento;
- breakpoints de tablet e mobile;
- ausência do preset rosa/fúcsia;
- estados vazio e acesso negado preservados.

### Produção

Serão adicionados progressivamente:

- E2E autenticado transversal;
- concorrência de estoque;
- carga;
- backup/restauração;
- provider jurídico;
- antimalware;
- retenção;
- incidentes;
- pentest.

## Homologação

A fundação é considerada homologada somente após CI verde no PR da Etapa 20.

Requisitos externos serão marcados como pendentes com evidência objetiva; não serão declarados concluídos por inferência.

## Vacinas aplicadas ou criadas

- `VACINA-003` — ledger de migrations;
- `VACINA-004` — privilégios de RPC;
- `VACINA-005` — workflow protegido;
- `VACINA-006` — runtimes de GitHub Actions;
- `VACINA-007` — scanner de secrets;
- `VACINA-008` — instalação consistente;
- `VACINA-009` — pré-requisitos de E2E;
- `VACINA-010` — relatórios JSON;
- `VACINA-012` — estado pós-merge.

Nova vacina será criada quando surgir causa raiz reutilizável durante a etapa.

## Limitações iniciais

- produção ainda não liberada;
- provider jurídico não selecionado;
- antimalware não integrado;
- backup/restauração produtivos não comprovados;
- pentest externo não realizado;
- telemetria externa não conectada;
- retenção automática não executada;
- revisão jurídica/LGPD pendente;
- concorrência real de estoque pendente.

## Próximos passos

1. validar a fundação documental e visual no CI;
2. fechar pendências de concorrência do estoque;
3. implementar backup e restauração;
4. proteger anexos;
5. integrar provider jurídico;
6. implementar telemetria e retenção;
7. revisar Auth, MFA e senhas comprometidas;
8. realizar pentest e revisões externas;
9. executar go-live controlado.

## Definition of Done

- [x] branch da etapa criada;
- [x] contrato técnico inicial criado;
- [x] UI/UX Pro Max instituída como diretriz canônica;
- [ ] PR em rascunho criado;
- [ ] validador da Etapa 20 ativo no CI;
- [ ] shell interno e dashboard consolidados;
- [ ] CI da fundação verde;
- [ ] concorrência real de estoque comprovada;
- [ ] backup e restauração comprovados;
- [ ] anexos protegidos por antimalware;
- [ ] provider jurídico homologado;
- [ ] telemetria e retenção operacionais;
- [ ] MFA e proteção de credenciais revisados;
- [ ] pentest e revisões externas concluídos;
- [ ] decisão de publicação registrada;
- [ ] documentação canônica atualizada no mesmo PR;
- [ ] CI verde;
- [ ] merge somente após aprovação explícita.
