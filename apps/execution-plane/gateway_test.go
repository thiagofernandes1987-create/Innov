package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"unicode/utf8"
)

// O lado Go do contrato da §26.
//
// O par deste arquivo é `tests/gateway-assinatura-compartilhada.test.ts`. Os
// dois leem **o mesmo** `tests/fixtures/assinatura-gateway.json`, gerado pela
// implementação TypeScript real, e precisam reproduzir a mesma assinatura byte
// a byte.
//
// O defeito que isto previne não aparece em nenhum dos dois lados isolado: uma
// camada de execução que assina diferente do gateway compila, passa nos testes
// próprios de cada linguagem, e falha só em produção — com 401 e sem pista de
// qual dos dois está errado.

type casoDeAssinatura struct {
	Nome          string `json:"nome"`
	Timestamp     string `json:"timestamp"`
	Nonce         string `json:"nonce"`
	Metodo        string `json:"metodo"`
	Caminho       string `json:"caminho"`
	Corpo         string `json:"corpo"`
	CargaCanonica string `json:"cargaCanonica"`
	Assinatura    string `json:"assinatura"`
}

type fixtureDeAssinatura struct {
	Segredo string             `json:"segredo"`
	Casos   []casoDeAssinatura `json:"casos"`
}

func carregarFixture(t *testing.T) fixtureDeAssinatura {
	t.Helper()
	// O caminho sobe até a raiz do repositório de propósito: a fixture é
	// compartilhada, não pertence a este módulo. Copiá-la para cá criaria duas
	// cópias, e duas cópias é exatamente o que o contrato existe para impedir.
	caminho := filepath.Join("..", "..", "tests", "fixtures", "assinatura-gateway.json")
	bruto, err := os.ReadFile(caminho)
	if err != nil {
		t.Fatalf("fixture compartilhada ausente em %s: %v", caminho, err)
	}
	var fixture fixtureDeAssinatura
	if err := json.Unmarshal(bruto, &fixture); err != nil {
		t.Fatalf("fixture ilegível: %v", err)
	}
	return fixture
}

func TestFixtureCobreOQueCostumaDivergirEntreLinguagens(t *testing.T) {
	fixture := carregarFixture(t)
	if len(fixture.Casos) < 6 {
		t.Fatalf("contrato com %d caso(s): pouco para provar alguma coisa", len(fixture.Casos))
	}

	var temVazio, temAcento, temForaDoBMP, temPontoNoNonce bool
	for _, caso := range fixture.Casos {
		if caso.Corpo == "" {
			temVazio = true
		}
		if strings.ContainsAny(caso.Corpo, "áàãâéíóôúçÁÃÉÍÓÚÇ") {
			temAcento = true
		}
		for _, r := range caso.Corpo {
			if r > 0xffff {
				temForaDoBMP = true
			}
		}
		if strings.Contains(caso.Nonce, ".") {
			temPontoNoNonce = true
		}
	}
	if !temVazio || !temAcento || !temForaDoBMP || !temPontoNoNonce {
		t.Fatalf(
			"contrato incompleto: vazio=%v acento=%v foraDoBMP=%v pontoNoNonce=%v",
			temVazio, temAcento, temForaDoBMP, temPontoNoNonce,
		)
	}
}

func TestAssinaturaEmGoBateComAFixtureDoTypeScript(t *testing.T) {
	fixture := carregarFixture(t)
	for _, caso := range fixture.Casos {
		t.Run(caso.Nome, func(t *testing.T) {
			carga := CargaCanonica(caso.Timestamp, caso.Nonce, caso.Metodo, caso.Caminho, []byte(caso.Corpo))
			if carga != caso.CargaCanonica {
				t.Fatalf("carga canônica divergiu:\n obtida:   %q\n esperada: %q", carga, caso.CargaCanonica)
			}
			assinatura := AssinarRequisicao(fixture.Segredo, caso.Timestamp, caso.Nonce, caso.Metodo, caso.Caminho, []byte(caso.Corpo))
			if assinatura != caso.Assinatura {
				t.Fatalf(
					"assinatura divergiu do TypeScript:\n obtida:   %s\n esperada: %s\n carga:    %q",
					assinatura, caso.Assinatura, carga,
				)
			}
		})
	}
}

func TestAssinaturaTemOFormatoQueOGatewayVerifica(t *testing.T) {
	// `verifyGatewayRequest` recusa o que não casa ^[a-f0-9]{64}$ antes mesmo de
	// comparar. Assinatura em maiúsculas seria recusada com INVALID_AUTH e
	// pareceria credencial errada.
	fixture := carregarFixture(t)
	for _, caso := range fixture.Casos {
		if err := ValidarSHA256(caso.Assinatura); err != nil {
			t.Fatalf("%s: assinatura fora do formato aceito pelo gateway: %v", caso.Nome, err)
		}
	}
}

func TestCorpoNaoEhReinterpretadoComoTexto(t *testing.T) {
	// O corpo é assinado como bytes. Se em algum ponto ele virar string e voltar,
	// byte inválido em UTF-8 é substituído por U+FFFD e a assinatura muda — o
	// gateway recusaria um corpo que ele mesmo aceitaria em outro caminho.
	corpo := []byte{0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xff, 0xfe, 0x22, 0x7d}
	if utf8.Valid(corpo) {
		t.Fatal("o corpo do teste precisa ser UTF-8 inválido para o teste valer")
	}
	direto := AssinarRequisicao("s", "1", "n", "POST", "/x", corpo)
	viaTexto := AssinarRequisicao("s", "1", "n", "POST", "/x", []byte(string(corpo)))
	if direto != viaTexto {
		t.Fatalf("assinatura mudou ao passar por string: %s != %s", direto, viaTexto)
	}
}

func TestMetodoEhNormalizadoParaMaiusculas(t *testing.T) {
	minusculo := AssinarRequisicao("s", "1", "n", "post", "/x", []byte("{}"))
	maiusculo := AssinarRequisicao("s", "1", "n", "POST", "/x", []byte("{}"))
	if minusculo != maiusculo {
		t.Fatal("o TypeScript faz method.toUpperCase(); sem isso, o mesmo pedido assina diferente")
	}
}

func TestSegredoDiferenteProduzAssinaturaDiferente(t *testing.T) {
	// Guarda contra o defeito mais bobo e mais grave: HMAC montado sem usar o
	// segredo. Passaria em todos os casos da fixture se a fixture usasse o mesmo
	// segredo — e é por isso que este teste não lê a fixture.
	a := AssinarRequisicao("segredo-a", "1", "n", "POST", "/x", []byte("{}"))
	b := AssinarRequisicao("segredo-b", "1", "n", "POST", "/x", []byte("{}"))
	if a == b {
		t.Fatal("a assinatura não depende do segredo")
	}
}
