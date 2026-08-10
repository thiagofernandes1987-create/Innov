# Projeto RH — Módulo 09 — Anexo A — Catálogo Funcional de Rubricas

**Versão:** 0.1.0  
**Estado:** especificação funcional detalhada; implementação pendente  
**Data-base oficial:** 7 de agosto de 2026

## 1. Finalidade

Este anexo torna vinculante o modelo funcional de rubricas da folha. O sistema não terá uma tabela rígida de incidências embutida no código-fonte.

Cada rubrica será composta por uma identidade interna estável e por versões imutáveis com vigência. A versão efetivamente utilizada no cálculo deve ser preservada no resultado.

## 2. Modelo obrigatório da rubrica

Cada versão deverá conter, no mínimo:

- `internal_code` — código interno estável;
- `name`;
- `description`;
- `payroll_type` — vencimento, desconto, informativa, base ou encargo;
- `economic_nature`;
- `esocial_nature_code` e versão da Tabela 03 usada;
- `formula_version_id`;
- `calculation_priority`;
- `calculation_base_contract`;
- `cod_inc_cp` — código oficial parametrizado do eSocial;
- `cod_inc_irrf` — código oficial parametrizado do eSocial;
- `cod_inc_fgts` — código oficial parametrizado do eSocial;
- demais códigos de incidência exigidos pelo leiaute vigente, quando aplicáveis;
- tratamento em folha mensal;
- tratamento em 13º;
- tratamento em férias;
- tratamento em rescisão;
- reflexos em médias/provisões configurados;
- integração contábil;
- regra de rateio;
- vigência inicial e final;
- versão;
- fonte e evidência da configuração;
- responsável pela alteração;
- aprovador;
- histórico de alteração.

Internamente, incidência não será representada apenas por booleanos `incide/não incide`. O sistema guardará os **códigos oficiais de incidência do S-1010 vigentes na versão do leiaute**, porque existem códigos diferentes por tipo de base e situação.

## 3. Regra de interpretação das colunas abaixo

As colunas `CP`, `IRRF` e `FGTS` usam perfis funcionais, não parecer tributário:

- `REMUNERATÓRIA` — normalmente participa da formação da base correspondente, mas o código oficial precisa ser configurado e validado;
- `DEDUÇÃO/DESCONTO` — normalmente reduz líquido ou base específica conforme regra própria;
- `INFORMATIVA/BASE` — não é vencimento líquido; representa base, depósito ou informação;
- `INDENIZATÓRIA/ESPECIAL` — exige parametrização própria por legislação, motivo e versão;
- `CONFIGURÁVEL` — não existe uma única incidência segura para todas as empresas/situações.

Nenhum perfil abaixo autoriza gravar alíquota/incidência definitiva no código. A configuração final deve ser conferida contra o MOS, leiaute/regras S-1.3 vigente, legislação e situação concreta.

## 4. Catálogo inicial de rubricas relevantes

