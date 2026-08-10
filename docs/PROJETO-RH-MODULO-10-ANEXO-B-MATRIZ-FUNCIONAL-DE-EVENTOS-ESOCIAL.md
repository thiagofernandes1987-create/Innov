# Projeto RH — Módulo 10 — Anexo B — Matriz Funcional de Eventos eSocial

**Versão:** 0.1.0  
**Estado:** especificação funcional detalhada; implementação pendente  
**Baseline:** eSocial S-1.3 / documentação oficial consultada em 7 de agosto de 2026

## 1. Regra

O catálogo oficial de eventos será versionado. A matriz abaixo é a baseline funcional da versão atual e não substitui o leiaute/XSD/MOS vigentes no momento da implementação.

Cada evento possui:
- `source_context`;
- `source_fact_id`;
- `event_code`;
- `layout_version`;
- `operation`;
- `dependencies`;
- `payload_hash`;
- `approval_state`;
- `external_state`;
- protocolo/recibo;
- vínculo com retificação/exclusão.

## 2. Eventos de tabela

| Evento | Origem | Gatilho funcional | Pré-condições | Correção |
|---|---|---|---|---|
| S-1000 | M02/Configuração do empregador | publicação/alteração de dados do empregador aplicáveis | empresa ativa, classificação e vigência validadas | corrigir cadastro do empregador → nova projeção/retificação conforme regra |
| S-1005 | M02 | estabelecimento/obra/unidade externa criada ou alterada | inscrição e vigência válidas | corrigir estabelecimento/CNO/inscrição na origem |
| S-1010 | M09 | versão de rubrica publicada com impacto externo | natureza e incidências aprovadas, vigência válida | corrigir versão da rubrica; se afetou remunerações já enviadas, retificar remunerações também |
| S-1020 | M02/M09 | lotação tributária publicada/alterada | tipo/código compatíveis com empregador e período | corrigir lotação e impactos nas remunerações |
| S-1070 | contexto de processos | inclusão/alteração de processo aplicável | processo/documento/fundamento aprovados | corrigir processo na fonte e reprocessar dependentes |

## 3. Admissão e cadastro

| Evento | Origem | Gatilho | Dependências | Pós-aceite |
|---|---|---|---|---|
| S-2190 | M03 | estratégia de registro preliminar quando admitida/aplicável | dados mínimos exigidos e prazo | acompanhar complementação pelo evento definitivo |
| S-2200 | M03 | admissão/ingresso aprovado | empregador/estabelecimento; dados do trabalhador; contrato | registrar recibo; liberar vínculo conforme política; incluir em folha |
| S-2205 | M01/M03 | alteração cadastral efetiva | trabalhador previamente conhecido | snapshot cadastral externo atualizado |
| S-2206 | M04 | alteração contratual efetiva | vínculo aceito; versão contratual aprovada | alimentar ponto/folha com nova vigência |

Uma rejeição de S-2200 não será tratada como “erro técnico de integração” se a causa for dado inválido; a pendência retorna ao caso de admissão com campo e mensagem correlacionados.

## 4. SST e saúde ocupacional

| Evento | Origem | Gatilho | Dados permitidos | Correção |
|---|---|---|---|---|
| S-2210 | M08 | CAT aprovada para transmissão | somente dados exigidos pelo leiaute | corrigir caso de acidente/CAT; preservar prontuário segregado |
| S-2220 | M08 | monitoramento/exame ocupacional com informação exigida | dados operacionais necessários; não exportar prontuário inteiro | corrigir exame/registro operacional na fonte |
| S-2221 | M08 | exame toxicológico quando categoria/situação exigir | dados estritamente exigidos | corrigir evento/fato de origem |
| S-2240 | M08 | condição ambiental/exposição efetiva | ambiente, fator, vigência e trabalhador/grupo conforme leiaute | corrigir inventário/exposição; reavaliar períodos afetados |

## 5. Afastamentos

| Evento | Origem | Gatilho | Integrações internas | Correção |
|---|---|---|---|---|
| S-2230 | M06 | afastamento/início/fim/alteração aprovado e aplicável | folha recebe efeito remuneratório; SST/benefícios recebem efeito operacional | corrigir datas/motivo na ocorrência; gerar retificação e recalcular competências afetadas |

O retorno ao trabalho não será inferido apenas da ausência de novo atestado; deve existir estado de retorno no M06.

## 6. Desligamento, reintegração e TSV

| Evento | Origem | Gatilho | Dependências | Efeitos internos |
|---|---|---|---|---|
| S-2298 | M11 | reintegração aprovada | desligamento/vínculo anterior e fundamento | reativar estado conforme caso sem apagar histórico; recalcular impactos |
| S-2299 | M11 + M09 | desligamento efetivo com cálculo/rescisão prontos conforme estratégia | motivo/datas, verbas, vínculo, tabelas aceitas | M10 acompanha aceite; M09/FGTS reconciliam bases; M11 continua offboarding |
| S-2300 | M01/M04 | início de trabalhador sem vínculo quando aplicável | categoria e dados do TSV | habilitar remuneração correspondente |
| S-2306 | M04 | alteração de condição de TSV | TSV aceito | atualizar folha/projeções futuras |
| S-2399 | M11/M09 | término de TSV | cálculo/fatos aplicáveis | encerrar processamento e reconciliar |

