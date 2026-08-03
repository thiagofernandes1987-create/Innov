# Evidências — Sprint W-01

**Sprint:** W-01 — ADR, licença e modelo de risco  
**Estado documental:** concluída  
**Estado operacional:** nenhuma implementação ou sessão autorizada  
**Data:** 03 de agosto de 2026

---

## Checklist e evidências

- [x] **W-01.1 — Criar ADR para adoção do provider não oficial como extensão opcional**  
  Evidência: [`ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md`](./ADR-001-PROVIDER-WHATSAPP-WEB-NAO-OFICIAL.md).

- [x] **W-01.2 — Registrar que o provider oficial e o não oficial compartilham domínio, mas não runtime**  
  Evidência: ADR, decisões D1, D2 e D3.

- [x] **W-01.3 — Criar matriz de licença por projeto, arquivo e técnica potencialmente adaptável**  
  Evidência: [`MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md`](./MATRIZ-LICENCAS-E-REAPROVEITAMENTO.md).

- [x] **W-01.4 — Criar `THIRD_PARTY_NOTICES.md` antes de qualquer adaptação substancial**  
  Evidência: [`../../../THIRD_PARTY_NOTICES.md`](../../../THIRD_PARTY_NOTICES.md). O arquivo registra que nenhum código foi copiado e Baileys ainda não foi instalado.

- [x] **W-01.5 — Definir critérios de número autorizado para homologação**  
  Evidência: [`POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md`](./POLITICA-RISCO-CONSENTIMENTO-E-DESLIGAMENTO.md), seções 3 e 4.

- [x] **W-01.6 — Definir termo interno de aceite de risco operacional**  
  Evidência: política, seção 5. O modelo foi definido, mas nenhum aceite foi assinado.

- [x] **W-01.7 — Definir política de consentimento, opt-out e bloqueio de contato**  
  Evidência: política, seções 6 e 7.

- [x] **W-01.8 — Definir casos proibidos: spam, prospecção indiscriminada, fraude e evasão**  
  Evidência: ADR D5 e política, seção 8.

- [x] **W-01.9 — Definir processo de desligamento e remoção de sessão**  
  Evidência: ADR, seção 9, e política, seção 10.

- [x] **W-01.10 — Registrar critérios que cancelariam o projeto antes da implantação**  
  Evidência: ADR, seção 8, e política, seção 11.

---

## Fontes verificadas

### Repositórios

- Baileys: licença MIT localizada no arquivo `LICENSE`.
- OpenWA: licença MIT localizada no arquivo `LICENSE`.
- wacrm: licença MIT localizada no arquivo `LICENSE`.
- whatsmeow: licença MPL 2.0 localizada no arquivo `LICENSE`.
- Evolution API: Apache 2.0 acompanhada de condições adicionais no arquivo `LICENSE`.
- whatsapp-web.js: Apache 2.0 declarada pelo projeto.
- wechat-bot: conflito entre `LICENSE.md` MIT e `package.json` ISC.
- WhatsControl: licença raiz não localizada.
- Knightbot-MD: README conflitante e arquivo `LICENSE` não localizado.
- lyfe00011/whatsapp-bot: licença não localizada.
- whatsapp-web-reveng: licença MIT localizada.

### Políticas oficiais consultadas em 03/08/2026

- `https://www.whatsapp.com/legal/terms-of-service`
- `https://whatsappbusiness.com/policy/`

Achados incorporados à governança:

- risco de suspensão/desativação;
- proibição de usos automatizados e não autorizados nos Termos;
- exigência de opt-in para comunicação empresarial;
- obrigação de respeitar opt-out e bloqueio;
- vedação de spam, surpresa, engano e comunicação em escala não autorizada;
- necessidade de caminhos claros de atendimento humano em automações permitidas na plataforma empresarial.

---

## Classificação das evidências

| Evidência | Classificação |
|---|---|
| ADR | `DOCUMENTED` |
| Matriz de licença | `DOCUMENTED` e `SOURCE-VERIFIED` para arquivos localizados |
| Ausência de licença | `NEGATIVE-EVIDENCE`, limitada aos caminhos inspecionados |
| Política de risco/consentimento | `DOCUMENTED` |
| THIRD_PARTY_NOTICES | `DOCUMENTED` |
| Aceite de risco assinado | `NOT-EXECUTED` |
| Número de homologação autorizado | `NOT-EXECUTED` |
| Baileys instalado | `NOT-EXECUTED` |
| Revisão jurídica | `EXTERNAL-DEPENDENCY` |
| Produção | `BLOCKED` |

---

## Resultado do Gate W-G01

O gate documental foi satisfeito:

- ADR criada;
- matriz de licença criada;
- aviso preventivo de terceiros criado;
- política de risco, consentimento e desligamento criada;
- casos proibidos e critérios de cancelamento registrados.

A consequência do gate é limitada:

> A arquitetura pode avançar para os contratos canônicos da Sprint W-02. Isso não autoriza instalar Baileys automaticamente, criar sessão real, usar número de produção ou liberar o provider.

---

## Próxima sprint

**W-02 — Modelo canônico de canal, identidade e mensagem**

Primeiro entregável esperado:

- contratos neutros versionados;
- mapeamento do domínio atual da Etapa 22;
- regra automatizada proibindo imports de Baileys fora do futuro adapter;
- compatibilidade retroativa com Meta Cloud API.
