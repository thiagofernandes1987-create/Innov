# Adendo de escopo — Multiobra, assinatura avançada e acesso modular

**Status:** obrigatório antes da Etapa 13.  
**Origem:** revisão de escopo do proprietário em 19/07/2026.

## 1. Cadastro de várias obras por cliente

A relação funcional será `cliente 1:N obras`.

Um mesmo cliente poderá possuir simultaneamente:

- várias obras em planejamento;
- várias obras em execução;
- obras suspensas;
- obras concluídas;
- obras arquivadas;
- contratos, documentos, equipes, cronogramas e históricos independentes por obra.

### Interface do cliente interno

Na ficha administrativa do cliente existirão:

- resumo cadastral;
- aba **Obras em aberto**;
- aba **Obras concluídas**;
- aba **Todas as obras**;
- botão **Cadastrar nova obra**;
- filtros por status, gestor, cidade, período e contrato;
- indicadores de quantidade, valor contratado e progresso médio;
- acesso ao histórico completo de cada obra.

### Regras

- uma obra pertence a exatamente um cliente no MVP;
- um cliente pode ter qualquer quantidade de obras;
- cada obra mantém sua própria permissão, contrato, EAP, cronograma, documentos e diário;
- concluir uma obra não encerra ou altera as demais;
- o portal do cliente consolida todas as obras liberadas, separando abertas e concluídas;
- o cadastro poderá começar pela ficha do cliente ou por um contrato assinado/ativo.

## 2. Assinatura documental avançada

O módulo de assinaturas aceitará como documento de origem:

- PDF;
- DOCX.

Para DOCX, o sistema deverá:

1. preservar o arquivo original;
2. gerar uma representação PDF para posicionamento e assinatura;
3. registrar hash do original e da representação;
4. produzir a cópia final assinada em PDF;
5. manter a cadeia de versões e evidências.

### Campos posicionáveis no layout

O editor de documento permitirá inserir campos por página e coordenada:

- assinatura;
- rubrica;
- data;
- nome completo do cliente;
- texto livre;
- caixa de confirmação;
- campo para fotografia;
- campo para anexar documento.

Cada campo terá:

- página;
- posição X e Y;
- largura e altura;
- signatário responsável;
- obrigatório ou opcional;
- ordem de preenchimento;
- estado de preenchimento;
- valor e evidência associados.

### Captura pelo signatário

O cliente poderá:

- desenhar a assinatura;
- desenhar ou informar a rubrica;
- usar assinatura digitada quando autorizada;
- tirar foto pela câmera do celular;
- selecionar foto já existente;
- anexar PDF ou imagem de documento;
- revisar o documento antes da conclusão;
- baixar ou receber uma cópia final.

### Hash e integridade

Serão registrados, no mínimo:

- SHA-256 do arquivo original;
- SHA-256 do PDF renderizado;
- SHA-256 da versão final assinada;
- SHA-256 de cada anexo;
- data e hora de cada evento;
- usuário ou signatário associado;
- versão do documento;
- histórico de visualização, preenchimento e conclusão;
- trilha de auditoria imutável.

Qualquer alteração nos bytes do documento deverá produzir um hash diferente e invalidar a correspondência com a evidência anterior.

### Envio de cópia

Após a conclusão, o sistema oferecerá:

- envio automático por e-mail ao cliente;
- cópia disponível no portal do cliente;
- reenvio manual por usuário autorizado;
- registro de cada envio;
- link temporário ou download autenticado;
- opção de incluir anexos autorizados na cópia.

A validade jurídica, o texto de consentimento, a política de retenção e o provedor definitivo deverão passar por revisão jurídica antes da produção.

## 3. Portal orientado a aplicativos/módulos

Cada função da plataforma será tratada como um aplicativo ou módulo habilitável, por exemplo:

- CRM;
- Clientes;
- Obras;
- Planejamento;
- Tarefas;
- Diário de obras;
- Equipes e recursos;
- Orçamentos;
- Propostas;
- Contratos;
- Assinaturas;
- Aditivos;
- Documentos;
- Qualidade;
- Compras;
- Estoque;
- SAC;
- Relatórios;
- Administração e auditoria.

### Tela inicial do usuário

Após o login, o usuário verá um painel de aplicativos contendo somente os módulos para os quais possui permissão de leitura.

Cada cartão apresentará:

- nome e ícone;
- descrição curta;
- indicadores permitidos;
- pendências do usuário;
- acesso rápido às ações autorizadas.

