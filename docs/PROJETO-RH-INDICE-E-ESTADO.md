# Projeto RH — Índice e Estado Consolidado

**Versão do índice:** 0.20.1  
**Atualizado em:** 7 de agosto de 2026  
**Branch:** `feature/projeto-rh-especificacao-funcional`  
**Implementação:** não iniciada  
**Produção:** não liberada  

## 1. Nota de preservação do índice

Este arquivo registra o estado consolidado e, na versão 0.20.1, incorpora a correção de foco funcional executada após a revisão do escopo obrigatório.

A documentação detalhada dos módulos 01–20 permanece nos respectivos arquivos versionados no branch. O adendo corretivo navegável é:

`PROJETO-RH-INDICE-ADENDO-0.20.1-CORRECAO-FUNCIONAL.md`

## 2. Estado consolidado dos módulos

### M01–M08 — Núcleo funcional RH/DP

- M01 — Pessoa, trabalhador, vínculo e cadastro mestre;
- M02 — Empresa, estabelecimento, organização e lotações;
- M03 — Admissão e pré-admissão;
- M04 — Contratos e alterações;
- M05 — Jornadas, ponto e banco de horas;
- M06 — Férias, ausências, afastamentos e retorno;
- M07 — Benefícios, dependentes e descontos;
- M08 — SST, riscos, exames, ASO, EPI, treinamentos e habilitações.

### M09 — Folha de Pagamento

Documento base:
- `PROJETO-RH-MODULO-09-FOLHA-RUBRICAS-CALCULO-E-FECHAMENTO.md`.

Documentos vinculantes adicionados no loop corretivo:
- `PROJETO-RH-MODULO-09-ADENDO-V2-FOLHA-FUNCIONAL-INTEGRADA.md`;
- `PROJETO-RH-MODULO-09-ANEXO-A-CATALOGO-FUNCIONAL-DE-RUBRICAS.md`;
- `PROJETO-RH-MODULO-09-ANEXO-B-CICLOS-OPERACIONAIS-DA-FOLHA.md`;
- `PROJETO-RH-MODULO-09-ANEXO-C-CADASTROS-MESTRES-DO-DP-E-FOLHA.md`.

A especificação funcional da folha agora cobre explicitamente:
- empresas;
- estabelecimentos;
- lotações tributárias;
- empregados e trabalhadores sem vínculo;
- cargos, funções e sindicatos/instrumentos coletivos;
- jornadas e salários versionados;
- rubricas parametrizadas;
- eventos fixos, variáveis e lançamentos;
- folha mensal;
- adiantamento;
- 13º;
- férias;
- rescisão;
- complementar e retroativas;
- afastamentos;
- pensão;
- empréstimos;
- benefícios e descontos;
- encargos;
- provisões;
- contabilização;
- fechamento/reabertura/retificação;
- recibos;
- relatórios;
- eventos digitais.

### M10 — Obrigações Digitais

Documento base:
- `PROJETO-RH-MODULO-10-OBRIGACOES-DIGITAIS-E-RECONCILIACAO.md`.

Documentos vinculantes adicionados no loop corretivo:
- `PROJETO-RH-MODULO-10-ADENDO-V2-OBRIGACOES-INTEGRADAS.md`;
- `PROJETO-RH-MODULO-10-ANEXO-A-INTEGRACOES-OFICIAIS-ESOCIAL-DCTFWEB-FGTS-DIGITAL.md`;
- `PROJETO-RH-MODULO-10-ANEXO-B-MATRIZ-FUNCIONAL-DE-EVENTOS-ESOCIAL.md`;
- `PROJETO-RH-MODULO-10-ANEXO-C-CANAIS-OFICIAIS-E-LIMITACOES-DE-INTEGRACAO.md`.

A especificação diferencia explicitamente:
- eSocial via Web Services oficiais;
- DCTFWeb sensibilizada automaticamente pelas escriturações e integrada por canais oficiais quando disponíveis/contratados;
- FGTS Digital alimentado pelas remunerações do eSocial, com adapter por capability e sem API geral fictícia;
- `DIRECT_API`, `OFFICIAL_WEB_SERVICE`, `AUTOMATIC_GOVERNMENT_FEED`, `OFFICIAL_FILE_IMPORT`, `PORTAL_ASSISTED` e demais tipos de canal.

### M11–M12 — Encerramento e gestão

- M11 — desligamento, rescisão, reintegração e offboarding;
- M12 — relatórios, People Analytics e planejamento da força de trabalho.

### M13–M20 — Arquitetura e governança de implementação

