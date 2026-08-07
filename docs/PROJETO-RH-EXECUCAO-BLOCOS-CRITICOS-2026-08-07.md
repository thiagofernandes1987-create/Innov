# Projeto RH — Execução dos Blocos Críticos

**Data:** 2026-08-07  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Regra:** `IMPLEMENTADO` significa código/migration/tela/ação existente; `VALIDADO` exige gate executado com sucesso; `EXTERNO` depende de credencial, contrato, serviço oficial ou ambiente fora do repositório.

## Implementado nesta rodada

- `IMPLEMENTADO` geração automática S-1000/S-1005/S-1010/S-1020 a partir de cadastros canônicos;
- `IMPLEMENTADO` assinatura XMLDSig RSA-SHA256 com certificado/chave do servidor;
- `IMPLEMENTADO` geração S-2190/S-2200 CLT padrão;
- `IMPLEMENTADO` versões cadastrais/contratuais + S-2205/S-2206;
- `IMPLEMENTADO` S-2230 início/retorno ligado ao afastamento e condicionado ao S-2200 aceito;
- `IMPLEMENTADO` SST operacional: CAT, ASO/procedimentos, exposição, EPC/EPI e entregas;
- `IMPLEMENTADO` geradores S-2210/S-2220/S-2240 e projeção do retorno para o domínio SST;
- `IMPLEMENTADO` desligamento, cálculo rescisório versionado, aprovação, efetivação e offboarding;
- `IMPLEMENTADO` mapeamento obrigatório das linhas rescisórias para rubricas eSocial;
- `IMPLEMENTADO` geradores S-2299 e S-2399;
- `IMPLEMENTADO` ordens de pagamento da folha e liquidação com referência/evidência;
- `IMPLEMENTADO` geradores S-1200/S-1210/S-1298/S-1299 com precondições de aceite;
- `IMPLEMENTADO` estado externo da competência eSocial separado do fechamento interno da folha;
- `IMPLEMENTADO` IRRF 2026 com tabela progressiva, dedução legal × simplificada, redução 2026 e acumulação;
- `IMPLEMENTADO` contexto de múltiplos vínculos/bases externas para cálculo acumulado;
- `IMPLEMENTADO` 13º especializado com adiantamento, quitação integral e desconto separado do adiantamento;
- `IMPLEMENTADO` retroativos/complementares como comparação entre execuções imutáveis e exportação de diferenças aprovadas;
- `IMPLEMENTADO` correção da integração férias/benefícios → folha para o contrato atual `source_ref`;
- `IMPLEMENTADO` provisões parametrizadas por base/percentual/vigência;
- `IMPLEMENTADO` contabilização por rubrica, lote balanceado e bloqueio de rubrica não mapeada;
- `IMPLEMENTADO` conta bancária/PIX do trabalhador, ordens, lotes e CSV operacional com SHA-256;
- `IMPLEMENTADO` portal do trabalhador com vínculo explícito `auth user ↔ worker`, publicação de recibos e RLS de autosserviço;
- `IMPLEMENTADO` relatórios operacionais agregados de RH/folha/SST/eSocial;
- `IMPLEMENTADO` E2E de navegador manual contra ambiente de homologação com evidências;
- `IMPLEMENTADO` workflow de homologação eSocial em Produção Restrita que exige certificado real, assina, envia, consulta e grava evidência sanitizada.

## Validações já observadas durante a execução

- `VALIDADO` gate de geração/assinatura eSocial ficou verde antes da ampliação SST, cobrindo eventos de tabela, admissão e alterações;
- `VALIDADO` o teste negativo da folha detectou e a correção eliminou contaminação de base;
- `VALIDADO` o IRRF 2026 possui testes determinísticos para pontos de controle implementados;
- `VALIDADO` migrations/base/admissão/folha foram aprovadas em gates RH anteriores desta branch;
- `EM REVALIDAÇÃO` gate ampliado `RH Extended Functional` foi criado para migrations + DB regression + typecheck + lint de todo o RH + suites eSocial após as últimas ampliações.

## Bloqueadores externos que não podem receber status de concluído sem evidência

### Produção Restrita eSocial
`EXTERNO`: requer secrets reais no environment `rh-esocial-restricted`:
- PFX ICP-Brasil válido e passphrase;
- certificado/chave de assinatura;
- inscrição real do empregador/transmissor autorizados no ambiente restrito;
- evento de homologação coerente com esses identificadores.

O workflow deve produzir protocolo/retorno oficial. Sem isso não existe homologação comprovada.

### Integra Contador
`EXTERNO/PENDENTE`: adapter deve ser liberado somente após existência de contratação/credenciais e confirmação das APIs habilitadas ao contratante. Não é tratado como API universal da DCTFWeb.

### MIT JSON
`PENDENTE`: finalizar renderer/validator somente contra o leiaute/schema oficial vigente identificado e versionado. Não serão inventadas propriedades JSON.

### FGTS Digital — arquivo rescisório
`PENDENTE`: renderer deve ser criado contra o leiaute oficial vigente e validado com fixture oficial antes de liberar download/importação.

### Banco específico
`PARCIAL`: a camada comum de ordens/lotes/conciliação está implementada. CNAB/API de banco específico depende do banco/provider contratado. O CSV operacional não é rotulado como CNAB.

## Blocos ainda incompletos

- benefícios: backend/exportação existem; completar experiência operacional integral e reconciliação de fornecedores;
- documentos RH: integrar upload privado, versionamento, assinatura/publicação;
- recibo PDF formal: portal e publicação existem, mas o artefato PDF final ainda deve ser gerado/assinado conforme template aprovado;
- XSD eSocial: adicionar validação automatizada contra o pacote oficial S-1.3 vigente antes da homologação formal;
- S-2200 casos especiais: aprendiz, trabalhador temporário, sucessão/transferência, ingresso por decisão judicial, estrangeiro e demais grupos específicos permanecem bloqueados pelo gerador padrão;
- S-2230 motivos que exigem grupos complementares específicos permanecem bloqueados no gerador simples;
- S-2299/S-2399: causas/grupos especiais devem ser adicionados conforme o leiaute oficial e a situação concreta;
- E2E transacional completo: smoke de navegador existe; ainda faltam jornadas de criação/cálculo/transmissão em tenant sintético isolado;
- piloto e produção: proibidos até gates, homologação externa, reconciliação sombra, rollback/cutover e aceite de negócio.

## Gate de produção

Produção continua proibida enquanto qualquer um dos seguintes estiver ausente:

1. `RH Extended Functional` verde no head candidato;
2. validação XSD oficial dos XMLs liberados;
3. Produção Restrita eSocial com protocolo/retorno oficial e evidência aceita;
4. cálculo sombra/reconciliação da folha com casos reais autorizados;
5. E2E transacional de navegador;
6. restore/recovery aplicável ao conjunto RH;
7. aprovação de regras legais/tributárias parametrizadas;
8. piloto controlado;
9. plano de cutover/rollback e responsáveis;
10. nenhuma divergência crítica aberta.
