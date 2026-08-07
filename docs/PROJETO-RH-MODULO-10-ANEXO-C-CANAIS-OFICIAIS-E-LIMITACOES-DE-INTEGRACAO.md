# Projeto RH — Módulo 10 — Anexo C — Canais Oficiais e Limitações de Integração

**Versão:** 0.1.0  
**Estado:** especificação de canais concluída; implementação pendente  
**Baseline:** 7 de agosto de 2026

## 1. Finalidade

Este anexo evita uma premissa incorreta: nem toda obrigação possui uma API pública equivalente e nem todo portal oficial pode ser automatizado por Web Service.

O sistema deve declarar, por capability e versão, o canal realmente suportado:

```text
DIRECT_API
OFFICIAL_WEB_SERVICE
AUTOMATIC_GOVERNMENT_FEED
OFFICIAL_FILE_IMPORT
OFFICIAL_FILE_EXPORT
PORTAL_ASSISTED
MANUAL_EVIDENCE
UNAVAILABLE
```

Uma capability só pode ser marcada como `DIRECT_API` ou `OFFICIAL_WEB_SERVICE` quando existir documentação oficial vigente e contrato/autorização aplicável.

## 2. Matriz de canais

| Sistema / capacidade | Canal confirmado na baseline | Automação prevista |
|---|---|---|
| eSocial — envio de eventos | Web Service oficial | direta pelo adapter eSocial |
| eSocial — consulta de processamento | Web Service oficial | polling/consulta controlada |
| eSocial — produção restrita | Web Service oficial de testes | testes de integração por ambiente |
| eSocial — Web Geral | portal oficial | alternativa operacional, não adapter principal |
| DCTFWeb — receber apurações do eSocial/EFD-Reinf | alimentação automática entre sistemas governamentais | monitorar e reconciliar; não reenviar a mesma apuração para DCTFWeb |
| DCTFWeb — sinais de atualização | Integra Contador, quando contratado e autorizado | consumir eventos de atualização/capabilities disponíveis |
| DCTFWeb — consultas/transmissões disponíveis via serviço contratado | Integra Contador/serviços oficiais conforme oferta vigente | capability-negotiated; não presumir cobertura total |
| DCTFWeb — e-CAC | portal oficial | `PORTAL_ASSISTED` quando operação não tiver API disponível ao contrato |
| FGTS Digital — alimentação da base de remuneração | integração governamental a partir do eSocial | não duplicar envio de folha ao FGTS Digital |
| FGTS Digital — remuneração rescisória complementar/histórica | arquivo oficial de importação quando aplicável | gerar arquivo oficial versionado + validar + importar + reconciliar |
| FGTS Digital — emissão/gestão geral de guia | portal oficial na baseline pública consultada | `PORTAL_ASSISTED`, salvo futura API oficialmente documentada |
| FGTS Digital — pagamento | PIX/canais previstos no documento oficial e processo financeiro | registrar instrução/comprovante/retorno e reconciliar |
| Crédito do Trabalhador | canais/serviços oficiais específicos do programa, quando contratados/disponíveis | adapter separado; não confundir com API geral do FGTS Digital |

## 3. eSocial — adapter direto

O eSocial é a integração direta principal do módulo.

Capabilities mínimas:
- `send_event_batch`;
- `query_batch_processing`;
- `validate_layout_locally`;
- `sign_xml` por serviço seguro;
- `store_protocol`;
- `store_event_receipt`;
- `normalize_occurrences`;
- `correlate_totalizers`.

O adapter não decide regra trabalhista. Ele serializa e transmite fatos já aprovados.

## 4. DCTFWeb — adapter híbrido

A DCTFWeb exige distinguir duas integrações:

### 4.1 Integração sistêmica automática

O fechamento bem-sucedido do eSocial/EFD-Reinf sensibiliza a DCTFWeb automaticamente dentro do ambiente governamental.

Para a Innovar, isso gera um estado:

```text
ESOCIAL_CLOSE_ACCEPTED
→ AWAITING_DCTFWEB_UPDATE
→ DCTFWEB_UPDATE_DETECTED
→ READY_FOR_RECONCILIATION
```

A Innovar não deve transmitir novamente os mesmos fatos como se a DCTFWeb exigisse um segundo payload de folha.

### 4.2 Serviços oficiais contratados

Quando a organização possuir acesso ao Integra Contador ou outro serviço oficial vigente, capabilities poderão incluir:
- eventos de última atualização;
- consulta de dados da declaração;
- serviços de transmissão/assinatura/documentos quando formalmente expostos pelo produto contratado;
- consulta de pagamento por serviços oficiais relacionados.