- M13 — arquitetura técnica;
- M14 — backlog, sprints e gates;
- M15 — design físico de dados;
- M16 — contratos, RPCs, eventos e jobs;
- M17 — UX, telas e acessibilidade;
- M18 — testes, segurança e evidências;
- M19 — implantação, cutover e hypercare;
- M20 — governança regulatória e evolução contínua.

Esses módulos não substituem o núcleo funcional; eles governam como o núcleo deverá ser implementado e operado.

## 3. Matriz do núcleo obrigatório

Documento vinculante:
- `PROJETO-RH-ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO.md`.

O núcleo é modelado como:

```text
Pessoa/Trabalhador/Vínculo
→ Admissão/Contrato
→ Jornada/Ponto/Férias/Afastamentos/Benefícios/SST
→ Folha
→ eSocial
→ DCTFWeb + FGTS Digital
→ Financeiro/Contabilidade
→ Relatórios/Indicadores
```

Documentos e evidências acompanham cada caso de domínio; não formam cadastro paralelo sem contexto.

## 4. Rubricas

O catálogo funcional passou a exigir, por versão:
- código interno;
- nome e descrição;
- natureza econômica;
- natureza da Tabela 03 do eSocial;
- fórmula;
- base;
- prioridade;
- códigos de incidência previdenciária, IRRF e FGTS da versão oficial aplicável;
- tratamento em mensal, 13º, férias e rescisão;
- reflexos;
- contabilização;
- vigência;
- fonte;
- responsável;
- aprovador;
- histórico.

Regras tributárias não serão gravadas rigidamente no código-fonte.

## 5. Integrações oficiais

### eSocial

```text
fato canônico aprovado
→ validação
→ XML/XSD
→ assinatura
→ lote
→ Web Service de envio
→ protocolo
→ Web Service de consulta
→ processamento
→ recibo/rejeição
→ totalizadores
→ reconciliação
```

### DCTFWeb

```text
eSocial/EFD-Reinf encerrados
→ sensibilização automática governamental
→ detectar/consultar declaração
→ reconciliar apurações
→ transmissão pelo canal oficial autorizado
→ recibo/débitos/DARF
→ pagamento
→ reconciliação
```

### FGTS Digital

```text
folha
→ remuneração eSocial
→ totalizadores FGTS
→ alimentação governamental do FGTS Digital
→ conferência por trabalhador/estabelecimento
→ guia pelo canal oficial disponível
→ pagamento
→ conciliação
```

Quando não existir API geral oficial documentada, a especificação usa `PORTAL_ASSISTED` ou arquivo oficial versionado em vez de inventar endpoint.

## 6. Loop corretivo

Documentos:
- `PROJETO-RH-LOOP-CORRECAO-FOCO-FUNCIONAL.md`;
- `PROJETO-RH-LOOP-CORRECAO-AUDITORIA-FINAL.md`.

Resultado da auditoria:
- núcleo obrigatório: 20 PASS;
- capacidades de folha: 35 PASS;
- atributos da rubrica: 15 PASS;
- parametrização: 17 PASS;
- eSocial 15 etapas: 15 PASS;
- diferenciações eSocial: 13 PASS;
- DCTFWeb: 13 PASS;
- FGTS Digital: 18 PASS;
- canais oficiais: 9 PASS;
- PARTIAL: 0;
- FAIL: 0.

O resultado é de **completude da especificação**, não de implementação.

## 7. Estado técnico honesto

Não foram implementados pelo Projeto RH:
- migrations ou tabelas;
- páginas ou Server Actions;
- motor de folha;
- catálogo executável de rubricas;
- cálculos reais;
- adapters governamentais;
- certificados;
- transmissões;
- homologação eSocial/DCTFWeb/FGTS;
- implantação em produção.

O PR permanece documental e em rascunho.

A falha de CI previamente observada continua relacionada à numeração preexistente das vacinas e pertence ao Sprint 00/saneamento da base, salvo nova evidência.

## 8. Próximo passo lógico

**Módulo 21 — Matriz Mestre de Rastreabilidade, Revisão Cruzada e Gate de Prontidão da Especificação.**

O M21 deverá usar os anexos V2 como baseline, não as formulações mais genéricas anteriores.

## 9. Controle de versão

| Versão | Data | Alteração |
|---|---|---|
| 0.20.0 | 07/08/2026 | M20 — governança regulatória e evolução contínua |
| 0.20.1 | 07/08/2026 | loop corretivo: folha operacional, rubricas, núcleo integrado e canais oficiais eSocial/DCTFWeb/FGTS Digital |