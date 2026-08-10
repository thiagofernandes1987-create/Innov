# Projeto RH — Loop de Correção do Foco Funcional

**Estado:** CONCLUÍDO — 0 `PARTIAL`, 0 `FAIL` na auditoria do escopo levantado  
**Data:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Auditoria final:** `PROJETO-RH-LOOP-CORRECAO-AUDITORIA-FINAL.md`

## 1. Motivo

A revisão do usuário identificou que a documentação acumulou arquitetura, governança e meta-processos em excesso, enquanto o objetivo principal exige módulos de RH/Departamento Pessoal efetivamente operáveis e integrados às interfaces oficiais aplicáveis.

O loop corrigiu esse desvio sem apagar decisões técnicas válidas.

## 2. Regra de encerramento aplicada

Para cada capacidade foi exigida cobertura explícita, conforme aplicável, de:

- ator;
- entrada;
- tela ou ação;
- validação;
- regra de negócio;
- cálculo ou transformação;
- estado;
- saída;
- integração de origem/destino;
- tratamento de erro;
- retificação/reabertura;
- auditoria;
- relatório ou reconciliação;
- referência oficial datada quando depender de obrigação externa.

A auditoria final registrou `PASS` para todos os pontos obrigatórios.

## 3. Entregas corretivas vinculantes

### Folha

- `PROJETO-RH-MODULO-09-ADENDO-V2-FOLHA-FUNCIONAL-INTEGRADA.md`;
- `PROJETO-RH-MODULO-09-ANEXO-A-CATALOGO-FUNCIONAL-DE-RUBRICAS.md`;
- `PROJETO-RH-MODULO-09-ANEXO-B-CICLOS-OPERACIONAIS-DA-FOLHA.md`;
- `PROJETO-RH-MODULO-09-ANEXO-C-CADASTROS-MESTRES-DO-DP-E-FOLHA.md`.

### Obrigações e integrações oficiais

- `PROJETO-RH-MODULO-10-ADENDO-V2-OBRIGACOES-INTEGRADAS.md`;
- `PROJETO-RH-MODULO-10-ANEXO-A-INTEGRACOES-OFICIAIS-ESOCIAL-DCTFWEB-FGTS-DIGITAL.md`;
- `PROJETO-RH-MODULO-10-ANEXO-B-MATRIZ-FUNCIONAL-DE-EVENTOS-ESOCIAL.md`;
- `PROJETO-RH-MODULO-10-ANEXO-C-CANAIS-OFICIAIS-E-LIMITACOES-DE-INTEGRACAO.md`.

### Núcleo integrado

- `PROJETO-RH-ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO.md`;
- `PROJETO-RH-LOOP-CORRECAO-AUDITORIA-FINAL.md`.

## 4. Checklist do núcleo obrigatório

- [x] Recursos Humanos;
- [x] Departamento Pessoal;
- [x] folha de pagamento;
- [x] gestão de empregados;
- [x] admissão;
- [x] contratos de trabalho;
- [x] jornada;
- [x] ponto;
- [x] férias;
- [x] afastamentos;
- [x] benefícios;
- [x] medicina e segurança do trabalho;
- [x] desligamento;
- [x] obrigações trabalhistas e previdenciárias;
- [x] eSocial;
- [x] DCTFWeb;
- [x] FGTS Digital;
- [x] gestão de documentos;
- [x] relatórios gerenciais;
- [x] indicadores de RH.

**Auditoria:** 20 PASS / 0 PARTIAL / 0 FAIL.

## 5. Checklist obrigatório da Folha

- [x] cadastro de empresas;
- [x] estabelecimentos;
- [x] lotações tributárias;
- [x] empregados;
- [x] trabalhadores sem vínculo;
- [x] cargos;
- [x] funções;
- [x] sindicatos;
- [x] jornadas;
- [x] salários;
- [x] rubricas;
- [x] eventos fixos;
- [x] eventos variáveis;
- [x] lançamentos;
- [x] folha mensal;
- [x] adiantamento;
- [x] décimo terceiro;
- [x] férias;
- [x] rescisão;
- [x] folha complementar;
- [x] diferenças retroativas;
- [x] afastamentos;
- [x] pensão alimentícia;
- [x] empréstimos;
- [x] benefícios;
- [x] descontos;
- [x] encargos;
- [x] provisões;
- [x] contabilização;
- [x] fechamento;
- [x] reabertura;
- [x] retificação;
- [x] recibos;
- [x] relatórios;
- [x] arquivos e eventos digitais.

**Auditoria:** 35 PASS / 0 PARTIAL / 0 FAIL.

## 6. Checklist obrigatório da rubrica

- [x] nome;
- [x] descrição;
- [x] natureza;
- [x] fórmula;
- [x] base de cálculo;
- [x] incidência previdenciária parametrizada;
- [x] incidência IRRF parametrizada;
- [x] incidência FGTS parametrizada;
- [x] comportamento em 13º;
- [x] comportamento em férias;
- [x] reflexos;
- [x] uso;
- [x] parametrização;
- [x] vínculo versionado com Tabela 03/natureza do eSocial;
- [x] necessidade de atualização futura.

