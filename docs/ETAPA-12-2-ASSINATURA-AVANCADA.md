# Etapa 12.2 — Assinatura Avançada

**Estado:** implementada na branch e aplicada no Supabase de homologação.  
**Módulo:** `assinaturas`  
**Dependência modular:** `documentos`

## Objetivo

Permitir que a Innovar envie documentos PDF ou DOCX, posicione campos no layout, capture assinatura, rubrica, data, nome completo, confirmação, fotografia e anexos, gere evidências criptográficas e entregue uma cópia ao cliente.

## Fluxo

```text
upload PDF/DOCX
→ SHA-256 do original
→ PDF pronto ou fila DOCX→PDF
→ envelope e signatários
→ links de uso único
→ campos posicionados
→ congelamento do layout
→ preenchimento externo
→ SHA-256 de cada valor/arquivo
→ conclusão dos signatários
→ composição do PDF final
→ artefato de auditoria
→ SHA-256 final
→ cópia no portal ou webhook de e-mail
```

## Formatos

### PDF

- validado com `pdf-lib`;
- quantidade de páginas extraída no servidor;
- original também funciona como representação inicial;
- PDFs criptografados, corrompidos ou ilegíveis são rejeitados.

### DOCX

- original preservado no Storage;
- hash calculado antes da conversão;
- job persistido em `signature_conversion_jobs`;
- conversão real executada por LibreOffice headless;
- PDF convertido recebe outro hash;
- falhas possuem tentativas, erro e próxima execução;
- o editor não é liberado antes do estado `READY`.

## Campos do layout

- `SIGNATURE` — assinatura desenhada;
- `INITIALS` — rubrica desenhada;
- `DATE` — data;
- `FULL_NAME` — nome completo do cliente/signatário;
- `TEXT` — texto livre;
- `CHECKBOX` — aceite/confirmação;
- `PHOTO` — câmera ou galeria;
- `ATTACHMENT` — documento adicional.

Cada campo possui:

- página;
- posição X/Y normalizada;
- largura e altura normalizadas;
- signatário responsável;
- obrigatoriedade;
- ordem;
- rótulo;
- placeholder;
- configurações adicionais.

## Autenticação e tokens

- token aleatório de 256 bits;
- apenas SHA-256 do token persistido;
- token vinculado ao signatário, envelope e hash do PDF renderizado;
- expiração;
- limite de tentativas;
- revogação;
- conclusão definitiva;
- links exibidos ao administrador apenas por dez minutos em cookie HTTP-only;
- nenhum token em texto puro no banco.

## Evidências e hashes

São registrados hashes SHA-256 para:

- documento original;
- PDF convertido/renderizado;
- valor de cada campo;
- assinatura;
- rubrica;
- fotografia;
- documento anexo;
- conjunto de campos do signatário;
- PDF final;
- artefato JSON de auditoria;
- cópia enviada ao cliente.

A trilha inclui evento, signatário, data/hora, hash do documento e hash do payload. Metadados técnicos, como agente do navegador e IP encaminhado, são capturados pelo servidor quando disponíveis.

## Imutabilidade

Depois do congelamento:

- original não muda;
- PDF renderizado não muda;
- quantidade de páginas não muda;
- campos não podem ser editados ou removidos.

Depois da conclusão:

- PDF final não muda;
- hash final não muda;
- artefato de auditoria não muda;
- apenas liberação e entrega da cópia podem ser atualizadas.

## Cópia ao cliente

### Portal

- marca a versão como liberada;
- cliente consulta somente documentos próprios;
- download passa por Route Handler autenticado;
- caminho do Storage não é exposto;
- download gera `document_access_logs`;
- resposta inclui o hash em `x-document-sha256`.

### E-mail

- evento entra em fila persistida;
- worker obtém lock transacional;
- gera URL assinada temporária;
- envia payload para webhook configurado;
- corpo assinado com HMAC SHA-256;
- registra sucesso, falha, tentativas e erro.

## Workers

### Conversão

```bash
pnpm worker:signature-conversion
pnpm worker:signature-conversion -- --continuous
```

O host precisa possuir LibreOffice/`soffice`.

### Entrega

```bash
pnpm worker:signature-delivery
pnpm worker:signature-delivery -- --continuous
```

Variáveis:

```env
SIGNATURE_SOFFICE_BIN=soffice
SIGNATURE_EMAIL_WEBHOOK_URL=
SIGNATURE_EMAIL_WEBHOOK_SECRET=
```

## Banco

Novas entidades:

- `signature_documents`;
- `signature_document_versions`;
- `signature_fields`;
- `signature_field_values`;
- `signature_attachments`;
- `signature_delivery_events`;
- `signature_evidence_records`;
- `signature_access_tokens`;
- `signature_conversion_jobs`.

O módulo reutiliza:

- `signature_envelopes`;
- `signature_signers`;
- `signature_events`;
- bucket privado `signature-artifacts`.

## Segurança

- módulo protegido por `assinaturas.read/update/sign/release_to_client`;
- MFA AAL2 obrigatório para criação do envelope, congelamento e finalização;
- tokens e jobs acessíveis somente por `service_role`;
- preenchimento público passa por Server Action;
- Storage privado;
- RLS para equipe interna e cliente proprietário;
- download autenticado;
- URLs temporárias;
- HMAC no webhook de e-mail;
- módulos e rotas continuam sujeitos ao núcleo plug-and-play.

## Homologação estrutural

Aplicado no projeto Supabase:

- 9 novas tabelas;
- RLS nas 9 tabelas;
- bucket privado atualizado;
- funções de documento, envelope, campos, tokens, conversão, conclusão e entrega;
- políticas do portal ampliadas para documentos avançados.

## Limites e pendências operacionais

- Clicksign, ZapSign e DocuSign continuam dependentes das respectivas credenciais;
- validade jurídica externa depende do provedor contratado e da configuração de autenticação;
- worker LibreOffice precisa ser implantado em ambiente com binário disponível;
- webhook de e-mail precisa ser conectado a um provedor real;
- antivírus de anexos ainda deve ser conectado antes da produção;
- reconhecimento biométrico não faz parte desta etapa.
