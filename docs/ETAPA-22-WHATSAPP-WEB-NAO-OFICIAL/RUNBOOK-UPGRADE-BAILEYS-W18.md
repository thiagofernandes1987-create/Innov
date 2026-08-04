# Runbook — upgrade controlado do Baileys

1. abrir mudança específica com versão exata, nunca `latest`, `^` ou `~`;
2. revisar release notes, Node requerido, licença e árvore transitiva;
3. atualizar SBOM e notices;
4. executar contract tests do adapter sem rede;
5. executar fixtures de mensagens, receipts, PN, LID, grupos e newsletters;
6. executar lifecycle, store, fencing, ingress, outbox, mídia, IA, plugins e security gates;
7. executar chaos sintético e benchmark comparativo;
8. manter runtime não registrado durante a validação;
9. publicar decisão de compatibilidade e plano de rollback;
10. promover somente após revisão técnica e de segurança.

O upgrade não autoriza conexão, QR, número, piloto ou produção.
