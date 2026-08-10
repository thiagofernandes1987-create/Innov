# Projeto RH — Anexo — Matriz do Núcleo Funcional Integrado

**Versão:** 0.1.0  
**Estado:** especificação funcional integrada; implementação pendente  
**Data:** 7 de agosto de 2026

## 1. Finalidade

Este documento impede que os módulos sejam tratados apenas como temas. Cada capacidade obrigatória deve ter um fluxo operacional, objetos de origem/destino e integrações explícitas.

## 2. Mapa de aplicativos

```text
Recursos Humanos
├─ Pessoas e empregados
├─ Estrutura organizacional
├─ Documentos
├─ SST e saúde ocupacional
├─ Benefícios
└─ Indicadores / People Analytics

Departamento Pessoal
├─ Admissão
├─ Contratos e alterações
├─ Jornada e ponto
├─ Férias
├─ Afastamentos
├─ Folha
├─ Desligamento
└─ Obrigações digitais
   ├─ eSocial
   ├─ DCTFWeb
   └─ FGTS Digital
```

RH e DP compartilham o mesmo cadastro canônico de pessoa/trabalhador/vínculo; não haverá dois cadastros de empregados.

## 3. Matriz obrigatória

| Capacidade | Entrada canônica | Operação principal | Saída canônica | Integrações obrigatórias |
|---|---|---|---|---|
| Recursos Humanos | pessoa, trabalhador, estrutura | manter dossiê, competências, relações, documentos | perfil de trabalhador e histórico | DP, SST, Benefícios, Analytics |
| Departamento Pessoal | vínculo, contrato, fatos trabalhistas | executar ciclo legal/operacional do vínculo | fatos aprovados de admissão, folha, férias, desligamento | Folha, eSocial, Financeiro |
| Folha de pagamento | contratos + ponto + férias + afastamentos + benefícios + eventos | calcular/aprovar/fechar/pagar/contabilizar | resultados, bases, demonstrativos e projeções digitais | eSocial, DCTFWeb, FGTS Digital, Financeiro, Contabilidade |
| Gestão de empregados | pessoa + worker + vínculo | contratar, mover, alterar, consultar histórico | estado atual + timeline | todos os módulos de DP |
| Admissão | candidato/pessoa + dados + documentos | pré-admitir, validar checklist, aprovar, ativar vínculo | vínculo ativo + fatos eSocial | eSocial, contratos, folha, documentos |
| Contratos | vínculo + proposta/alteração | versionar condições, salário, jornada, função e alocação | versão contratual efetiva | folha, ponto, eSocial |
| Jornada | contrato + calendário + escala | planejar jornada | jornada/escala vigente | ponto, folha |
| Ponto | marcação bruta | tratar/aprovar/apurar/banco | fatos consolidados de horas/faltas/adicionais | folha, gestor, auditoria |
| Férias | vínculo + direito aquisitivo | calcular direito, programar, conceder, pagar e gozar | concessão + fatos de folha | folha, eSocial quando aplicável, documentos |
| Afastamentos | ocorrência/documento | classificar, aprovar, prorrogar, retornar | afastamento vigente/histórico | folha, eSocial, SST, benefícios |
| Benefícios | catálogo + política + adesão | conceder, alterar, suspender, cobrar/coparticipar | movimentos de benefício | folha, fornecedor, Financeiro |
| Medicina/SST | risco/exposição/exame/ASO/EPI | gerir riscos, exames, aptidão, EPI, treinamento e incidentes | condição operacional + eventos SST | eSocial, obras, documentos |
| Desligamento | vínculo + intenção/fundamento | validar proteções, aviso, calcular rescisão, aprovar, desligar | término efetivo + rescisão + offboarding | folha, eSocial, FGTS Digital, Financeiro |
| Obrigações trabalhistas/previdenciárias | fatos aprovados | projetar, transmitir, acompanhar e reconciliar | recibos, totalizadores, débitos/guias | eSocial, DCTFWeb, FGTS Digital |
| eSocial | fatos RH/DP | XML/XSD, assinatura, lote, WS, protocolo, consulta, recibo | eventos aceitos/rejeições/totalizadores | todos os domínios de origem, DCTFWeb, FGTS Digital |
| DCTFWeb | fechamentos/apurações eSocial + Reinf/MIT quando aplicável | acompanhar declaração, transmitir por canal oficial, obter débitos/DARF e reconciliar | declaração/recibo/débitos/pagamentos | eSocial, Fiscal/Contabilidade, Financeiro |
| FGTS Digital | remunerações/totalizadores eSocial | conferir bases, débitos, guias, pagamento e rescisão | guia/pagamento/reconciliação | eSocial, folha, desligamento, Financeiro |
| Gestão de documentos | arquivo + metadados + contexto | receber, versionar, validar, assinar, reter, dar acesso | documento/evidência íntegra | admissão, contratos, férias, SST, desligamento, folha |
| Relatórios gerenciais | fatos canônicos e snapshots | consultar/agregar/filtrar/exportar | relatórios versionados | todos os módulos; sem alterar fonte |
| Indicadores de RH | fatos canônicos + definição de métrica | calcular métrica versionada | observação, tendência, cenário | RH/DP/Financeiro/Obras, com privacidade |