| Código interno sugerido | Nome / natureza eSocial atual de referência | Tipo | Fórmula/base funcional | CP | IRRF | FGTS | 13º / férias / reflexos | Uso e parametrização |
|---|---|---|---|---|---|---|---|---|
| `SAL_BASE` | Salário base — Tabela 03 `1000` | vencimento | salário contratual vigente × proporcionalidade do período | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | compõe bases/reflexos conforme versão | remuneração ordinária; salário, divisor, proporcionalidade e incidências versionados |
| `HE` | Horas extraordinárias — `1003` | vencimento variável | horas válidas × valor-hora × fator da faixa | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | pode gerar médias/DSR/13º/férias conforme regra | vem do ponto; percentuais podem variar por lei/CCT; nunca hard-coded |
| `HE_BANCO_PAGA` | Horas extraordinárias de banco — `1004` | vencimento | saldo elegível × valor-hora × fator aplicável | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | reflexos parametrizados | somente movimentos vencidos/convertidos do banco; origem obrigatória |
| `DSR_VARIAVEIS` | DSR e feriado — `1012` | vencimento | base de variáveis × regra de DSR versionada | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | afeta médias conforme configuração | fórmula depende de calendário e regra aplicável |
| `ADIC_FUNCAO` | Adicional função/cargo confiança — `1201` | vencimento | base definida × percentual/valor | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | reflexos configurados | vinculado à função/posição e vigência |
| `INSALUBRIDADE` | Adicional de insalubridade — `1202` | vencimento | base legal/convencional × percentual vigente | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | reflexos configurados | exige vínculo com condição/decisão aplicável; base e grau versionados |
| `PERICULOSIDADE` | Adicional de periculosidade — `1203` | vencimento | base definida × percentual vigente | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | reflexos configurados | origem SST/condição contratual aprovada; regra versionada |
| `ADIC_NOTURNO` | Adicional noturno — `1205` | vencimento variável | horas noturnas válidas × valor-hora × fator | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | médias/DSR/13º/férias parametrizados | integra ponto; janela noturna, hora reduzida e fator são parâmetros |
| `COMISSAO_PRODUCAO` | Comissões/porcentagens/produção — `1207` | vencimento variável | fatos aprovados × regra de comissão/produção | REMUNERATÓRIA | REMUNERATÓRIA | REMUNERATÓRIA | DSR e médias conforme configuração | deve ter origem rastreável em vendas/produção/medição |
| `OUTRA_VERBA_SALARIAL` | Outras verbas salariais — `1099` | vencimento | fórmula específica | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | configurável | só usar quando natureza mais específica não existir; exige justificativa |
| `FERIAS_REMUNERACAO` | Férias — `1016` | vencimento especial | remuneração de férias conforme concessão aprovada | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | processamento próprio; não confundir com folha mensal | versão da Tabela 03 mudou em 01/01/2026; mapeamento deve guardar vigência |
| `FERIAS_1_3` | Terço constitucional — `1017` | vencimento especial | remuneração elegível ÷ 3 | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | processamento férias | incidências devem usar os códigos S-1010 vigentes; não inferir por nome |
| `FERIAS_ABONO_PEC` | Abono pecuniário — `1023` | vencimento especial | dias convertidos × remuneração/dia + componentes aplicáveis | INDENIZATÓRIA/ESPECIAL | CONFIGURÁVEL | CONFIGURÁVEL | sem reflexo automático | dias elegíveis, fórmula e incidências versionados |
| `13_SALARIO` | 13º salário — `5001` | vencimento especial | remuneração-base anual × avos + médias | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | ciclo `indApuracao=13º`; bases separadas | avos, médias e incidências específicas da apuração de 13º |
| `13_COMPLEMENTAR` | 13º complementar — `5005` | vencimento especial | novo devido − valor já apurado | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | diferença do 13º | sempre referencia processamento original e competências afetadas |
| `ADIANT_SALARIO` | Adiantamento de salário — `5501` | vencimento/antecipação | valor ou percentual aprovado | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | posteriormente compensado | não pode ser tratado como novo salário; gera vínculo com desconto posterior |
| `ADIANT_13` | Adiantamento do 13º — `5504` | vencimento especial | regra de adiantamento × base elegível | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | primeira parcela / antecipação | ciclo próprio e compensação na quitação |
| `DESC_ADIANT` | Desconto de adiantamentos — `9200` | desconto | saldo de adiantamentos a compensar | DEDUÇÃO/DESCONTO | DEDUÇÃO/DESCONTO | DEDUÇÃO/DESCONTO | conforme origem | não altera retroativamente o vencimento adiantado |
| `DESC_INSS` | Contribuição previdenciária — `9201` | desconto | resultado da base previdenciária × tabela/faixas vigentes | DEDUÇÃO/DESCONTO | pode compor deduções de IR conforme código vigente | INFORMATIVA | 13º pode ter apuração própria | faixas/tetos nunca no código; memória deve explicar faixa e acumulados |
| `DESC_IRRF` | IRRF — `9203` | desconto | base IRRF − deduções → tabela vigente | não aplicável como CP | DEDUÇÃO/DESCONTO | não aplicável | mensal/13º/férias possuem tratamento parametrizado | tabela, deduções e método vigentes versionados |
| `PENSAO` | Pensão alimentícia — `9213` | desconto | base definida pela ordem × percentual/valor/limites | DEDUÇÃO/DESCONTO | dedução/base IR conforme código configurado | DEDUÇÃO/DESCONTO | pode alcançar mensal, 13º, férias e PLR conforme ordem | ordem judicial/convencional é fonte; não inferir base automaticamente |
| `DESC_ADIANT_13` | Desconto do adiantamento do 13º — `9214` | desconto | valor antecipado a compensar | DEDUÇÃO/DESCONTO | CONFIGURÁVEL | CONFIGURÁVEL | quitação do 13º | sempre correlacionado ao adiantamento original |
| `DESC_VT` | Desconto de vale-transporte — `9216` | desconto benefício | custo/limite/regra do benefício | DEDUÇÃO/DESCONTO | CONFIGURÁVEL | CONFIGURÁVEL | sem reflexo automático | integrado ao cadastro de benefício e uso elegível |
| `DESC_SAUDE` | Plano coletivo empresarial — `9219` | desconto benefício | titular/dependentes/coparticipação − subsídio | DEDUÇÃO/DESCONTO | tratamento conforme regra vigente | CONFIGURÁVEL | sem reflexo automático | reconciliar fornecedor × benefício × folha; histórico por beneficiário |
| `ECONSIGNADO` | Empréstimos eConsignado — `9253` | desconto | parcela recebida/validada × contrato | DEDUÇÃO/DESCONTO | CONFIGURÁVEL | integração específica | sem reflexo remuneratório | natureza criada para Crédito do Trabalhador; versão e fluxo externo precisam ser atualizados |
| `CONSIGNADO_OUTRO` | Empréstimos consignados — `9254` | desconto | parcela contratual válida | DEDUÇÃO/DESCONTO | CONFIGURÁVEL | CONFIGURÁVEL | sem reflexo | não confundir com `9253`; controlar margem, contrato e repasse |
| `OUTRO_DESCONTO` | Outros descontos — `9299` | desconto | regra específica | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | configurável | uso excepcional; exige origem e justificativa |
| `RESC_SALDO_SAL` | Saldo de salários — `6000` | vencimento rescisório | dias trabalhados × remuneração/dia + variáveis aplicáveis | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | integra rescisão | vem do caso de desligamento e competência final |
| `RESC_13_PROP` | 13º proporcional — `6002` | vencimento rescisório | remuneração elegível × avos rescisórios | CONFIGURÁVEL | CONFIGURÁVEL | CONFIGURÁVEL | 13º rescisório | avos e projeções dependem do motivo/datas |
| `RESC_AVISO_IND` | Aviso prévio indenizado — `6003` | vencimento rescisório | remuneração-base × dias de aviso devidos | INDENIZATÓRIA/ESPECIAL | CONFIGURÁVEL | CONFIGURÁVEL | pode produzir projeções/reflexos específicos | motivo, tempo de serviço e incidências versionados |
| `RESC_FERIAS_PROP` | Férias proporcionais — `6006` | vencimento rescisório | remuneração × avos elegíveis + componentes aplicáveis | INDENIZATÓRIA/ESPECIAL | CONFIGURÁVEL | CONFIGURÁVEL | rescisão | integrar direitos do M06 e motivo do M11 |
| `RESC_FERIAS_VENC` | Férias vencidas — `6007` | vencimento rescisório | direitos vencidos × remuneração aplicável | INDENIZATÓRIA/ESPECIAL | CONFIGURÁVEL | CONFIGURÁVEL | rescisão | não recalcular direito apagando concessões anteriores |
| `RESC_MULTA_FGTS` | Indenização compensatória/multa — `6101` | verba rescisória/informativa | base rescisória reconciliada × regra aplicável | INDENIZATÓRIA/ESPECIAL | CONFIGURÁVEL | integração FGTS | sem reflexo automático | deve reconciliar com FGTS Digital; não assumir cálculo final sem dados oficiais completos |
| `BASE_CP` | Base contribuição previdenciária — `9901` | base | soma algébrica das linhas com códigos CP aplicáveis | INFORMATIVA/BASE | INFORMATIVA | INFORMATIVA | base por apuração | resultado derivado, nunca lançamento manual comum |
| `BASE_FGTS` | Base FGTS — `9902` | base | soma algébrica conforme códigos FGTS | INFORMATIVA/BASE | INFORMATIVA | INFORMATIVA/BASE | mensal/13º conforme apuração | deve reconciliar com S-5003/S-5013 e FGTS Digital |
| `BASE_IRRF` | Base IRRF — `9903` | base | rendimentos tributáveis − deduções autorizadas | INFORMATIVA/BASE | INFORMATIVA/BASE | INFORMATIVA | mensal/13º/férias conforme código | memória deve mostrar itens e deduções |
| `BASE_FGTS_RESC` | Base FGTS rescisório — `9904` | base | componentes rescisórios com incidência aplicável | INFORMATIVA/BASE | INFORMATIVA | INFORMATIVA/BASE | rescisão | usada na reconciliação da indenização/guia rescisória |
| `FGTS_DEPOSITO` | FGTS depósito — `9908` | informativa/encargo | base FGTS × alíquota/regra vigente | INFORMATIVA | INFORMATIVA | INFORMATIVA | por trabalhador/competência | valor deve reconciliar com totalizadores e não ser desconto do empregado |

