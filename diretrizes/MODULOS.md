# Contratos dos módulos — Innovar Platform

**Atualizado em:** 9 de agosto de 2026  
**Versão:** 0.19.0  
**Registro técnico:** `lib/modules/registry.ts`

Cada módulo possui chave estável, rota, estado por organização, dependências, capacidades e escopos. Desabilitar um módulo preserva dados e bloqueia o uso funcional. Perfis personalizados não são sobrescritos por instaladores. Nenhum módulo em implementação deve ser descrito como homologado antes dos testes reais de banco, segurança e integração externa.

## `dashboard` — Início

- rota `/app`;
- módulo de sistema;
- mostra apenas aplicativos habilitados e autorizados;
- não expõe métricas inventadas quando uma fonte falha.

## `crm` — CRM e Vendas

- rota `/app/crm`;
- versão `1.0.0`;
- sensível e habilitado por padrão;
- implementação e banco homologados na Etapa 18.

Escopo:

- leads, origem, campanha, interesse, orçamento e follow-up;
- deduplicação por documento, e-mail e telefone;
- pipeline de oportunidades;
- atividades comerciais;
- conversão idempotente para cliente e oportunidade;
- motivo obrigatório de perda;
- histórico de estágio append-only;
- métricas de pipeline ponderado e vendas ganhas.

Segurança:

- acesso exclusivamente interno;
- pipeline não exposto ao cliente;
- criação e estados críticos somente por RPC;
- zero RPC operacional para `anon`;
- RLS por organização.

## `clientes` — Clientes

- rota `/app/clientes`;
- versão `1.0.0`;
- sensível e habilitado por padrão;
- Cliente 360 implementado e homologado na Etapa 18.

Escopo:

- pessoa física ou jurídica;
- contatos adicionais e contato principal;
- preferências de comunicação;
- consentimentos LGPD append-only;
- oportunidades, contratos, atividades e chamados;
- um cliente pode possuir múltiplas obras abertas ou concluídas;
- arquivamento sem apagar histórico;
- dados sensíveis mascarados por capacidade.

## `obras` — Obras

- rota `/app/obras`;
- depende de `clientes`;
- carteira multiobra, datas, progresso, gerente, contrato e portal;
- somente obra liberada aparece ao cliente.

## `planejamento` — Planejamento

- rota `/app/planejamento`;
- depende de `obras`;
- EAP, cronograma, dependências, marcos e baselines;
- baseline concluída é imutável.

## `tarefas` — Tarefas

- rota `/app/tarefas`;
- depende de `obras`;
- responsáveis, prioridade, datas, progresso e bloqueios;
- reservas de estoque podem apontar para tarefa.

## `diario` — Diário de Obras

- rota `/app/diario`;
- depende de `obras`;
- atividades, mão de obra, segurança, ocorrências e mídias;
- bucket privado `daily-log-media`;
- antimalware ainda pendente fora do SAC.

## `equipes` — Equipes

- rota `/app/equipes`;
- depende de `obras`;
- equipes, integrantes, recursos e atribuições;
- integração com custódia de ativos.

## `orcamentos` — Orçamentos

- rota `/app/orcamentos`;
- depende de `clientes`;
- custos, taxa administrativa, BDI, markup, margem, ROI e cenários;
- versão congelada é imutável.

## `propostas` — Propostas

- rota `/app/propostas`;
- depende de `orcamentos`;
- versões, PDF, validade, liberação e aceite;
- cliente vê somente versão liberada.

## `contratos` — Contratos

- rota `/app/contratos`;
- depende de `propostas`;
- templates, versões, partes, vigência e valores;
- versão enviada ou assinada é imutável.

## `aditivos` — Aditivos

- rota `/app/aditivos`;
- depende de `contratos`;
- alterações de escopo, valor e prazo;
- aplicação ao contrato é idempotente.

## `assinaturas` — Assinaturas

- rota `/app/assinaturas`;
- depende de `documentos`;
- operacional em sandbox;
- PDF/DOCX, conversão, layout e campos;
- assinatura, rubrica, data, nome completo, foto e anexos;
- SHA-256 do original, campos, anexos, PDF final e evidência;
- cópia para o cliente;
- provider jurídico real continua pendente de produção.

## `documentos` — Documentos

