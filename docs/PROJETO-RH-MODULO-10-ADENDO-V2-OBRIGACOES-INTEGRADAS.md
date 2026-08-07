# Projeto RH — Módulo 10 — Adendo V2 — Obrigações Digitais Integradas

**Estado:** vinculante sobre o M10 0.1.0; implementação pendente  
**Data:** 7 de agosto de 2026

## 1. Motivo

O M10 original define corretamente fatos, projeções, filas, recibos, totalizadores e reconciliação, mas a revisão funcional exige explicitar quais canais oficiais existem e como cada evento nasce dos módulos operacionais.

Este adendo torna vinculantes os anexos detalhados e elimina qualquer leitura de que eSocial, DCTFWeb e FGTS Digital formariam uma API genérica única.

## 2. Documentos vinculantes

1. `PROJETO-RH-MODULO-10-OBRIGACOES-DIGITAIS-E-RECONCILIACAO.md` — base;
2. `PROJETO-RH-MODULO-10-ANEXO-A-INTEGRACOES-OFICIAIS-ESOCIAL-DCTFWEB-FGTS-DIGITAL.md` — fluxos externos completos;
3. `PROJETO-RH-MODULO-10-ANEXO-B-MATRIZ-FUNCIONAL-DE-EVENTOS-ESOCIAL.md` — evento → módulo → gatilho → dependência → correção;
4. `PROJETO-RH-MODULO-10-ANEXO-C-CANAIS-OFICIAIS-E-LIMITACOES-DE-INTEGRACAO.md` — APIs/WS/feed/arquivo/portal por capability;
5. `PROJETO-RH-ANEXO-MATRIZ-DO-NUCLEO-FUNCIONAL-INTEGRADO.md` — integração com o núcleo de RH/DP.

Em conflito, a descrição mais específica e mais recente prevalece, desde que continue compatível com a documentação oficial vigente.

## 3. eSocial

O eSocial deverá possuir adapter de Web Services oficiais com, no mínimo:

```text
fato aprovado
→ aplicabilidade
→ versão do leiaute/XSD
→ XML
→ validação
→ assinatura
→ lote
→ transmissão
→ protocolo
→ consulta de processamento
→ ocorrências
→ recibo
→ totalizadores
→ reconciliação
```

O catálogo diferencia:
- tabelas;
- não periódicos;
- SST;
- periódicos;
- reabertura/fechamento;
- exclusões;
- totalizadores.

Protocolo não é recibo. Erro técnico não é rejeição de negócio. Advertência não é erro impeditivo.

## 4. DCTFWeb

O sistema reconhece que a apuração chega à DCTFWeb automaticamente após o encerramento bem-sucedido das escriturações aplicáveis.

Fluxo:

```text
eSocial/EFD-Reinf encerrados
→ atualização governamental automática da DCTFWeb
→ detectar/consultar declaração
→ reconciliar apurações
→ revisar
→ transmitir a DCTFWeb pelo canal oficial disponível e autorizado
→ recibo
→ débitos/DARF
→ pagamento
→ reconciliação
```

Se a origem de um débito estiver errada no eSocial, a correção ocorre na origem: reabertura, retificação e novo encerramento; a DCTFWeb é sensibilizada pela nova apuração.

O sistema não é substituto da Receita Federal.

## 5. FGTS Digital

O sistema reconhece que a base do FGTS Digital é alimentada pelas remunerações do eSocial.

Fluxo:

```text
folha
→ eSocial remuneração
→ totalizadores FGTS
→ alimentação governamental do FGTS Digital
→ conferência por trabalhador/estabelecimento
→ diferenças
→ correção na origem quando necessária
→ guia pelo canal oficial disponível
→ pagamento
→ conciliação
```

Não será criada uma API geral fictícia do FGTS Digital. Quando uma operação só estiver oficialmente disponível no portal, será tratada como tarefa assistida com evidência e reconciliação. Quando houver arquivo oficial, será gerado no leiaute versionado. Quando houver API/WS oficial específico, poderá existir adapter correspondente.

## 6. Correções

Uma correção externa sempre aponta para o domínio canônico responsável.

Exemplos:
- dado pessoal → M01/M03;
- estabelecimento/lotação → M02;
- contrato → M04;
- afastamento → M06;
- SST → M08;
- rubrica/cálculo → M09;
- desligamento → M11;
- transporte/certificado → M10/Platform.

Não haverá edição livre do payload para “fazer o governo aceitar”.

## 7. Definition of Done da especificação M10

O módulo só é funcionalmente considerado corrigido quando a auditoria do loop confirmar:
- 15 etapas de integração eSocial cobertas;
- famílias/retornos/recibos/protocolos/advertências/erros separados;
- DCTFWeb com fluxo de apuração, transmissão, débito, DARF, correção e reconciliação;
- FGTS Digital com bases, trabalhador, estabelecimento, diferenças, guia, vencimento, pagamento, rescisão, competências anteriores e histórico;
- canais oficiais e limitações explicitados.

Isso não equivale a integração implementada ou homologada.
