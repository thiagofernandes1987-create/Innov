# Etapa 20 — ClamAV gratuito com gateway HTTPS

## Objetivo

Executar o ClamAV sem mensalidade, mantendo a porta TCP `3310` fora da internet e permitindo que a aplicação hospedada na Vercel envie arquivos por HTTPS autenticado.

## Arquitetura

```text
Vercel / Innov
  POST HTTPS + HMAC
          |
          v
Caddy :443 (TLS automático)
          |
          v
Gateway Node :8080 (rede Docker)
          |
          v
ClamAV :3310 (rede Docker interna)
```

Somente as portas `80` e `443` da VM podem ser públicas. As portas `8080` e `3310` não são publicadas pelo Docker Compose.

## Infraestrutura gratuita recomendada

Use uma VM `VM.Standard.A1.Flex` elegível ao Oracle Cloud Always Free com:

- arquitetura ARM64;
- `2 OCPUs`;
- `12 GB` de memória;
- Ubuntu ARM64;
- volume de inicialização dentro da franquia Always Free.

O ClamAV precisa de memória para carregar e atualizar as assinaturas. A configuração de 12 GB deixa margem para ClamAV, gateway, Caddy e sistema operacional.

Limitações conhecidas do Always Free:

- não possui SLA;
- a capacidade da forma A1 pode estar temporariamente indisponível na região;
- a conta pode exigir cartão para validação de identidade;
- não exceda os limites marcados como Always Free.

## DNS

Crie um registro DNS `A` apontando um subdomínio para o IP público da VM:

```text
scanner.seudominio.com.br -> IP_PUBLICO_DA_VM
```

O Caddy obterá e renovará o certificado TLS automaticamente depois que o DNS estiver propagado e as portas `80/443` estiverem abertas.

## Regras de rede da VM

Permitir entrada:

- TCP `22` somente a partir do IP administrativo;
- TCP `80` de qualquer origem;
- TCP `443` de qualquer origem.

Não permitir entrada pública:

- TCP `3310`;
- TCP `8080`.

## Instalação

Na VM:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Encerre e abra novamente a sessão SSH para aplicar o grupo `docker`.

Clone a branch de homologação:

```bash
git clone --branch feature/etapa-20-prontidao-producao \
  https://github.com/thiagofernandes1987-create/Innov.git
cd Innov/deploy/file-security-free
cp env.example .env
```

Gere um segredo forte:

```bash
openssl rand -hex 32
```

Preencha `.env`:

```env
SCANNER_DOMAIN=scanner.seudominio.com.br
SCANNER_SHARED_SECRET=<segredo-de-64-caracteres>
```

Suba os serviços:

```bash
docker compose pull
docker compose up -d --build
```

A primeira inicialização pode levar alguns minutos enquanto o ClamAV prepara e carrega as bases de assinatura.

## Verificação na VM

```bash
docker compose ps
docker compose logs --tail=100 clamav
docker compose logs --tail=100 gateway
docker compose logs --tail=100 caddy
curl --fail https://scanner.seudominio.com.br/health
```

Resposta esperada:

```json
{"status":"healthy","provider":"clamav"}
```

O endpoint `/health` testa apenas a disponibilidade do ClamAV. A liberação de arquivo continua exigindo `POST /v1/scan` com HMAC, timestamp recente e SHA-256 do corpo.

## Configuração da Vercel Preview

No projeto `innov`, ambiente `Preview`, branch `feature/etapa-20-prontidao-producao`:

```env
FILE_SECURITY_PROVIDER=clamav-http
FILE_SECURITY_SCANNER_URL=https://scanner.seudominio.com.br
FILE_SECURITY_SCANNER_SECRET=<mesmo SCANNER_SHARED_SECRET da VM>
FILE_SECURITY_QUARANTINE_BUCKET=file-quarantine
CLAMAV_TIMEOUT_MS=15000
ALLOW_INSECURE_FILE_SCANNER=false
FILE_SECURITY_HEALTH_SECRET=<segredo do health check da aplicação>
```

Não cadastre `CLAMAV_HOST` na Vercel quando o provider for `clamav-http`.

Depois de alterar variáveis, faça um novo deployment Preview. Variáveis da Vercel não são aplicadas retroativamente a deployments anteriores.

## GitHub Environment `homologation`

```env
HOMOLOGATION_APP_URL=https://innov-git-feature-etapa-20-prontidao-producao-apex-method.vercel.app
FILE_SECURITY_HEALTH_SECRET=<mesmo valor da Vercel>
VERCEL_AUTOMATION_BYPASS_SECRET=<bypass de automação da Vercel>
```

O segredo do scanner não precisa ser armazenado no GitHub Actions de homologação. O workflow consulta a aplicação, e a aplicação consulta o gateway.

## Protocolo de segurança

A aplicação envia:

```text
X-Innov-Timestamp
X-Innov-Content-SHA256
X-Innov-Signature
```

Payload assinado:

```text
<timestamp>\nPOST\n/v1/scan\n<sha256-do-arquivo>
```

O gateway:

1. limita o corpo a 25 MB;
2. recalcula o SHA-256;
3. valida timestamp com janela máxima de cinco minutos;
4. compara HMAC com `timingSafeEqual`;
5. envia o arquivo ao ClamAV por `INSTREAM` na rede interna;
6. retorna `CLEAN`, `BLOCKED` ou erro fail-closed.

## Testes obrigatórios

Antes de ativar uploads reais:

```bash
pnpm test
pnpm validate:stage20
```

O workflow `Stage 20 File Security Gateway E2E` deve aprovar:

- fixture PDF limpa;
- assinatura HMAC inválida rejeitada com `401`;
- EICAR bloqueado com `422`;
- evidência JSON preservada como artefato.

Depois da VM configurada, o workflow de health da aplicação deve retornar:

```json
{
  "status":"healthy",
  "provider":"clamav-http",
  "fixtureResult":"CLEAN"
}
```

## Atualizações e operação

Atualizar imagens:

```bash
cd Innov/deploy/file-security-free
git pull
docker compose pull
docker compose up -d --build
```

Inspecionar consumo:

```bash
docker stats
```

Backup mínimo:

- volume `clamav_db` pode ser recriado, pois contém somente bases públicas de assinatura;
- preserve o `.env` em cofre seguro, nunca no Git;
- preserve os volumes do Caddy para evitar emissões de certificado desnecessárias.

## Rotação do segredo

1. gere um novo segredo;
2. altere `SCANNER_SHARED_SECRET` na VM;
3. reinicie o gateway;
4. altere `FILE_SECURITY_SCANNER_SECRET` na Vercel;
5. gere novo deployment Preview;
6. execute o health check assinado.

Durante a rotação haverá uma janela curta em que as assinaturas antigas serão recusadas; uploads permanecem fail-closed.

## Critérios de aceite

- custo mensal da VM dentro do Always Free: zero;
- HTTPS válido;
- porta `3310` não publicada;
- gateway recusa requisição sem HMAC;
- arquivo limpo retorna `CLEAN`;
- EICAR retorna `BLOCKED`;
- aplicação retorna health `200 healthy`;
- migration e produção continuam inalteradas até homologação completa.
