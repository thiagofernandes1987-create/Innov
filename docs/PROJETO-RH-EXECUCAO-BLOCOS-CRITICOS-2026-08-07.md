# Projeto RH — Execução dos Blocos Críticos

**Iniciado:** 2026-08-07  
**Checkpoint consolidado:** 2026-08-09  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**PR:** #42  

Este arquivo deixou de ser backlog de implementação e passou a registrar o resultado do loop dos blocos críticos. O estado detalhado está em `PROJETO-RH-EXECUCAO-STATUS-IMPLEMENTACAO.md`.

## 1. Blocos internos concluídos e validados

- `[x]` geração automática de XML eSocial por evento nos caminhos suportados;
- `[x]` assinatura XMLDSig automática RSA-SHA256;
- `[x]` validação dos XMLs gerados contra pacote XSD oficial S-1.3 vigente, baixado no próprio gate;
- `[x]` S-1000/S-1005/S-1010/S-1020;
- `[x]` S-2190/S-2200 CLT padrão/S-2205/S-2206;
- `[x]` S-2230 no caminho suportado;
- `[x]` SST: CAT/ASO/exposição/EPI + S-2210/S-2220/S-2240;
- `[x]` S-2299/S-2399 nos caminhos suportados;
- `[x]` S-1200/S-1210/S-1298/S-1299;
- `[x]` processamento de retorno por evento, protocolo, recibo e ocorrências;
- `[x]` IRRF 2026, deduções legal/simplificada, redução e acumulados;
- `[x]` múltiplos vínculos/bases externas;
- `[x]` 13º especializado;
- `[x]` rescisão especializada e offboarding;
- `[x]` retroativos/complementares por diferença entre execuções;
- `[x]` afastamento → eSocial e integração de efeitos explicitamente parametrizados;
- `[x]` benefícios com adesão, cobrança, folha, fatura de fornecedor, reconciliação, aprovação e pagamento;
- `[x]` jornada/ponto → folha;
- `[x]` férias → folha;
- `[x]` provisões;
- `[x]` contabilização;
- `[x]` pagamentos, conta/PIX, lote, liquidação e evidência;
- `[x]` MIT JSON leiaute 1.0 com regras condicionais oficiais implementadas;
- `[x]` adapter Integra Contador server-only e workflow de validação contratual;
- `[x]` arquivo FGTS Digital de remunerações para fins rescisórios, leiaute 1.2;
- `[x]` documentos RH privados/versionados;
- `[x]` recibo PDF e portal Meu RH;
- `[x]` relatórios/indicadores operacionais;
- `[x]` folha-sombra e reconciliação;
- `[x]` E2E de navegador implementado com seed isolado e verificação persistida;
- `[x]` workflows de homologação externa implementados.

## 2. Evidência automatizada

No checkpoint `89b97e9aeb0aee6a5f4eddb256a3bef1565775e2`:

- `RH Extended Functional #184` — **SUCCESS**;
- `RH Functional #430` — **SUCCESS**;
- `RH eSocial Generation #166` — **SUCCESS**;
- `RH eSocial Results #243` — **SUCCESS**;
- `RH eSocial Parser #201` — **SUCCESS**;
- `RH Government Workspaces #236` — **SUCCESS**;
- `RH Time #218` — **SUCCESS**;
- `Stage 18 Concurrent E2E #385` — **SUCCESS**;
- `Stage 20 File Security E2E #874` — **SUCCESS**.

O gate estendido inclui:

1. download do pacote XSD oficial eSocial S-1.3 vigente;
2. replay de todas as migrations RH em PostgreSQL isolado;
3. regressão de cadastro, admissão, folha, IRRF, MIT, folha-sombra, benefícios e documentos;
4. suítes dedicadas eSocial-results, Government/DCTFWeb-FGTS e ponto;
5. typecheck RH;
6. lint RH;
7. testes unitários/contratuais dos adapters e geradores.

## 3. Pendências que são realmente externas ou condicionais

### 3.1 Produção Restrita eSocial

`EXTERNO` — falta executar o workflow com:

- certificado ICP-Brasil/PFX válido e passphrase;
- certificado/chave usados na assinatura;
- inscrições de empregador/transmissor autorizadas;
- evento de teste coerente.

Só será `VALIDADO EXTERNAMENTE` depois de protocolo/retorno oficial persistido e evidência aceita.

### 3.2 Integra Contador

`EXTERNO` — código e OAuth estão implementados. Falta contrato/chaves reais e confirmação dos serviços/paths habilitados ao contratante. Nenhum endpoint DCTFWeb é inventado pelo sistema.

### 3.3 Banco específico

`CONDICIONAL` — ordens, PIX/dados bancários, lotes e conciliação existem. CNAB/API bancária específica depende do banco/provider efetivamente contratado.

### 3.4 Casos eSocial especializados

`PARCIAL POR DESIGN` — o sistema bloqueia, em vez de fabricar XML incompleto, caminhos especiais ainda não modelados para:

- categorias/grupos especiais de S-2200;
- motivos S-2230 que exigem grupos adicionais;
- causas/grupos especiais de S-2299/S-2399.

Esses casos devem ser adicionados quando houver necessidade operacional concreta e fixture oficial correspondente.

### 3.5 Ambiente e negócio

Ainda exigem execução/evidência real:

- Browser E2E contra homologação HTTPS;
- folha-sombra contra fonte autorizada real;
- rehearsal de restore/cutover/rollback;
- piloto controlado;
- GO/NO_GO de negócio;
- produção.

## 4. Gate de produção

Produção permanece bloqueada até, no mínimo:

1. head candidato com todos os gates RH verdes;
2. XSD oficial vigente verde;
3. Produção Restrita eSocial com protocolo/retorno oficial;
4. Browser E2E transacional executado em homologação;
5. folha-sombra/reconciliação aceita;
6. parâmetros legais/tributários aprovados pelo responsável competente;
7. recuperação/restore ensaiada;
8. piloto concluído;
9. cutover/rollback aprovados;
10. nenhuma divergência crítica aberta.

O PR permanece `draft`; este documento não autoriza merge, piloto ou produção.
