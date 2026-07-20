# Etapa 14 — Compras e Suprimentos

## Objetivo

Entregar a primeira versão operacional do aplicativo modular de compras:

`solicitação → cotação → mapa comparativo → aprovação → pedido → recebimento → FVM`.

O escopo segue a decisão do roadmap: solicitações e compras essenciais entram no 1.0; inventário/estoque completo permanece para a versão 1.1.

## Regras de escopo

- fornecedor não possui cadastro público;
- o cadastro é feito internamente;
- cada acesso externo ocorre por convite de uma cotação específica;
- o token bruto não é persistido, somente seu SHA-256;
- fornecedores não acessam outras cotações, obras ou dados internos;
- o módulo `estoque` continua desabilitado por padrão;
- o recebimento atualiza o saldo do pedido, mas não cria movimentação de estoque/WMS;
- cada recebimento tenta abrir automaticamente uma FVM usando o modelo `FVM-PADRAO`.

## Fluxos

### 1. Solicitação

A equipe seleciona a obra, informa prioridade, data de necessidade, centro de custo e itens. Cada item possui descrição, especificação, unidade, quantidade e preço-alvo opcional.

Estados:

- `DRAFT`
- `SUBMITTED`
- `IN_QUOTATION`
- `UNDER_APPROVAL`
- `APPROVED`
- `ORDERED`
- `PARTIALLY_RECEIVED`
- `RECEIVED`
- `CANCELED`

### 2. Fornecedor por convite

O fornecedor é cadastrado internamente e recebe um link da forma:

`/fornecedores/cotacoes/{token}`

O banco armazena apenas `token_sha256`, expiração, revogação, abertura e resposta.

### 3. Cotação

A rodada reúne fornecedores convidados, prazo e termos. O fornecedor informa:

- preço por item;
- marca e especificação ofertada;
- prazo de entrega;
- validade;
- pagamento;
- desconto;
- frete;
- impostos;
- observações;
- anexo PDF, DOCX, XLSX ou imagem.

### 4. Mapa comparativo

O motor TypeScript calcula uma nota transparente:

- preço: 60 pontos;
- prazo: 25 pontos;
- cobertura dos itens: 15 pontos.

A classificação é apoio à decisão. A escolha e a aprovação continuam humanas e auditáveis.

### 5. Aprovação e pedido

A proposta selecionada gera uma aprovação pendente. Perfis autorizados aprovam ou rejeitam. A aprovação cria automaticamente:

- pedido;
- itens do pedido;
- valor, condições, previsão e fornecedor;
- evento de auditoria.

### 6. Recebimento e FVM

O recebimento aceita entregas parciais. Para cada item são registrados:

- quantidade recebida;
- quantidade aceita;
- quantidade rejeitada;
- observações.

A conclusão atualiza o saldo do pedido e da solicitação. Quando o modelo padrão existe, cria uma atribuição FVM interna e registra o vínculo em `procurement_receipt_quality`.

## Banco de dados

Tabelas:

1. `procurement_suppliers`
2. `procurement_requests`
3. `procurement_request_items`
4. `procurement_rfqs`
5. `procurement_supplier_invitations`
6. `procurement_quotes`
7. `procurement_quote_items`
8. `procurement_approvals`
9. `procurement_orders`
10. `procurement_order_items`
11. `procurement_receipts`
12. `procurement_receipt_items`
13. `procurement_receipt_quality`
14. `procurement_events`

Bucket privado: `procurement-attachments`.

## Segurança

- RLS habilitado em todas as tabelas;
- acesso interno via `has_module_permission`;
- fornecedor externo opera somente por Server Action com Service Role e token válido;
- envio e recebimento finais são RPCs restritas ao `service_role`;
- aprovações exigem capacidade especial `approve`;
- anexos internos são servidos por URL assinada de curta duração;
- token bruto e URL assinada não são persistidos.

## Perfis iniciais

- Super Admin, Direção e Administrador: acesso completo;
- Gestor de Obras e Engenharia: criação e edição;
- Qualidade: edição e recebimento/FVM;
- Financeiro: leitura e aprovação;
- Orçamentista: leitura e exportação;
- demais perfis: sem acesso inicial.

## Rotas

- `/app/compras`
- `/app/compras/solicitacoes`
- `/app/compras/solicitacoes/nova`
- `/app/compras/solicitacoes/[id]`
- `/app/compras/fornecedores`
- `/app/compras/pedidos`
- `/app/compras/pedidos/[id]`
- `/fornecedores/cotacoes/[token]`
- `/api/compras/cotacoes/[id]/anexo`

## Fora da Etapa 14

- inventário e estoque completo;
- endereçamento físico;
- entradas e saídas por almoxarifado;
- transferência entre obras;
- curva ABC de estoque;
- ressuprimento automático;
- portal público de autoinscrição de fornecedores;
- integração fiscal/contábil com NF-e;
- WMS e logística avançada.
