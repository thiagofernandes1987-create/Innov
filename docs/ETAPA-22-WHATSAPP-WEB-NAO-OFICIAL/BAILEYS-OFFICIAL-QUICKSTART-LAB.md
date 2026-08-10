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

## Como se dispara

**Somente `workflow_dispatch`**, e a razão está no fluxo: o pareamento exige uma
pessoa com o celular na mão dentro da janela de validade do QR. Disparado por
`push` ou por evento de PR, não há quem escaneie — o job espera, é morto por
timeout e sai 124. Antes desta correção o laboratório rodava a cada evento de
PR e falhava sempre, com aparência de defeito e sem defeito nenhum.

## O QR, e onde ele não fica

O QR **não é gravado no repositório nem nos logs**. É cifrado no runner com o
certificado de quem vai escanear e publicado como **artifact com retenção de um
dia**, que expira sozinho e não entra no histórico do git.

O certificado vem do segredo **`BAILEYS_LAB_QR_CERT`**, não de arquivo
versionado. A primeira versão deste laboratório commitava um `.pem` com validade
de dois dias, e ele venceu antes de o laboratório rodar uma única vez: validade
em arquivo versionado só se renova por PR, e ninguém abre PR para um relógio. O
segundo motivo é de desenho — quem decifra é quem tem a chave privada, e essa
pessoa é a que vai escanear. O certificado é dela.

Gere o par no seu computador, guarde a chave privada fora do repositório e
registre apenas o certificado no segredo:

```bash
openssl req -x509 -newkey rsa:3072 -nodes -days 90 \
  -keyout qr-lab.key -out qr-lab.crt -subj '/CN=Baileys QR Lab'
# registre o conteúdo de qr-lab.crt em BAILEYS_LAB_QR_CERT
```

Para ler o QR, baixe o artifact e decifre com a sua chave:

```bash
openssl cms -decrypt -inform DER -binary \
  -in baileys-official-quickstart-qr.p7m -inkey qr-lab.key -out qr.png
```

O workflow confere a validade do certificado **antes** de gerar o QR: cifrar com
certificado vencido funciona e só falha na hora de decifrar, com a janela do QR
já perdida. E falha fechado quando o segredo está ausente — publicar o QR em
claro não é alternativa, porque quem o lê primeiro pareia a sessão.

O workflow roda com `contents: read`. A permissão de escrita existia apenas para
o commit do QR, que esta correção removeu.

Este teste não utiliza número comercial, Meta Cloud, adapter do Innov, IA autônoma ou produção.
