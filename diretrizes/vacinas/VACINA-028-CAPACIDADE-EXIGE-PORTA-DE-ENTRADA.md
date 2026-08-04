# VACINA-028 — Capacidade exige porta de entrada

**Estado:** vigente
**Detectada em:** loop de personas e auditoria funcional do Odoo, em 28 de julho de 2026

## Qual foi o problema

Planejamento, upload documental e assinatura existiam, mas parte dessas
capacidades não aparecia no menu do aplicativo. Propostas, contratos e aditivos
abriam somente como listas, sem ação para criar o registro seguinte do fluxo.

## Como ocorreu

As páginas foram entregues isoladamente e o catálogo de menus aceitava módulos
sem nenhuma entrada. O runner de personas executava só um aplicativo por
profissão, então uma persona declarada em oito aplicativos podia “passar” tendo
ensaiado apenas um.

## Por que aconteceu

Rota, ação, menu e rotina foram validados separadamente. Nenhuma invariável
exigia que uma capacidade de domínio tivesse uma porta de entrada visível e
fosse exercitada por todas as personas que dependem dela.

## Como foi detectado

O responsável tentou usar contrato, PDF, assinatura e planejamento e não
encontrou os fluxos. A navegação autenticada por 17 aplicativos do Odoo mostrou
o contraste: upload e criação são ações primárias da coleção. O teste inicial
falhou com oito aplicativos sem menu e 111 rotinas declaradas reduzidas a 16
execuções.

## Qual foi a solução

- todo aplicativo instalável ganhou ao menos um menu com rota real;
- Planejamento, Tarefas, Diário e Equipes foram conectados como uma mesa
  operacional;
- Propostas, Contratos, Aditivos e Documentos ganharam ações de criação;
- proposta nasce de orçamento aprovado com PDF e hash; contrato nasce de
  proposta aceita; aditivo preserva o original;
- o runner agora materializa toda combinação persona × aplicativo e executa
  os cenários otimista, normal e pessimista.

## Varredura e ocorrências equivalentes

O catálogo completo de 21 aplicativos operacionais foi cruzado com
`MENUS_DO_MODULO`, com as rotas do Next e com as 16 personas. Assinaturas já
possuía upload funcional e foi apenas mantida visível. Nenhum link fictício foi
adicionado.

## Prevenção automática

- `tests/all-app-workflows.test.ts` reprova aplicativo sem menu e fluxo crítico
  sem ação primária;
- `pnpm validate:menus` reprova destino sem `page.tsx`;
- `tests/operational-routines.test.ts` exige uma rotina para cada combinação
  declarada e três cenários para todos os aplicativos.
- `pnpm test:db:commercial-documents` reconstrói o domínio em PostgreSQL 16 e
  prova PDF com hash, privilégios mínimos, aceite, contrato e aditivo encadeados.

## Limitações da prevenção

Os testes garantem presença, cobertura e rotas reais. Permissões por perfil,
estado vazio, responsividade e conclusão da transação ainda exigem QA
autenticado no navegador e teste PostgreSQL das RPCs.
