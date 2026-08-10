# Projeto RH — Loop de Correção — Auditoria Final de Cobertura Funcional

**Data:** 7 de agosto de 2026  
**Escopo:** pontos levantados pelo usuário  
**Resultado:** PASS na especificação; implementação/homologação continuam pendentes

## 1. Escala

- `PASS` — existe fluxo funcional explícito com integração e tratamento aplicável;
- `PARTIAL` — citado mas falta elemento obrigatório;
- `FAIL` — não coberto;
- `N/A` — não aplicável com justificativa.

Esta auditoria avalia **completude da especificação**, não software executado.

## 2. Núcleo inicial obrigatório

| Item | Resultado | Evidência na especificação |
|---|---|---|
| Recursos Humanos | PASS | `ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO` §§2–4; M01–M12 |
| Departamento Pessoal | PASS | matriz integrada §§2,5; M03–M11 |
| folha de pagamento | PASS | M09 + Adendo V2 + Anexos A/B/C |
| gestão de empregados | PASS | M01/M02/M04 + matriz §§3–4 |
| admissão | PASS | M03 + matriz §6 + M10 Anexo B §3 |
| contratos de trabalho | PASS | M04 + matriz §7 + M10 Anexo B §3 |
| jornada | PASS | M05 + matriz §8 + M09 Anexo C §10 |
| ponto | PASS | M05 + matriz §8 + M09 Anexo B §§4–5 |
| férias | PASS | M06 + M09 Anexo B §8 + matriz §9 |
| afastamentos | PASS | M06 + M09 Anexo B §12 + M10 Anexo B §5 |
| benefícios | PASS | M07 + M09 Anexo B §15 + matriz §11 |
| medicina e segurança do trabalho | PASS | M08 + matriz §12 + M10 Anexo B §4 |
| desligamento | PASS | M11 + M09 Anexo B §9 + matriz §13 + M10 Anexo B §6 |
| obrigações trabalhistas/previdenciárias | PASS | M10 + Adendo V2 + Anexos A/B/C |
| eSocial | PASS | M10 Anexo A §§2–4 + Anexo B integral |
| DCTFWeb | PASS | M10 Anexo A §§5–7 + Anexo C §§2,4 |
| FGTS Digital | PASS | M10 Anexo A §§8–10 + Anexo C §§2,5–9 |
| gestão de documentos | PASS | matriz §14 + requisitos documentais M03/M04/M06/M08/M11/M13 |
| relatórios gerenciais | PASS | matriz §15 + M09 Anexo B §24 + M12 |
| indicadores de RH | PASS | matriz §16 + M12 |

**Resultado núcleo:** 20 PASS / 0 PARTIAL / 0 FAIL.

## 3. Folha de pagamento — capacidades obrigatórias

| Capacidade | Resultado | Cobertura principal |
|---|---|---|
| cadastro de empresas | PASS | M09 Anexo C §2 |
| estabelecimentos | PASS | M09 Anexo C §3 |
| lotações tributárias | PASS | M09 Anexo C §4 |
| empregados | PASS | M09 Anexo C §5 |
| trabalhadores sem vínculo | PASS | M09 Anexo C §6 |
| cargos | PASS | M09 Anexo C §7 |
| funções | PASS | M09 Anexo C §8 |
| sindicatos | PASS | M09 Anexo C §9 |
| jornadas | PASS | M09 Anexo C §10 |
| salários | PASS | M09 Anexo C §11 |
| rubricas | PASS | M09 Anexo A integral |
| eventos fixos | PASS | M09 Anexo A §5; Anexo B §3 |
| eventos variáveis | PASS | M09 Anexo A §5; Anexo B §4 |
| lançamentos | PASS | M09 Anexo B §4 |
| folha mensal | PASS | M09 Anexo B §5 |
| adiantamento | PASS | M09 Anexo B §6 |
| décimo terceiro | PASS | M09 Anexo B §7 |
| férias | PASS | M09 Anexo B §8 |
| rescisão | PASS | M09 Anexo B §9 |
| folha complementar | PASS | M09 Anexo B §10 |
| diferenças retroativas | PASS | M09 Anexo B §11 |
| afastamentos | PASS | M09 Anexo B §12 |
| pensão alimentícia | PASS | M09 Anexo B §13 |
| empréstimos | PASS | M09 Anexo B §14; Anexo A `9253/9254` |
| benefícios | PASS | M09 Anexo B §15 |
| descontos | PASS | M09 Anexo B §16; Anexo A catálogo |
| encargos | PASS | M09 Anexo B §17 |
| provisões | PASS | M09 Anexo B §18 |
| contabilização | PASS | M09 Anexo B §19 |
| fechamento | PASS | M09 Anexo B §20 |
| reabertura | PASS | M09 Anexo B §21 |
| retificação | PASS | M09 Anexo B §22 |
| recibos | PASS | M09 Anexo B §23 |
| relatórios | PASS | M09 Anexo B §24 |
| arquivos e eventos digitais | PASS | M09 Anexo B §25 + M10 Anexos |