Cada capability terá:
- `provider`;
- versão;
- ambiente;
- contrato;
- escopo de procuração;
- endpoint lógico;
- autenticação;
- status;
- data da última verificação oficial.

Ausência de capability não será contornada com scraping oculto do e-CAC.

## 5. FGTS Digital — adapter orientado a reconciliação

Na baseline pública consultada, o núcleo do FGTS Digital é descrito como plataforma web alimentada pelas remunerações declaradas no eSocial. Não foi verificada documentação pública de uma API geral do empregador para todas as operações de emissão de guia, consulta e reconciliação.

Portanto, o design correto é:

```text
eSocial remuneração aceita
→ totalizadores FGTS
→ FGTS Digital recebe a base governamentalmente
→ Innovar reconcilia base esperada × totalizador × evidência do FGTS Digital
→ quando necessário gerar guia:
   DIRECT_API somente se existir API oficial futura/contratada
   caso contrário PORTAL_ASSISTED
→ pagamento
→ evidência/consulta
→ conciliação
```

Isso evita afirmar integração inexistente.

## 6. Portal Assisted

`PORTAL_ASSISTED` não significa abandonar controle.

A tela da Innovar deve preparar uma tarefa com:
- sistema oficial;
- contribuinte;
- operação esperada;
- período;
- valores esperados;
- passos de conferência;
- link/navegação oficial configurada;
- responsável;
- prazo;
- evidência a anexar/registrar;
- hash dos dados de origem;
- estado de reconciliação posterior.

Estados:
```text
READY_FOR_OFFICIAL_ACTION
→ IN_PROGRESS_EXTERNAL
→ EVIDENCE_RECORDED
→ RECONCILING
→ RECONCILED
```

A simples marcação manual “feito” não fecha o caso sem evidência/reconciliação quando o risco exigir.

## 7. Arquivo oficial

Quando existir leiaute oficial de importação:

```text
fatos canônicos
→ resolver versão do leiaute
→ gerar arquivo
→ validar estrutura
→ hash
→ aprovação
→ exportar para usuário autorizado
→ importar no sistema oficial
→ registrar comprovante/resultado
→ reconciliar
```

O arquivo gerado fica associado à versão do leiaute e não será editado manualmente depois da aprovação sem gerar nova versão.

## 8. Capability Registry

Tabela lógica proposta:

```text
government_integration_capabilities
- system
- capability_key
- channel_type
- provider
- official_reference
- contract_reference
- environment
- auth_profile
- version
- valid_from
- valid_to
- enabled
- verified_at
- verified_by
```

Exemplos:
```text
ESOCIAL.SEND_BATCH = OFFICIAL_WEB_SERVICE
ESOCIAL.QUERY_BATCH = OFFICIAL_WEB_SERVICE
DCTFWEB.UPDATE_EVENT = DIRECT_API (somente quando Integra Contador contratado)
DCTFWEB.SOURCE_APURATION = AUTOMATIC_GOVERNMENT_FEED
FGTSD.REMUNERATION_SOURCE = AUTOMATIC_GOVERNMENT_FEED
FGTSD.RESCISSION_IMPORT = OFFICIAL_FILE_IMPORT
FGTSD.GENERATE_GUIDE = PORTAL_ASSISTED   # baseline atual, até prova oficial de API aplicável
```

## 9. Regra de evolução

Se amanhã o MTE publicar API geral do FGTS Digital, não será necessário redesenhar o domínio. Será criada nova versão da capability:

```text
FGTSD.GENERATE_GUIDE
v1 = PORTAL_ASSISTED
v2 = DIRECT_API
```

O histórico continuará mostrando qual canal foi usado por cada operação.

## 10. Proibições

- inventar endpoint;
- chamar portal de API;
- automatizar CAPTCHA ou autenticação humana como se fosse integração oficial;
- armazenar senha de portal em tabela de negócio;
- marcar `PAID` sem evidência suficiente;
- supor que protocolo e recibo são a mesma coisa;
- supor que fechamento eSocial transmite DCTFWeb;
- enviar remuneração duplicada diretamente ao FGTS Digital;
- tratar arquivo manual editado como artifact canônico.

## 11. Fontes da baseline

- eSocial — ambiente Web Service, documentação S-1.3 e produção restrita;
- Receita Federal — FAQ de integração eSocial/EFD-Reinf ↔ DCTFWeb atualizado em abril de 2026;
- SERPRO — Integra Contador / Eventos de Última Atualização e gateway de APIs;
- MTE — FGTS Digital Manual 1.70 e documentação de importação rescisória;
- MTE — Crédito do Trabalhador, mantido como integração específica separada.

Todos os canais deverão ser revalidados antes da implementação e a cada alteração relevante de versão/contrato.