- rota `/app/documentos`;
- arquivos privados, disciplinas, versões, hashes e liberação;
- versão liberada é imutável;
- integra documentos de obras, propostas, contratos e assinaturas.

## `modelos` — Modelos e Documentações

- rota `/app/modelos`;
- operacional;
- **uma biblioteca só**: proposta, orçamento, contrato, aditivo, termos, FVS, FVM, procedimento, mensagens de CRM, mensagem por etapa do funil, lembrete, agendamento, e-mail e e-mail marketing;
- **todo aplicativo lê o mesmo acervo** — é o que permite enviar a proposta de dentro de Projetos e anexar o contrato assinado num atendimento;
- `document_type` classifica; a Administração marca, por empresa, quais tipos cada aplicativo oferece (`document_module_types`) — isso é disponibilização, não permissão;
- origem `PLATAFORMA` vale para todas as empresas e muda por migration; a empresa duplica e edita a cópia;
- corpo em Markdown com variáveis `{{escopo.campo}}`; publicado exige a alçada mais alta do aplicativo;
- importa DOCX, XLSX, CSV, TXT e Markdown, convertidos no navegador.

## `qualidade` — Qualidade

- rota `/app/qualidade`;
- depende de `obras`;
- biblioteca, FVS, FVM, formulários internos, formulários para clientes e pesquisas;
- schema publicado é imutável.

## `compras` — Compras e Suprimentos

- rota `/app/compras`;
- depende de `obras` e `qualidade`;
- solicitações, fornecedores, cotações, comparação, aprovação, pedidos e recebimentos;
- somente quantidade aceita alimenta estoque;
- recebimento é idempotente.

## `estoque` — Estoque, Inventário e Almoxarifado

- rota `/app/estoque`;
- versão `1.0.0`;
- incorporado e homologado na Etapa 17;
- dependências: Compras e Obras;
- integrações: Equipes, Financeiro e Relatórios.

Escopo:

- catálogo, unidades, categorias, lotes e validade;
- depósitos e localizações;
- entradas, saídas, devoluções, transferências, perdas, ajustes e reversões;
- reservas por obra/tarefa;
- ativos, custódias e manutenção;
- inventário físico;
- dashboard e detalhes seguros.

Razão:

```text
saldo físico = soma das linhas de movimentos POSTED/REVERSED e REVERSAL
saldo reservado = reservado - consumido - liberado
saldo disponível = físico - reservado
```

Segurança e concorrência:

- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- correção por reversão;
- advisory lock por posição;
- custos protegidos;
- isolamento multiempresa e multiobra;
- zero RPC operacional para `anon`.

Definition of Done adicional:

- documentação atualizada no mesmo PR;
- migration aplicada e homologada;
- recebimento de Compras integrado de forma idempotente;
- saldo não editável diretamente;
- movimentos concluídos imutáveis;
- testes de concorrência e saldo;
- isolamento multiempresa e multiobra;
- CI verde.

## `financeiro` — Financeiro Operacional

- rota `/app/financeiro`;
- depende de `obras`, `contratos` e `compras`;
- contas a pagar/receber, parcelas, aprovações, baixas, comprovantes, medições e caixa;
- custos de estoque são informativos e não criam lançamento automaticamente.

## `sac` — Pós-venda e SAC

- rota interna `/app/ocorrencias`;
- rota do cliente `/cliente/ocorrencias`;
- versão `1.0.0`;
- sensível e habilitado por padrão;
- implementação e banco homologados na Etapa 18;
- depende de `clientes`.

Escopo:

- categorias e SLAs;
- abertura interna, telefone, e-mail, WhatsApp ou portal;
- vínculo a cliente, obra e contrato;
- prioridades, estados e responsáveis;
- mensagens internas ou públicas;
- fotos, PDF e DOCX até 25 MB;
- SHA-256 e bucket privado `crm-sac-attachments`;
- eventos append-only;
- encerramento, reabertura e satisfação;
- indicadores de fila, atraso e tempo de resolução.

Segurança:

- cliente vê somente os próprios chamados;
- mensagem interna, anexo interno e evento não aparecem no portal;
- mudanças de estado somente por RPC;
- download autenticado por URL assinada curta;
- anexos novos devem passar pela quarentena da Etapa 20;
- zero RPC operacional para `anon`.

## `whatsapp` — WhatsApp e Atendimento