**Resultado Folha:** 35 PASS / 0 PARTIAL / 0 FAIL.

## 4. Estrutura obrigatória da rubrica

| Atributo | Resultado | Cobertura |
|---|---|---|
| nome | PASS | M09 Anexo A §§2,4 |
| descrição | PASS | §§2,4 |
| natureza | PASS | §§2–4 |
| fórmula | PASS | §§2,4,6 |
| base de cálculo | PASS | §§2,4 |
| incidência previdenciária | PASS | códigos oficiais versionados `cod_inc_cp`; §§2–4 |
| incidência de IR | PASS | `cod_inc_irrf`; §§2–4 |
| incidência FGTS | PASS | `cod_inc_fgts`; §§2–4 |
| incidência/tratamento em 13º | PASS | coluna 13º/férias/reflexos + ciclos específicos |
| incidência/tratamento em férias | PASS | idem |
| reflexos | PASS | §§2,4 |
| situações de uso | PASS | catálogo §4 |
| parametrização | PASS | §§2,5–7 |
| vínculo com natureza eSocial | PASS | `esocial_nature_code`, Tabela 03 versionada |
| atualização futura | PASS | §8 |

**Resultado rubrica:** 15 PASS / 0 PARTIAL / 0 FAIL.

## 5. Rubricas relevantes — catálogo inicial

O Anexo A documenta perfis funcionais e mapeamento de natureza oficial para, no mínimo:

- salário base;
- horas extras;
- horas extras de banco;
- DSR/feriado;
- adicional de função;
- insalubridade;
- periculosidade;
- adicional noturno;
- comissões/produção;
- outras verbas salariais;
- férias;
- 1/3 constitucional;
- abono pecuniário;
- 13º;
- 13º complementar;
- adiantamento salarial;
- adiantamento de 13º;
- desconto de adiantamento;
- INSS;
- IRRF;
- pensão;
- vale-transporte;
- plano de saúde;
- eConsignado;
- outros consignados;
- outros descontos;
- saldo de salário rescisório;
- 13º proporcional;
- aviso indenizado;
- férias proporcionais/vencidas;
- indenização compensatória/multa;
- bases CP/FGTS/IRRF/FGTS rescisório;
- depósito de FGTS.

**Resultado catálogo:** PASS.

Observação obrigatória: os perfis de incidência são parâmetros de software e não aconselhamento fiscal individual. Antes da publicação, códigos/incidências devem ser validados contra a regra vigente e a situação concreta.

## 6. Parametrização das rubricas

| Requisito | Resultado |
|---|---|
| código interno | PASS |
| descrição | PASS |
| natureza eSocial | PASS |
| vencimento/desconto | PASS |
| fórmula | PASS |
| prioridade | PASS |
| incidência previdenciária | PASS |
| FGTS | PASS |
| IRRF | PASS |
| sindical quando aplicável | PASS — instrumento/parâmetro versionado no Anexo C §9; não inferido automaticamente |
| integração contábil | PASS |
| início de validade | PASS |
| fim de validade | PASS |
| versão da regra | PASS |
| histórico | PASS |
| responsável | PASS |
| regra separada do código-fonte | PASS — Adendo V2 §§5–6 e Anexo A |