## 5. Eventos fixos e variáveis

### Evento fixo

É uma instrução recorrente com vigência, por exemplo gratificação fixa, desconto contratual autorizado ou benefício recorrente. Deve conter:

- vínculo;
- rubrica;
- valor/percentual/fórmula;
- início/fim;
- periodicidade;
- condições de suspensão;
- origem documental;
- aprovação.

A cada ciclo, o evento fixo gera uma **entrada da competência**. A entrada gerada fica congelada; editar o evento fixo futuro não altera a entrada histórica.

### Evento variável

Vem de fato da competência: ponto, comissão, produção, coparticipação, empréstimo, ajuste, diferença etc. Deve possuir `source_type`, `source_id`, competência, quantidade/valor e idempotency key.

## 6. Publicação de rubrica

Fluxo obrigatório:

```text
RASCUNHO
→ configurar natureza e incidências
→ configurar fórmula/bases/reflexos
→ mapear contabilidade/eSocial
→ executar testes
→ simular impacto em folha histórica anonimizada/controlada
→ revisão DP/folha
→ revisão fiscal/previdenciária quando necessária
→ aprovação maker-checker
→ agendar vigência
→ publicar
```

Mudança de natureza eSocial, `codIncCP`, `codIncIRRF`, `codIncFGTS`, fórmula, base, reflexo ou conta crítica cria nova versão.