O catálogo usa códigos oficiais de incidência versionados, e não booleanos rígidos nem regras tributárias fixas no código.

## 7. Checklist de integração eSocial

- [x] cadastro e qualificação;
- [x] validação prévia;
- [x] geração do evento;
- [x] assinatura digital;
- [x] transmissão pelo Web Service oficial aplicável;
- [x] protocolo;
- [x] consulta de processamento;
- [x] recibo;
- [x] rejeições;
- [x] correção na origem canônica;
- [x] retificação;
- [x] exclusão quando admitida;
- [x] fechamento periódico;
- [x] reabertura;
- [x] auditoria integral;
- [x] eventos de tabela;
- [x] eventos não periódicos;
- [x] eventos periódicos;
- [x] totalizadores;
- [x] advertências versus erros impeditivos.

## 8. Checklist DCTFWeb

- [x] remuneração/folha → totalizadores;
- [x] fechamento eSocial/EFD-Reinf → sensibilização automática da DCTFWeb;
- [x] apuração das contribuições;
- [x] declaração em andamento;
- [x] transmissão/assinatura conforme canal oficial vigente/autorizado;
- [x] constituição dos débitos;
- [x] DARF/documentos de arrecadação;
- [x] pagamentos;
- [x] reabertura da escrituração;
- [x] retificação da origem;
- [x] nova DCTFWeb/retificadora;
- [x] reconciliação folha × eSocial × DCTFWeb;
- [x] sistema não tratado como substituto da Receita Federal.

## 9. Checklist FGTS Digital

- [x] base originada do eSocial;
- [x] conferência por trabalhador;
- [x] conferência por estabelecimento;
- [x] divergências;
- [x] alertas;
- [x] guias;
- [x] vencimentos;
- [x] pagamento;
- [x] conciliação;
- [x] histórico;
- [x] relatórios de diferenças;
- [x] rescisões;
- [x] remunerações para fins rescisórios;
- [x] competências anteriores quando aplicável;
- [x] processos trabalhistas quando aplicável ao módulo futuro correspondente;
- [x] fluxo corrente não confundido com SEFIP/GRRF/Conectividade Social;
- [x] canal/API descrito honestamente, sem inventar API geral não documentada.

## 10. Fontes oficiais utilizadas no loop

Foram priorizadas e revalidadas fontes oficiais:

- Portal e documentação técnica do eSocial S-1.3;
- Web Services, produção restrita, XSD, regras e Tabela 03 do eSocial;
- Receita Federal — DCTFWeb e FAQ de integração com eSocial/EFD-Reinf atualizado em 2026;
- SERPRO — Integra Contador quando aplicável;
- MTE — FGTS Digital Manual 1.70 e documentação técnica/importação;
- fontes oficiais específicas do Crédito do Trabalhador quando aplicáveis.

Lei, DOU, ANPD/LGPD, CAIXA e normas SST permanecem fontes obrigatórias quando a implementação concreta depender delas.

## 11. Ciclos executados

### Ciclo 1 — Folha operacional e rubricas

- [x] catálogo funcional detalhado de rubricas;
- [x] todos os processamentos obrigatórios da folha;
- [x] entradas/saídas por módulo;
- [x] M09 corrigido por adendo vinculante e anexos.

### Ciclo 2 — eSocial

- [x] adapter e contratos do Web Service;
- [x] eventos por origem funcional;
- [x] assinatura/protocolo/consulta/recibo;
- [x] retificação/exclusão/reabertura;
- [x] M10 corrigido por adendo vinculante e anexos.

### Ciclo 3 — DCTFWeb e FGTS Digital

- [x] integração automática da DCTFWeb a partir das escriturações encerradas;
- [x] serviços oficiais contratados/capabilities separados;
- [x] FGTS baseado nas remunerações/totalizadores do eSocial;
- [x] guias, pagamentos e reconciliação;
- [x] limitações de API explícitas.

### Ciclo 4 — Núcleo completo

- [x] M01–M12 cruzados contra a lista obrigatória;
- [x] lacunas de sindicatos, lotações, TSV e cadastros mestres aprofundadas;
- [x] matriz de integração entre módulos criada;
- [x] documentos, relatórios e indicadores transformados em fluxos funcionais.

### Ciclo 5 — Auditoria final

- [x] todos os checklists repetidos;
- [x] PASS/FAIL registrado item a item;
- [x] 0 PARTIAL;
- [x] 0 FAIL.

## 12. Resultado

**LOOP CONCLUÍDO PARA O ESCOPO LEVANTADO.**

O encerramento significa que a **especificação funcional** agora cobre integralmente os pontos identificados. Não significa código implementado, integração homologada, incidência tributária validada para uma empresa específica ou produção liberada.