**Resultado parametrização:** 17 PASS / 0 FAIL.

## 7. eSocial — fluxo mínimo de 15 etapas

| Etapa | Resultado | Cobertura |
|---|---|---|
| 1 cadastro/qualificação | PASS | matriz integrada + M10 Anexo A §2.1 |
| 2 validação prévia | PASS | Anexo A §2.2; M10 base §12 |
| 3 geração de eventos | PASS | Anexo A §2.2 + Anexo B |
| 4 assinatura digital | PASS | Anexo A §2.4 |
| 5 transmissão | PASS | Anexo A §§2.2–2.3 |
| 6 protocolo | PASS | Anexo A §2.5 |
| 7 consulta processamento | PASS | Anexo A §§2.2–2.3 |
| 8 recibos | PASS | Anexo A §2.5 |
| 9 rejeições | PASS | Anexo A §2.7 + Anexo B §11 |
| 10 correção | PASS | Anexo A §4 + Anexo B §11 |
| 11 retificação | PASS | Anexo A §4.3 |
| 12 exclusão quando admitida | PASS | Anexo A §4.4 + Anexo B §9 |
| 13 fechamento | PASS | Anexo B §8 S-1299 |
| 14 reabertura | PASS | Anexo A §4.5 + Anexo B §8 S-1298 |
| 15 auditoria | PASS | envelopes/tentativas/recibos/hashes no M10 base e anexos |

**Resultado eSocial 15 etapas:** 15 PASS / 0 FAIL.

## 8. eSocial — diferenciações obrigatórias

| Conceito | Resultado |
|---|---|
| eventos de tabela | PASS |
| não periódicos | PASS |
| periódicos | PASS |
| SST | PASS |
| fechamento | PASS |
| reabertura | PASS |
| retorno do Ambiente Nacional | PASS |
| recibo | PASS |
| protocolo | PASS |
| advertência | PASS |
| erro impeditivo/rejeição | PASS |
| totalizador | PASS |
| produção restrita × produção | PASS |

**Resultado diferenciações:** 13 PASS / 0 FAIL.

## 9. DCTFWeb

| Ponto | Resultado | Cobertura |
|---|---|---|
| eventos de remuneração | PASS | M09 → eSocial → totalizadores |
| fechamento da folha/eSocial | PASS | M09/M10 + S-1299 |
| totalizadores | PASS | M10 Anexo B §10 |
| apuração das contribuições | PASS | M10 Anexo A §§5–7 |
| integração automática eSocial/Reinf → DCTFWeb | PASS | M10 Anexo A §5.2 |
| transmissão da DCTFWeb | PASS | capability oficial/autorizada ou portal assistido; Anexo C |
| constituição/registro de débitos | PASS | M10 Anexo A §5 |
| documentos de arrecadação/DARF | PASS | M10 Anexo A §§5,7 |
| pagamento | PASS | M10 Anexo A §5.2 e reconciliação |
| retificação | PASS | M10 Anexo A §5.3 |
| reabertura | PASS | correção na escrituração de origem |
| conferência folha × obrigação | PASS | M10 Anexo A §7 e §10 |
| sistema não substitui Receita | PASS | M10 Anexo A §5.1; Adendo V2 §4 |

**Resultado DCTFWeb:** 13 PASS / 0 FAIL.

## 10. FGTS Digital

