# Etapa 13 — Qualidade, FVS/FVM e Formulários

**Estado:** implementação em branch  
**Aplicativo:** `qualidade`  
**Modelo:** plug-and-play  
**Operação:** online

## 1. Escopo

A etapa implementa:

```text
biblioteca online
→ upload privado
→ modelo FVS/FVM/formulário/pesquisa
→ versão publicada e imutável
→ distribuição por obra, cliente ou link
→ preenchimento
→ anexos/fotos
→ pontuação e resultado
→ revisão
→ indicadores
```

Não há modo offline nesta etapa. A operação exige conexão para leitura e upload.

## 2. Biblioteca online

Tipos aceitos:

- PDF;
- DOCX;
- XLSX;
- PNG;
- JPEG;
- WebP.

Características:

- bucket privado `quality-documents`;
- máximo de 50 MB;
- SHA-256;
- versão por `logical_id`;
- leitura por URL assinada curta;
- liberação opcional ao cliente;
- vínculo opcional com cliente e obra.

## 3. Formulários dinâmicos

Tipos:

- FVS;
- FVM;
- formulário interno;
- formulário para cliente;
- pesquisa.

Campos:

- texto curto;
- texto longo;
- número;
- data;
- lista;
- escolha única;
- confirmação;
- sim/não;
- nota;
- checklist conforme/não conforme/não se aplica;
- fotografia;
- arquivo.

O schema é armazenado em JSON versionado. Uma versão publicada é congelada; mudanças criam nova versão.

## 4. Modelos iniciais

### FVS padrão

Inclui serviço, local, data, responsável, checklist, observações e foto.

### FVM padrão

Inclui material, fornecedor, nota fiscal, lote, quantidade, data, checklist, decisão, observações e foto.

### Pesquisa de satisfação

Inclui satisfação, NPS, pontos positivos, melhorias e autorização de contato.

Os três modelos são editáveis por nova versão.

## 5. Distribuição

Um modelo publicado pode ser distribuído:

- internamente;
- para cliente autenticado;
- para uma obra;
- por link público com token aleatório de 256 bits.

O banco persiste somente SHA-256 do token. O link pode expirar ou ser revogado e possui limite de respostas.

## 6. Respostas e anexos

- bucket privado `quality-form-attachments`;
- até 20 MB por arquivo;
- foto por câmera ou galeria;
- PDF, DOCX e imagens;
- SHA-256 por anexo;
- resposta inicialmente em rascunho e depois enviada;
- respostas enviadas podem ser aprovadas ou rejeitadas;
- trilha em `quality_form_events`.

## 7. Pontuação

FVS e FVM:

```text
score = itens conformes / itens aplicáveis × 100
```

Se algum item for `NONCONFORMING`, o resultado geral será `NONCONFORMING`.

Pesquisas calculam média dos campos de nota. O schema pode receber regras adicionais em versões futuras.

## 8. Motor Python

O diretório `python/quality_forms` contém:

- dataclasses para definição de formulário;
- modelos FVS e FVM;
- validação;
- cálculo de conformidade;
- renderização HTML A4;
- CLI;
- testes unitários.

Exemplo:

```bash
PYTHONPATH=python python3 -m quality_forms.cli schema.json respostas.json \
  --output relatorio.html \
  --title "FVS de Alvenaria" \
  --code "FVS-ALV-001" \
  --project "Residência Araucária"
```

O HTML pode ser lido online ou convertido para PDF por um worker futuro, sem alterar o modelo.

## 9. Segurança

- autorização por capacidade do módulo `qualidade`;
- RLS nas oito tabelas;
- buckets privados;
- nenhuma leitura pública direta do banco ou Storage;
- links públicos validados server-side pela hash do token;
- negações e perfis do núcleo modular continuam prevalecendo;
- documentos e respostas do cliente são vinculados ao cadastro e à obra.

## 10. Tabelas

- `quality_documents`;
- `quality_form_templates`;
- `quality_form_versions`;
- `quality_form_assignments`;
- `quality_public_links`;
- `quality_form_responses`;
- `quality_form_answers`;
- `quality_form_events`.

## 11. Rotas

### Internas

```text
/app/qualidade
/app/qualidade/documentos
/app/qualidade/formularios
/app/qualidade/formularios/novo
/app/qualidade/formularios/[id]
/app/qualidade/preenchimentos
/app/qualidade/preenchimentos/[id]
/app/qualidade/respostas/[id]
```

### Cliente e público

```text
/cliente/formularios
/cliente/formularios/[id]
/formularios/[token]
```

## 12. Critérios de aceite

- [x] leitura online de documentos autorizados;
- [x] upload privado;
- [x] hash dos arquivos;
- [x] modelos FVS e FVM;
- [x] construtor interno;
- [x] versões imutáveis depois da publicação;
- [x] formulário para cliente autenticado;
- [x] pesquisa por link;
- [x] fotos e anexos;
- [x] aprovação/rejeição;
- [x] modelos Python;
- [x] testes TypeScript e Python;
- [ ] homologação autenticada em dispositivo móvel;
- [ ] antivírus antes da produção;
- [ ] conversão HTML para PDF por worker, caso necessária.