## 4. Recursos Humanos — funcionamento mínimo

### Tela inicial

Deve mostrar:
- empregados ativos;
- admissões em andamento;
- férias/afastamentos próximos;
- exames/treinamentos vencendo;
- documentos pendentes;
- posições/vagas quando houver;
- alertas de qualidade cadastral.

### Dossiê do empregado

Abas/seções:
- pessoa;
- vínculos;
- contrato atual e histórico;
- cargo/função/lotação;
- jornada;
- documentos;
- férias/afastamentos;
- benefícios;
- SST operacional;
- demonstrativos autorizados;
- histórico/timeline.

Dados clínicos detalhados não aparecem no dossiê administrativo.

## 5. Departamento Pessoal — fila de trabalho

O DP precisa de uma tela operacional única com filas:
- admissões com prazo/pendência;
- alterações contratuais a efetivar;
- ponto pendente de fechamento;
- férias a programar/pagar;
- afastamentos a tratar;
- folha por competência;
- desligamentos;
- eventos eSocial rejeitados/pendentes;
- DCTFWeb/FGTS a reconciliar.

Cada item deve informar `quem`, `o quê`, `prazo`, `bloqueio`, `próxima ação`, `responsável` e `estado externo` quando existir.

## 6. Admissão → eSocial → Folha

```text
pré-admissão
→ documentos/qualificação
→ dados pessoais
→ empresa/estabelecimento
→ cargo/função
→ lotação tributária
→ jornada
→ salário/contrato
→ benefícios iniciais
→ validação
→ evento preliminar/admissão conforme estratégia e leiaute
→ transmissão/aceite eSocial
→ ativação do vínculo
→ inclusão na população da primeira folha
```

O sistema deve poder ativar com política explícita para eventos preliminares quando admitido pelo leiaute vigente; não deve mascarar evento obrigatório rejeitado.

## 7. Alteração contratual → Folha/eSocial

```text
solicitação de alteração
→ vigência futura/retroativa
→ aprovação
→ nova versão contratual
→ projeção eSocial quando aplicável
→ impacto em escala/ponto
→ impacto em folha
→ retroatividade se atingir competência passada
```

## 8. Ponto → Folha

Contrato do payload consolidado por vínculo/competência:
- horas normais;
- horas extras por faixa;
- horas noturnas;
- DSR/feriados quando fato consolidado;
- faltas;
- atrasos;
- banco creditado/debitado/pago;
- justificativas;
- versão do fechamento do ponto.

A folha não lê marcação bruta diretamente.

## 9. Férias → Folha

