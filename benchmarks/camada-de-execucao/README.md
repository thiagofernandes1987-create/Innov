# Benchmark da camada de execução — Node contra Go

Estes arquivos produziram os números da [`ADR-0001`](../../diretrizes/ADR-0001-CAMADA-DE-EXECUCAO.md). Estão versionados porque a §44 do mapa exige evidência, e número de ADR que ninguém consegue reproduzir é opinião com casas decimais.

**Não são código de plataforma.** São instrumentos de medição. Os `.go` aqui não constituem adoção de Go — a decisão sobre isso é o objeto da própria ADR, e enquanto ela não for ratificada não há Go em `apps/` nem portão de Go no CI.

## O que cada um mede

| Arquivo | Micro-problema |
| --- | --- |
| `payload.json` | Envelope real de despacho de WhatsApp, 1.224 bytes. Os dois lados usam o mesmo |
| `cpu2.mjs` / `cpu2.go` | Custo de CPU por job, decomposto em serialização, criptografia e job completo |
| `provider.go` | Provedor falso com latência fixa, para que o cliente seja o que está sob medição |
| `io_client.mjs` / `io_client.go` | Quantos jobs em voo cada runtime sustenta, e a que custo de memória |

O trabalho modelado é o que `app/actions/whatsapp.ts` e `apps/messaging-gateway/src/security.ts` fazem por mensagem: serializar o envelope, SHA-256 do corpo, HMAC-SHA256 da carga canônica, POST ao provedor.

## Como rodar

```bash
cd benchmarks/camada-de-execucao

# 1) CPU por job
node cpu2.mjs
go run cpu2.go

# 2) concorrência e memória — o provedor falso primeiro, em outro terminal
go run provider.go 40          # 40 ms de latência fixa

node io_client.mjs   20000 2048
go run io_client.go  20000 2048
```

## O controle de validade que torna a comparação honesta

`cpu2.mjs` e `cpu2.go` imprimem um `sumidouro` — o primeiro byte do HMAC acumulado por XOR. **Os dois runtimes precisam imprimir o mesmo valor** (213 na etapa de criptografia, 241 no job completo) e o mesmo `bytes_do_corpo` (1.224).

Se divergirem, os dois lados deixaram de fazer o mesmo trabalho e a comparação não vale — que é o defeito silencioso mais comum deste tipo de medição. A primeira versão em Go usava `map[string]any` e custou 19.464 ns/job contra 13.174 ns do Node; com struct tipada, 9.105 ns. **A forma de escrever mudou o resultado 2,14×, mais do que a troca de linguagem.** Comparar o caminho rápido de um contra o caminho lento do outro é como esse tipo de benchmark mente.

## O que os números não dizem

Foram medidos em 4 núcleos compartilhados, com o provedor falso disputando os mesmos núcleos. O teto do Go (27.884 jobs/s) é **piso**, não teto absoluto. O do Node (6.549 jobs/s) é mais confiável como teto, porque ele degradou ao receber mais concorrência em vez de melhorar.

Nenhum dos dois números limita a Innov hoje: a necessidade medida a 100 mil mensagens/dia é de 1,16 job/s de média.
