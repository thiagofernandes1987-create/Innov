# Evidências — Sprint W-14

**Estado:** concluída no escopo sintético  
**Data:** 04 de agosto de 2026

## Checklist

- [x] `whatsapp_content_bindings` reutilizado como referência canônica;
- [x] nenhuma mensagem padrão duplicada nas tabelas de playbook;
- [x] `communication_playbooks` e versões imutáveis;
- [x] fontes canônicas vinculadas por binding;
- [x] schema de variáveis definido e validado;
- [x] variáveis desconhecidas, ausentes ou inválidas bloqueadas;
- [x] snapshot de variáveis, fonte, resultado, versão, binding e SHA-256;
- [x] autonomia classificada;
- [x] conteúdo contratual restrito a `HUMAN_ONLY` e `CANONICAL_ONLY`;
- [x] reescrita contratual livre bloqueada;
- [x] aprovação humana obrigatória para conteúdo sensível e contratual;
- [x] reprodução histórica sem consultar a versão atual;
- [x] nova versão não altera o histórico;
- [x] isolamento multiempresa, RLS forçada e escrita por RPC.

## Evidência executável

Head funcional: `dfb1db5171ef2671a7f3e745006ea57cfae3732e`.

- Messaging Incremental Loop `30934448179`: verde;
- CI `30934452013`: preflight e quality verdes;
- File Security E2E `30934448720`: verde;
- `messaging-canonical-playbooks-boundary-v1`: verde;
- 12 controles PostgreSQL W-14: verdes;
- 49 arquivos de teste e 392 testes TypeScript: verdes;
- lint e typecheck: verdes;
- testes Python: verdes;
- build do gateway e smoke test do container: verdes;
- build Next.js: verde.

## Controles PostgreSQL comprovados

1. binding canônico reutilizado sem duplicação de corpo;
2. versionamento inicial crescente;
3. validação de variáveis;
4. autonomia contratual restrita;
5. aprovação humana obrigatória;
6. execução somente após aprovação;
7. snapshot de versão, binding e SHA;
8. imutabilidade de versão;
9. atualização por nova versão sem alterar histórico;
10. reprodução histórica;
11. isolamento multiempresa;
12. RLS e privilégio mínimo.

## Não executado

Nenhum socket externo, QR, pairing, sessão, conta, número real, envio real, piloto, deploy ou produção foi utilizado. A classificação de autonomia não habilita IA nem envio autônomo. Conteúdo contratual continua sujeito à revisão humana e jurídica aplicável.