A concessão aprovada entrega:
- período de gozo;
- dias;
- abono quando existente;
- remuneração/base na data aplicável;
- médias calculáveis;
- data de pagamento;
- status de cancelamento/remarcação;
- referência documental.

A folha devolve:
- cálculo;
- demonstrativo/recibo;
- pagamento;
- fatos mensais de compensação;
- divergências.

## 10. Afastamento → Folha/eSocial

Um afastamento deve carregar:
- tipo/motivo interno;
- mapeamento eSocial vigente quando aplicável;
- início/fim;
- origem/documento;
- efeito operacional;
- efeito remuneratório configurado;
- necessidade de evento externo;
- retorno/aptidão quando aplicável.

## 11. Benefício → Folha

Cada movimento de cobrança entregue à folha contém:
- trabalhador/dependente;
- benefício/plano;
- competência;
- custo total;
- subsídio empregador;
- parcela trabalhador;
- coparticipação;
- rubrica sugerida;
- origem do fornecedor;
- idempotency key.

## 12. SST → eSocial

Os fatos operacionais devem poder projetar eventos SST da versão vigente, mantendo segregação clínica. O adapter recebe somente os dados estritamente necessários para o evento.

## 13. Desligamento → Rescisão → eSocial → FGTS

```text
caso de desligamento
→ validações/proteções
→ aviso e datas
→ ponto/benefícios/ativos pendentes
→ cálculo rescisório M09
→ aprovação
→ projeções eSocial
→ aceite
→ bases FGTS rescisórias
→ conferência FGTS Digital
→ guia/pagamento
→ pagamento ao trabalhador
→ contabilização
→ offboarding/acessos/ativos
→ fechamento do caso
```

## 14. Gestão de documentos funcional

Tipos de documento serão vinculados ao contexto, e não jogados em um bucket genérico.

Operações:
- solicitar documento;
- receber upload;
- validar tipo/tamanho/MIME;
- antimalware;
- extrair metadados autorizados;
- classificar;
- conferir;
- aprovar/rejeitar;
- versionar;
- assinar quando aplicável;
- vincular a pessoa/vínculo/caso;
- controlar validade;
- disponibilizar com autorização;
- aplicar retenção/legal hold.

Estados:
```text
REQUESTED
UPLOADED
SCANNING
CLEAN
UNDER_REVIEW
APPROVED
REJECTED
EXPIRED
SUPERSEDED
ON_LEGAL_HOLD
```

## 15. Relatórios gerenciais funcionais

Mínimo:
- quadro de empregados por empresa/estabelecimento/obra;
- admissões/desligamentos;
- movimentações contratuais;
- absenteísmo;
- férias vencendo;
- horas extras e banco;
- custo de folha;
- custo por obra/centro de custo;
- benefícios;
- SST operacional;
- obrigações rejeitadas/atrasadas;
- reconciliação previdenciária/FGTS;
- provisões;
- headcount e FTE.

Cada relatório deve ter definição de população, período, data de atualização e fonte.

## 16. Indicadores de RH

Indicadores iniciais:
- headcount;
- admissões/desligamentos;
- turnover com definição versionada;
- absenteísmo;
- horas extras;
- saldo de férias;
- horas de treinamento;
- habilitações vencendo;
- acidentes/incidentes em agregação permitida;
- custo total de pessoal;
- custo por obra;
- benefícios por população;
- prazo médio de admissão;
- qualidade cadastral;
- percentual de obrigações reconciliadas.

Indicador nunca será calculado de dados clínicos identificáveis para ranking de trabalhador.

## 17. Regra de integração

Nenhum módulo poderá criar cópia canônica de entidade pertencente a outro domínio apenas para facilitar integração.

Exemplos:
- folha referencia vínculo; não cadastra empregado paralelo;
- eSocial referencia rubrica do M09; não mantém rubrica de negócio independente;
- FGTS referencia base/remuneração e totalizadores; não altera salário;
- Analytics lê projeções; não corrige vínculo.