## 7. Validações antes do cálculo

O cálculo oficial deve bloquear:

- rubrica sem versão vigente;
- natureza da Tabela 03 vencida/incompatível;
- código de incidência incompatível com a versão do leiaute;
- rubrica incompatível com categoria do trabalhador segundo regras do eSocial;
- fórmula sem testes aprovados;
- dependência circular;
- base inexistente;
- sobreposição de vigência;
- mapeamento contábil obrigatório ausente;
- alteração não aprovada.

## 8. Atualização futura

O eSocial publica Tabela 03 e regras versionadas. O catálogo oficial deverá ser sincronizado como **referência versionada**, nunca copiado uma vez e abandonado.

Exemplo real da necessidade de versionamento: a natureza `1016 — Férias` possui descrição/validade alterada a partir de 01/01/2026; as naturezas `9253` e `9912` foram disponibilizadas em 2025 para novos tratamentos. Portanto, o sistema deve suportar `valid_from`, `valid_to` e versão da fonte oficial.

## 9. Fontes oficiais da baseline

Consulta em 7 de agosto de 2026:

- eSocial — Documentação Técnica S-1.3, NT 06/2026;
- Anexo I / Tabela 03 — Natureza das Rubricas da Folha de Pagamento;
- Regras do eSocial S-1.3, incluindo compatibilidade de rubrica por categoria;
- notícia oficial sobre naturezas `9253` e `9912`.

Os códigos desta baseline não dispensam nova validação antes de implementação, homologação e produção.