- rota `/app/whatsapp`;
- versão inicial `1.0.0`;
- sensível;
- branch funcional `feature/etapa-22-whatsapp-omnichannel`;
- PR de rascunho `#39`;
- implementação em andamento e **não homologada**;
- provider produtivo inicial: Meta WhatsApp Business Platform — Cloud API;
- dependências: `clientes`, `crm`, `sac` e `documentos`.

Escopo inicial:

- caixa de entrada compartilhada;
- contas, contatos, conversas e mensagens;
- vínculo com Cliente 360, obra, contrato, oportunidade e chamado SAC;
- texto, template aprovado e documento privado;
- recebimento de texto e metadados de mídia;
- estados enviado, entregue, lido e falho;
- janela móvel de atendimento de 24 horas;
- webhooks assinados e idempotentes;
- registro de proveniência da mensagem.

Fontes canônicas das mensagens padrão:

- `contract_templates`;
- `proposal_versions`;
- `contract_versions`;
- `amendment_versions`;
- `project_document_versions`.

O módulo não mantém uma cópia editável das mensagens padrão. Cada binding referencia a fonte e o envio registra tipo, ID, campo, versão, nome, SHA-256 e instante de resolução. Mensagens livres permanecem possíveis somente dentro das regras do provider e das permissões do usuário.

Segurança:

- HMAC SHA-256 em `x-hub-signature-256`;
- RLS em todas as tabelas;
- `service_role` exclusivamente server-side;
- nenhuma credencial versionada;
- URLs de documentos privadas e temporárias;
- idempotência de envio e webhook;
- histórico sem exclusão direta;
- estados de entrega monotônicos no domínio e no PostgreSQL;
- nenhuma dependência de Puppeteer, Baileys, `whatsapp-web.js` ou sessão por QR Code em produção;
- WhatsControl e Evolution API não foram incorporados ao código;
- padrões do wacrm podem ser adaptados sob MIT com atribuição quando houver cópia substancial.

Pendências antes da homologação:

- aplicar migrations em ambiente controlado;
- verificar e registrar o número na Meta;
- assinar a WABA ao aplicativo;
- configurar secrets em homologação;
- sincronizar ciclo de vida dos templates;
- tornar mídia recebida compatível com quarentena/antimalware;
- E2E de texto, template, documento, inbound e status;
- filas, atribuição, notas internas e handoff;
- revisão de RLS, índices, advisors, LGPD e retenção;
- lint, typecheck, testes e build verdes.

Definition of Done:

- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas;
- isolamento multiempresa e multiobra comprovado;
- nenhum texto padrão duplicado fora da fonte canônica;
- webhook e status idempotentes;
- nenhum provider não oficial no runtime produtivo;
- CI verde;
- PR revisado sem merge automático.

## `rh` — Recursos Humanos e Departamento Pessoal

- rota `/app/rh`;
- sensível;
- branch funcional `feature/projeto-rh-especificacao-funcional`;
- PR de rascunho `#42`;
- implementação funcional validada internamente; **homologação externa, piloto e produção ainda não concluídos**;
- integra com `financeiro`, `documentos`, eSocial, DCTFWeb/Integra Contador e FGTS Digital conforme canais oficiais realmente disponíveis.

Escopo:

- pessoas, trabalhadores, vínculos, empresas, estabelecimentos, lotações, cargos/CBO, funções, sindicatos e jornadas;
- admissão, alterações contratuais/cadastrais, ponto, férias, afastamentos, benefícios, SST, desligamento e offboarding;
- folha parametrizada com rubricas versionadas, bases declarativas, IRRF 2026, múltiplos vínculos, 13º, férias, rescisão, retroativos/complementares, provisões e contabilização;
- pagamentos internos com conta/PIX, ordens, lotes, liquidação e evidência;
- documentos privados, recibos PDF, Meu RH e relatórios;
- folha-sombra e reconciliação.

eSocial suportado internamente:

- S-1000/S-1005/S-1010/S-1020;
- S-2190/S-2200 CLT padrão/S-2205/S-2206;
- S-2230 nos caminhos modelados;
- S-2210/S-2220/S-2240;
- S-2299/S-2399 nos caminhos modelados;
- S-1200/S-1210/S-1298/S-1299;
- XMLDSig RSA-SHA256/SHA-256, C14N conferida com `xmllint`, assinatura verificada por `xmlsec1` e XML validado contra XSD oficial S-1.3 vigente;
- mTLS, lote, protocolo, consulta, recibo e ocorrências por evento;
- Produção bloqueada por padrão.

