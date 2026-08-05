# Playbooks e fontes canônicas — Sprint W-14

## 1. Objetivo

A Sprint W-14 adiciona políticas e versionamento para comunicações operacionais sem criar uma segunda biblioteca de mensagens. O catálogo existente `whatsapp_content_bindings` continua sendo a referência entre uma comunicação e sua fonte canônica — proposta, contrato, aditivo, modelo contratual ou documento versionado.

```text
fonte canônica versionada
        ↓
whatsapp_content_bindings
        ↓
communication_playbook_versions
        ↓
snapshot imutável da execução
```

Um playbook define **como** uma fonte pode ser utilizada. Ele não armazena novamente o texto da fonte.

## 2. Estrutura persistente

### `communication_playbooks`

Identidade estável do processo de comunicação, escopada por organização. Mantém chave operacional, nome, descrição e estado ativo.

### `communication_playbook_versions`

Versão imutável da política. Cada linha referencia um `whatsapp_content_bindings` existente e registra:

- schema de variáveis;
- autonomia permitida;
- sensibilidade;
- modo obrigatório `CANONICAL_ONLY`;
- exigência de aprovação;
- justificativa da nova versão.

O versionamento é crescente por playbook. Atualizar um processo significa criar uma nova versão; versões antigas não podem ser alteradas ou removidas.

### `communication_playbook_version_approvals`

Decisão humana separada da versão. A aprovação não reescreve o playbook; apenas registra decisão, motivo, responsável e data.

### `communication_playbook_executions`

Ledger imutável de cada utilização. A execução guarda:

- ID e número da versão do playbook;
- ID do binding utilizado;
- variáveis validadas;
- snapshot da fonte, incluindo versão e SHA-256;
- resultado resolvido;
- SHA-256 determinístico do conteúdo da execução;
- conversa, executor e data.

O histórico pode ser reproduzido sem consultar a versão atual do playbook ou da fonte.

## 3. Autonomia e sensibilidade

| Sensibilidade | Autonomia máxima | Aprovação humana |
|---|---|---|
| `ROUTINE` | `AUTO_LOW_RISK` | configurável |
| `SENSITIVE` | `DRAFT_ASSIST` ou `HUMAN_ONLY` | obrigatória |
| `CONTRACTUAL` | `HUMAN_ONLY` | obrigatória |

A migration normaliza qualquer tentativa de autonomia contratual para `HUMAN_ONLY`. Conteúdo sensível ou contratual não pode ser executado antes de uma decisão `APPROVED`.

## 4. Conteúdo canônico e reescrita

Todos os playbooks usam `CANONICAL_ONLY`. Não existem colunas de corpo, texto livre ou cópia do template nas tabelas de playbook.

Para conteúdo contratual:

- a fonte deve ser uma versão canônica resolvida pelo mecanismo já existente;
- variáveis devem pertencer ao schema declarado;
- substituição livre do texto é bloqueada;
- a execução exige aprovação humana;
- versão, binding, fonte e SHA permanecem no snapshot.

## 5. Variáveis

O schema aceita regras textuais explícitas, incluindo obrigatoriedade, tamanho, expressão regular e enumeração. O runtime falha fechado quando:

- uma variável obrigatória está ausente;
- uma variável não declarada é enviada;
- o valor não é texto;
- tamanho, padrão ou enumeração não são atendidos;
- chaves sensíveis como segredo, token, credencial, QR ou pairing aparecem.

## 6. Concorrência e histórico

A criação de versão bloqueia o playbook durante o cálculo do próximo número. Versões e execuções têm triggers de imutabilidade. Dessa forma:

- duas atualizações não reutilizam o mesmo número de versão;
- uma nova versão não altera execuções antigas;
- decisões de aprovação permanecem auditáveis;
- snapshots históricos não dependem do estado corrente da fonte.

## 7. Segurança e multiempresa

Todas as tabelas possuem RLS habilitada e forçada. Usuários autenticados têm somente leitura direta; escrita ocorre por RPCs com verificação central de permissão. Binding, playbook, execução e conversa devem pertencer à mesma organização.

Snapshots possuem limites de tamanho e bloqueiam chaves sensíveis. Material bruto do provider, credenciais, tokens, QR e dados de sessão não pertencem a este domínio.

## 8. Fronteiras desta sprint

A W-14 entrega contratos, persistência, validação e evidência sintética. Ela não:

- registra ou executa um runtime Baileys;
- conecta socket externo;
- cria QR, pairing ou sessão real;
- usa número ou conta real;
- envia comunicação em produção;
- habilita IA autônoma;
- substitui revisão jurídica de conteúdo contratual.