Módulos sem permissão não aparecerão no painel, no menu, na busca ou nos atalhos.

## 4. Permissões administrativas por módulo

O menu administrativo terá uma área **Usuários, perfis e acessos**.

O administrador poderá definir permissões por:

- perfil/papel;
- usuário específico;
- módulo;
- organização;
- obra, quando aplicável.

### Níveis simplificados solicitados

A interface oferecerá níveis cumulativos:

1. **Sem acesso**;
2. **Somente leitura**;
3. **Leitura e edição**;
4. **Leitura, edição e exclusão**.

### Permissões avançadas internas

Para módulos críticos, o backend separará ações adicionais:

- criar;
- ler;
- atualizar;
- excluir;
- aprovar;
- liberar ao cliente;
- assinar;
- exportar;
- administrar configurações;
- visualizar dados financeiros sensíveis.

Os níveis simplificados serão modelos de configuração, mas as permissões reais serão armazenadas de forma granular.

### Exemplo obrigatório

No aplicativo **Orçamentos**:

- Diretor: leitura, criação, edição, aprovação, exportação e exclusão conforme política;
- Orçamentista: leitura, criação e edição, com aprovação conforme limite definido;
- Usuário comum: sem acesso;
- Cliente: somente documentos comerciais explicitamente liberados, nunca custos internos, BDI, markup, margem ou ROI.

### Regras de segurança

- ocultar um módulo na interface não substitui autorização;
- páginas, ações server-side, RPCs, APIs, consultas e Storage devem validar a permissão;
- alteração de acesso gera auditoria com antes, depois, autor e horário;
- permissões de usuário podem complementar ou restringir o perfil padrão;
- prevalece a regra mais restritiva em caso de bloqueio explícito;
- exclusão física será evitada em entidades auditáveis, utilizando cancelamento ou arquivamento quando necessário;
- acessos podem possuir data de expiração;
- usuários suspensos perdem todos os acessos imediatamente.

## 5. Modelo de dados proposto

Entidades previstas:

- `app_modules` — catálogo de aplicativos;
- `permission_actions` — catálogo de ações;
- `access_profiles` — perfis configuráveis por organização;
- `profile_module_permissions` — permissões padrão do perfil;
- `user_module_permission_overrides` — exceções por usuário;
- `project_access_overrides` — exceções por obra;
- `permission_change_audit` — trilha de alterações;
- `signature_documents` — documento de origem e versão renderizada;
- `signature_document_versions` — hashes e arquivos;
- `signature_fields` — campos posicionados;
- `signature_field_values` — valores preenchidos;
- `signature_attachments` — fotos e documentos anexos;
- `signature_delivery_events` — envio e reenvio de cópias.

## 6. Ordem de implementação

### Etapa 12.1 — Multiobra e acesso modular

- ficha do cliente com várias obras;
- separação de obras abertas e concluídas;
- catálogo de módulos;
- perfis de acesso;
- permissões por módulo e ação;
- painel inicial orientado aos módulos habilitados;
- menu filtrado;
- proteção server-side;
- auditoria de alterações de acesso.

### Etapa 12.2 — Assinatura documental avançada

- upload PDF e DOCX;
- conversão/renderização para PDF;
- editor de campos;
- assinatura, rubrica, data e nome completo;
- foto e anexos;
- hashes e cadeia de integridade;
- cópia final;
- envio ao cliente;
- portal e histórico de entrega.

### Etapa 13

Somente após a fundação de acesso modular:

- Qualidade;
- PO/FVS/FVM;
- não conformidades;
- relatórios;
- indicadores executivos.

## 7. Critérios de aceite

O adendo será considerado concluído quando:

- um cliente possuir duas ou mais obras simultâneas sem conflito;
- obras abertas e concluídas forem exibidas separadamente;
- usuário comum não visualizar nem acessar Orçamentos;
- orçamentista acessar apenas ações permitidas;
- diretor possuir o nível aprovado de controle;
- tentativa de acesso direto por URL for bloqueada no servidor;
- administrador alterar acessos por módulo e nível;
- toda alteração de permissão for auditada;
- PDF e DOCX puderem originar um envelope;
- campos de assinatura, rubrica, data e nome forem posicionados no layout;
- cliente puder tirar foto e anexar documentos;
- documento final e anexos possuírem SHA-256;
- cópia final puder ser enviada e acessada pelo cliente;
- versões concluídas forem imutáveis.