Segurança e dados:

- RLS por organização e FKs compostas para isolamento multiempresa;
- dados clínicos/sensíveis segregados;
- mudanças críticas por RPC/transação;
- histórico temporal preservado;
- Storage privado para documentos;
- Service Role apenas server-side;
- nenhuma API governamental fictícia: adapters usam Web Service, feed, arquivo ou portal conforme o serviço oficial.

Integrações governamentais:

- DCTFWeb tratada como obrigação sensibilizada por fontes oficiais, com workspace e reconciliação;
- MIT JSON leiaute 1.0 com regras condicionais;
- Integra Contador somente por capabilities/paths efetivamente contratados;
- FGTS Digital com bases, guia/pagamento/conciliação e arquivo rescisório oficial; ações sem API pública permanecem assistidas por portal.

Qualidade interna:

- migrations RH replayadas em PostgreSQL isolado;
- regressões de banco, typecheck e lint específicos;
- XMLs eSocial testados contra XSD oficial;
- XMLDSig verificado por implementação externa;
- backup/restore isolado com comparação de tabelas, dados, RLS, policies e funções;
- gates RH específicos verdes no checkpoint registrado em `docs/PROJETO-RH-EXECUCAO-STATUS-IMPLEMENTACAO.md`.

Pendências antes de homologação/piloto:

- Produção Restrita eSocial com certificado/inscrições reais e protocolo oficial;
- Browser E2E em ambiente HTTPS isolado;
- Integra Contador com contrato e credenciais reais;
- folha-sombra contra fonte autorizada real;
- casos especiais de eSocial ainda não modelados;
- rehearsal de cutover/rollback;
- piloto e GO/NO_GO de negócio.

Definition of Done para produção:

- documentação atualizada no mesmo PR;
- migrations aplicadas e homologadas no ambiente candidato;
- gates RH internos verdes no mesmo SHA;
- homologação eSocial real concluída;
- reconciliação sombra aceita;
- restore/cutover ensaiados;
- parâmetros legais aprovados pelo responsável competente;
- piloto sem divergência crítica;
- CI global verde;
- PR revisado sem merge automático.

## `relatorios` — Relatórios e Indicadores

- rota `/app/relatorios`;
- depende de `obras`;
- dashboards, metas, alertas, relatórios salvos, snapshots e CSV;
- valores sensíveis mascarados;
- snapshots concluídos imutáveis.

## `auditoria` — Auditoria e Observabilidade

- rota-base `/app/auditoria`;
- versão `1.0.0` na Etapa 19;
- aplicativo sensível, central e habilitado por padrão;
- dependência: `administracao`;
- acesso padrão: `SUPER_ADMIN`, `DIRECAO` e `ADMINISTRADOR`;
- cliente não possui acesso.

Escopo:

- fluxo unificado de eventos sem duplicar trilhas de domínio;
- pesquisa por módulo, severidade, texto, período e `correlation_id`;
- sanitização recursiva de payloads;
- idempotência por `deduplication_key`;
- alertas, health checks e diagnósticos;
- retenção entre 30 e 3650 dias.

Segurança:

- leitura exige `auditoria:read`;
- configuração e transições exigem capacidade `administer`;
- eventos e health checks são append-only;
- escrita direta bloqueada;
- RPCs não executáveis por `anon`;
- segredos e credenciais recebem `[REDACTED]`.

## `administracao` — Administração

- rota `/app/administracao`;
- módulo de sistema;
- catálogo de módulos, perfis, usuários, escopos, overrides e permissões;
- níveis: nenhuma, leitura, edição e exclusão;
- capacidades adicionais: aprovar, liberar, assinar, exportar, administrar e visualizar sensíveis.

## Definition of Done da Etapa 18

- documentação atualizada no mesmo PR;
- migrations aplicadas, homologadas e alinhadas ao ledger remoto;
- leads, oportunidades e conversão idempotente;
- Cliente 360 multiobra;
- SAC interno e do portal;
- mensagens, anexos, SLA e eventos;
- RLS interna e do cliente;
- nenhuma RPC operacional para `anon`;
- todas as FKs indexadas;
- CI verde;
- PR pronto para revisão, sem merge automático.