package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// A assinatura das requisições ao gateway de mensageria.
//
// Este arquivo é a **segunda** implementação do mesmo algoritmo — a primeira é
// `apps/messaging-gateway/src/security.ts`. Duas implementações do mesmo
// contrato em linguagens diferentes é uma dívida que a §26 aceita desde que
// seja **provada por fixture compartilhada**, e não por leitura comparada:
// `tests/fixtures/assinatura-gateway.json` é gerado pelo TypeScript e conferido
// pelos dois lados, byte a byte.
//
// A carga canônica é frágil de um jeito específico e vale escrever por quê:
// os cinco campos são unidos por ponto, e três deles (`nonce`, `caminho`,
// `corpo`) podem conter ponto. Isso torna a junção ambígua — `a.b` com nonce
// `a` e método `b` produz a mesma carga que nonce `a.b` com método vazio. Não é
// defeito a corrigir **aqui**: mudar a junção de um lado só quebra o contrato
// com o gateway em produção. Fica registrado, com um caso na fixture que fixa o
// comportamento atual, e a correção — se vier — muda os dois lados no mesmo
// commit.

// Cabeçalhos que o gateway lê. Espelham as constantes do lado TypeScript.
const (
	CabecalhoDeAssinatura = "x-innov-signature"
	CabecalhoDeTimestamp  = "x-innov-timestamp"
	CabecalhoDeNonce      = "x-innov-nonce"
	CabecalhoDeCorrelacao = "x-correlation-id"
	CabecalhoDeCausacao   = "x-causation-id"
)

// CargaCanonica monta o texto que vai para o HMAC.
//
// Equivalente exato de `canonicalSignaturePayload`:
//
//	[timestamp, nonce, method.toUpperCase(), path, sha256Hex(body)].join(".")
//
// `strings.ToUpper` e `toUpperCase()` divergem em alfabetos com casos
// especiais — o turco é o exemplo clássico, com `i` virando `İ`. Aqui o campo é
// um método HTTP, que é ASCII por definição da RFC 9110, então a divergência
// não alcança este uso. Se algum dia este campo deixar de ser ASCII, a fixture
// é o que vai acusar.
func CargaCanonica(timestamp, nonce, metodo, caminho string, corpo []byte) string {
	return strings.Join([]string{
		timestamp,
		nonce,
		strings.ToUpper(metodo),
		caminho,
		SHA256Hex(corpo),
	}, ".")
}

// AssinarRequisicao devolve o HMAC-SHA256 em hexadecimal minúsculo.
//
// Minúsculo não é detalhe estético: `verifyGatewayRequest` recusa o que não
// casa `^[a-f0-9]{64}$` antes de comparar, e uma assinatura correta em
// maiúsculas seria recusada com `INVALID_AUTH` — indistinguível de credencial
// errada para quem está lendo o log.
func AssinarRequisicao(segredo, timestamp, nonce, metodo, caminho string, corpo []byte) string {
	mac := hmac.New(sha256.New, []byte(segredo))
	// Write de hash.Hash nunca devolve erro (documentado em hash.Hash), por isso
	// o retorno é descartado explicitamente em vez de virar ruído de errcheck.
	_, _ = mac.Write([]byte(CargaCanonica(timestamp, nonce, metodo, caminho, corpo)))
	return hex.EncodeToString(mac.Sum(nil))
}

// AssinaturaConfere compara em tempo constante.
//
// `hmac.Equal` é o par de `timingSafeEqual` do lado TypeScript. Comparar com
// `==` vazaria, pelo tempo de resposta, quantos bytes iniciais o atacante
// acertou — que é o suficiente para descobrir a assinatura byte a byte.
func AssinaturaConfere(esperada, recebida string) bool {
	if len(esperada) != len(recebida) {
		return false
	}
	return hmac.Equal([]byte(esperada), []byte(recebida))
}
