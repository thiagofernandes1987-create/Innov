# ETAPA 09 — Plano de Testes

## Qualidade de código

```bash
pnpm install
pnpm validate:stage9
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Banco

Aplicar todas as migrations em um projeto Supabase de homologação vazio e repetir em uma cópia com dados controlados.

Validar:

- criação de tabelas, enums, índices e triggers;
- políticas RLS;
- buckets privados;
- funções transacionais;
- rollback do ambiente em caso de falha;
- imutabilidade das versões congeladas;
- avanço de status e aprovação sem alteração dos valores.

## Usuários

### Administrador

- login com `admin@innov.eng.br`;
- acesso a `/app/orcamentos`;
- criação de orçamento;
- cálculo;
- congelamento;
- aprovação com AAL2;
- geração de proposta e contrato;
- criação de envelope sandbox.

### Cliente

- login com `cliente@cliente.com`;
- bloqueio de `/app/*`;
- acesso a `/cliente/*`;
- leitura somente de propostas, contratos, aditivos e assinaturas próprios e liberados;
- tentativa de acesso por ID de outro cliente deve resultar em negação.

## Motor financeiro

- BDI com componentes válidos;
- tributo que invalida denominador;
- markup multiplicador;
- markup divisor;
- margem diferente de markup;
- ROI com e sem capital;
- payback;
- necessidade máxima de caixa;
- taxa administrativa duplicada;
- custos fixos duplicados;
- lucro/margem duplicados;
- preço abaixo do custo;
- margem e ROI abaixo da política.

## Versões

- V1 criada automaticamente;
- nova versão copia premissas e itens;
- versão congelada bloqueia itens e valores;
- status pode avançar;
- proposta enviada não é sobrescrita;
- contrato assinado não é sobrescrito;
- aditivo preserva contrato original.

## PDFs

- geração server-side;
- somente dados comerciais;
- hash SHA-256;
- bucket privado;
- Idempotency-Key obrigatório;
- repetição retorna o mesmo documento;
- falha no update remove upload órfão;
- caracteres em português;
- paginação e rodapé.

## Assinatura

- provider sandbox identificado como sem validade jurídica;
- criação exige AAL2;
- HMAC válido e inválido;
- timestamp expirado;
- replay do mesmo evento;
- atualização de signatário;
- conclusão de contrato;
- aplicação idempotente de aditivo;
- provider real sem credencial deve falhar de forma explícita.

## Segurança

- cliente com membership `CLIENTE` não herda política interna;
- Service Role ausente do bundle do navegador;
- segredos ausentes do repositório;
- URL assinada curta;
- download auditado;
- IDOR;
- SQL injection;
- open redirect;
- MFA AAL2;
- separação de funções;
- auditoria sem conteúdo integral do documento.