## 7. Remuneração e pagamentos

### S-1200

Origem: execução de folha aprovada/fechada internamente, por trabalhador e demonstrativo.

Entrada mínima para a projeção:
- empregador;
- trabalhador/vínculo;
- competência;
- categoria;
- estabelecimento/lotação;
- demonstrativo interno;
- rubricas e versões;
- valores;
- referências a períodos anteriores quando aplicável;
- snapshots de incidências.

Bloqueios internos:
- rubrica S-1010 necessária não aceita/vigente;
- categoria incompatível;
- lotação ausente;
- cálculo não aprovado;
- duplicidade lógica;
- período externo incompatível.

Retorno esperado a reconciliar:
- recibo do evento;
- S-5001;
- S-5003;
- consolidados posteriores.

### Outros eventos de remuneração

O catálogo selecionará o evento de remuneração correto pela categoria/regime e versão do leiaute. O código não deve assumir que todo trabalhador usa S-1200.

### S-1210

Origem: pagamento efetivamente relacionado a demonstrativos/rendimentos.

Não pode ser gerado apenas porque a folha foi calculada. O M09/Financeiro precisa fornecer o fato de pagamento necessário à projeção.

Reconciliação:
- rendimentos pagos;
- datas;
- demonstrativos referenciados;
- IRRF por trabalhador (S-5002);
- consolidados correspondentes.

### S-1280

Origem: informações complementares dos periódicos quando aplicáveis ao empregador/período. Deve possuir owner e fonte explícitos; não será gerado vazio “por precaução”.

## 8. Fechamento e reabertura

### S-1299 — fechamento

Pré-checklist interno:
- folha interna fechada;
- eventos periódicos esperados preparados/transmitidos/aceitos ou justificados segundo regra;
- rejeições impeditivas tratadas;
- tabelas necessárias aceitas;
- integrações e certificado saudáveis;
- responsável aprovou o hash do fechamento.

Estados:
```text
PRE_CLOSE_CHECK
→ READY
→ SENT
→ PROTOCOL_RECEIVED
→ PROCESSING
→ ACCEPTED
→ TOTALIZERS_PENDING
→ RECONCILING
→ RECONCILED
```

O aceite do S-1299 inicia/atualiza a cadeia de DCTFWeb; não significa transmissão da DCTFWeb.

### S-1298 — reabertura

Nasce de um caso de correção aprovado. Após aceite:
- eventos corretivos podem ser processados;
- o período externo fica marcado como reaberto;
- o sistema exige novo fechamento posterior;
- DCTFWeb e reconciliações derivadas entram em estado de atualização/retificação.

## 9. Exclusões

### S-3000

Será projetado somente para eventos/operações admitidos pela versão vigente e respeitando dependências. O evento excluído internamente continua íntegro no histórico.

### S-3500

Aplicável a processos trabalhistas conforme escopo/versão. Fica segregado do S-3000 comum.

## 10. Totalizadores

| Evento | O que a Innovar compara | Principal uso |
|---|---|---|
| S-5001 | bases e contribuição do trabalhador | reconciliação previdenciária individual |
| S-5002 | IRRF calculado/pagamentos | reconciliação fiscal individual |
| S-5003 | base/FGTS do trabalhador | reconciliação FGTS Digital individual |
| S-5011 | totais previdenciários do contribuinte | DCTFWeb/reconciliação consolidada |
| S-5012 | IRRF consolidado | reconciliação fiscal consolidada |
| S-5013 | FGTS consolidado | reconciliação FGTS por contribuinte |
| S-5501/S-5503 quando aplicáveis | tributos/FGTS de processo trabalhista | reconciliação de processos |

Totalizador nunca altera a memória do M09. Divergência abre um caso.

## 11. Tratamento de rejeição por origem

| Classe | Retorna para | Exemplo de ação |
|---|---|---|
| cadastro pessoa | M01/M03 | corrigir dado cadastral e reprojetar |
| contrato | M04 | corrigir versão/vigência e reprojetar |
| estabelecimento/lotação | M02 | corrigir inscrição/mapeamento |
| rubrica/incidência | M09 | publicar/corrigir versão e recalcular impacto |
| remuneração/valor | M09 | corrigir fato/cálculo e gerar retificação |
| afastamento | M06 | corrigir ocorrência/datas |
| SST | M08 | corrigir objeto operacional correspondente |
| desligamento | M11 | corrigir caso/datas/motivo e recalcular |
| transporte/certificado | M10/Platform | retry/consulta/rotação sem alterar fato de negócio |

## 12. Tela de evento

`/app/rh/obrigacoes/eventos/[id]` deve mostrar:
- evento/família/operação;
- fonte interna clicável;
- empregador/trabalhador;
- versão do leiaute;
- dependências;
- validações;
- aprovação;
- lote;
- protocolo;
- processamento;
- recibo;
- ocorrências;
- totalizadores relacionados;
- evento original/retificador/exclusor;
- ação correta na origem.

Nunca oferecer botão genérico “editar XML” para contornar o domínio.
