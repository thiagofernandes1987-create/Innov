# Laboratório oficial mínimo do Baileys

Este laboratório isola a autenticação antes de qualquer integração com o adapter do Innov.

Referências oficiais utilizadas:

- `https://baileys.wiki/`
- `https://baileys.wiki/authentication/qr-code`

Fluxo reproduzido:

1. `useMultiFileAuthState` em diretório temporário;
2. `makeWASocket({ auth: state })` sem wrapper do Innov;
3. `creds.update` conectado diretamente a `saveCreds`;
4. captura de `connection.update.qr` e renderização manual;
5. reconexão em fechamento diferente de `loggedOut`, incluindo `restartRequired` após o scan;
6. envio de uma única mensagem ao próprio JID após `connection === "open"`;
7. logout, remoção do diretório temporário e evidência sanitizada.

O QR não é gravado no repositório nem nos logs. Ele é criptografado no runner com certificado público efêmero antes de ser publicado como artifact temporário.

Este teste não utiliza número comercial, Meta Cloud, adapter do Innov, IA autônoma ou produção.