| Ponto | Resultado | Cobertura |
|---|---|---|
| origem eSocial | PASS | M10 Anexo A §8.1 |
| validação das bases | PASS | §§8.2–8.3 |
| conferência por trabalhador | PASS | §8.3 e matriz §10 |
| conferência por estabelecimento | PASS | §8.3 |
| divergências | PASS | §§8.2–8.3 |
| alertas | PASS | observabilidade §11 |
| guias | PASS | §§8–9; Anexo C §5 |
| vencimentos | PASS | guia/obrigação versionada |
| pagamento | PASS | §9 |
| conciliação | PASS | §§8–10 |
| histórico | PASS | estados/versionamento |
| relatório de diferenças | PASS | matriz de reconciliação |
| rescisões | PASS | §8.4 |
| remunerações para fins rescisórios | PASS | §8.4 + arquivo oficial |
| competências anteriores | PASS | §8.5 |
| processos trabalhistas | PASS | §8.6, condicionado à implementação do domínio correspondente |
| não confundir com fluxo antigo | PASS | Anexo C e baseline oficial |
| canal/API honesto | PASS | M10 Anexo C integral |

**Resultado FGTS Digital:** 18 PASS / 0 FAIL.

## 11. Gestão de documentos

Checklist funcional:
- solicitação: PASS;
- upload: PASS;
- MIME/tamanho: PASS;
- antimalware: PASS;
- classificação: PASS;
- conferência: PASS;
- aprovação/rejeição: PASS;
- versionamento: PASS;
- assinatura quando aplicável: PASS;
- vínculo a pessoa/vínculo/caso: PASS;
- validade: PASS;
- acesso autorizado: PASS;
- retenção/legal hold: PASS.

Cobertura: `PROJETO-RH-ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO.md` §14 + arquitetura documental já definida.

## 12. Relatórios e indicadores

### Relatórios gerenciais
PASS para:
- quadro de empregados;
- admissões/desligamentos;
- alterações contratuais;
- absenteísmo;
- férias;
- horas extras/banco;
- custo da folha;
- custo por obra/centro de custo;
- benefícios;
- SST operacional;
- obrigações;
- reconciliação CP/FGTS;
- provisões;
- headcount/FTE.

### Indicadores
PASS para:
- headcount;
- turnover versionado;
- absenteísmo;
- horas extras;
- saldo de férias;
- treinamentos/habilitações;
- incidentes em agregação permitida;
- custo de pessoal;
- custos por obra;
- benefícios;
- prazo de admissão;
- qualidade cadastral;
- percentual de obrigações reconciliadas.

Cobertura: matriz integrada §§15–16 + M12.

## 13. Canais oficiais — auditoria anti-invenção

| Afirmação | Resultado |
|---|---|
| eSocial possui integração WS para sistema próprio | PASS — canal oficial documentado |
| eSocial usa envio + consulta de processamento | PASS |
| DCTFWeb recebe automaticamente apurações após encerramentos bem-sucedidos | PASS |
| serviços DCTFWeb via Integra Contador só são usados se contratados/capability disponível | PASS |
| FGTS Digital é alimentado por remunerações eSocial | PASS |
| API geral do empregador FGTS Digital não será presumida | PASS |
| importação oficial de remunerações rescisórias é modelada quando aplicável | PASS |
| Crédito do Trabalhador possui integração específica separada | PASS |
| portal assistido é tratado como canal distinto de API | PASS |

## 14. Resultado do loop

### Totais de auditoria

- núcleo obrigatório: **20 PASS**;
- capacidades de folha: **35 PASS**;
- atributos de rubrica: **15 PASS**;
- parametrização de rubricas: **17 PASS**;
- eSocial 15 etapas: **15 PASS**;
- diferenciações eSocial: **13 PASS**;
- DCTFWeb: **13 PASS**;
- FGTS Digital: **18 PASS**;
- canais oficiais críticos: **9 PASS**.

**PARTIAL:** 0  
**FAIL:** 0

## 15. Parecer

**PASS — correção integral dos pontos levantados no nível de especificação funcional.**

O projeto agora descreve o núcleo obrigatório como módulos operacionais interligados e aprofunda especialmente Folha, rubricas, eSocial, DCTFWeb e FGTS Digital.

### Limitação honesta

O PASS significa que a documentação agora especifica o comportamento necessário. Não significa:
- código implementado;
- API credenciada/contratada;
- certificado provisionado;
- homologação externa executada;
- cálculo legal validado para uma empresa real;
- produção liberada.

Esses estados pertencem à execução futura e continuarão sujeitos aos gates já definidos.
