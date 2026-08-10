package main

import (
	"errors"
	"strings"
	"testing"
)

func TestValidarLimiteCobreExatamenteAFaixaDoBanco(t *testing.T) {
	// `claim_ordered_channel_outbox_events` levanta INVALID_CLAIM_LIMIT fora de
	// 1..100. A faixa está escrita aqui para reprovar antes da viagem ao banco;
	// as bordas entram no teste porque erro de borda é o que passa despercebido.
	for _, valido := range []int{1, 2, 99, 100} {
		if err := ValidarLimite(valido); err != nil {
			t.Fatalf("limite %d é aceito pelo banco e foi recusado: %v", valido, err)
		}
	}
	for _, invalido := range []int{-1, 0, 101, 1000} {
		if err := ValidarLimite(invalido); err == nil {
			t.Fatalf("limite %d é recusado pelo banco e passou aqui", invalido)
		}
	}
}

func TestValidarSHA256ExigeOMesmoFormatoDoBanco(t *testing.T) {
	// `begin_channel_delivery_attempt` levanta INVALID_PAYLOAD_SHA256 quando o
	// texto não casa ^[0-9a-f]{64}$ — minúsculas, exatamente 64.
	valido := strings.Repeat("a1b2c3d4", 8)
	if err := ValidarSHA256(valido); err != nil {
		t.Fatalf("SHA válido recusado: %v", err)
	}
	invalidos := map[string]string{
		"curto":      strings.Repeat("ab", 31),
		"longo":      strings.Repeat("ab", 33),
		"maiúsculas": strings.ToUpper(valido),
		"não hexa":   strings.Repeat("z", 64),
		"vazio":      "",
		"com espaço": " " + strings.Repeat("ab", 32)[1:],
	}
	for nome, invalido := range invalidos {
		if err := ValidarSHA256(invalido); err == nil {
			t.Fatalf("SHA %s passou: o banco levantaria INVALID_PAYLOAD_SHA256", nome)
		}
	}
}

func TestFalhaValidarCobreAFaixaDeBackoffDoBanco(t *testing.T) {
	// `fail_channel_delivery_attempt` levanta INVALID_BACKOFF fora de 0..3600.
	for _, segundos := range []int{0, 1, 3599, 3600} {
		f := Falha{Classe: "PROVIDER_UNAVAILABLE", Retentavel: true, BackoffSegundos: segundos}
		if segundos == 0 {
			f.Retentavel = false
		}
		if err := f.Validar(); err != nil {
			t.Fatalf("backoff %d é aceito pelo banco e foi recusado: %v", segundos, err)
		}
	}
	for _, segundos := range []int{-1, 3601, 86400} {
		f := Falha{Classe: "PROVIDER_UNAVAILABLE", Retentavel: true, BackoffSegundos: segundos}
		if err := f.Validar(); err == nil {
			t.Fatalf("backoff %d passou: o banco levantaria INVALID_BACKOFF", segundos)
		}
	}
}

func TestFalhaExigeClasse(t *testing.T) {
	// A classe alimenta `last_error_code` do comando e `last_failure_class` do
	// circuito. Vazia, o circuito abre sem dizer por quê — que é o estado que
	// mais custa a diagnosticar depois.
	f := Falha{Classe: "  ", Retentavel: false}
	if err := f.Validar(); err == nil {
		t.Fatal("falha sem classe passou")
	}
}

func TestFalhaNaoRetentavelNaoAgendaProximaTentativa(t *testing.T) {
	// O banco calcula next_attempt_at só quando should_retry; backoff em falha
	// terminal é número que ninguém lê, e número que ninguém lê mente.
	f := Falha{Classe: "INVALID_PAYLOAD", Retentavel: false, BackoffSegundos: 30}
	if err := f.Validar(); err == nil {
		t.Fatal("falha terminal com backoff passou")
	}
}

func TestClassificarFalhaSeparaOQueEhDoProvedorEOQueEhDoPayload(t *testing.T) {
	casos := []struct {
		nome       string
		erro       error
		retentavel bool
	}{
		{"500 interno", &ErroDoProvedor{Status: 500, Codigo: "internal"}, true},
		{"503 indisponível", &ErroDoProvedor{Status: 503, Codigo: "unavailable"}, true},
		{"429 vazão", &ErroDoProvedor{Status: 429, Codigo: "rate_limited"}, true},
		{"408 tempo esgotado", &ErroDoProvedor{Status: 408, Codigo: "timeout"}, true},
		{"400 payload", &ErroDoProvedor{Status: 400, Codigo: "bad_request"}, false},
		{"401 credencial", &ErroDoProvedor{Status: 401, Codigo: "unauthorized"}, false},
		{"404 destino", &ErroDoProvedor{Status: 404, Codigo: "not_found"}, false},
		{"rede", errors.New("EOF"), true},
	}
	for _, caso := range casos {
		falha := ClassificarFalha(caso.erro)
		if falha.Retentavel != caso.retentavel {
			t.Fatalf("%s: retentável=%v, esperado %v", caso.nome, falha.Retentavel, caso.retentavel)
		}
		if err := falha.Validar(); err != nil {
			t.Fatalf("%s: falha classificada viola o contrato do banco: %v", caso.nome, err)
		}
	}
}

func TestClassificarFalhaNaoVazaOTextoDoProvedor(t *testing.T) {
	// VACINA — mensagem do provedor não vai crua para campo persistido. O banco
	// corta em 500, mas cortar não é sanear: o motivo é nosso, o código é dele.
	falha := ClassificarFalha(&ErroDoProvedor{
		Status: 400,
		Codigo: "invalid_recipient",
		Motivo: "token=EAAG-secreto-do-cliente vazando no corpo do erro",
	})
	if strings.Contains(falha.Motivo, "EAAG-secreto-do-cliente") {
		t.Fatalf("motivo carrega texto cru do provedor: %q", falha.Motivo)
	}
	if falha.CodigoDoProvedor != "invalid_recipient" {
		t.Fatalf("o código do provedor é o que identifica a causa e sumiu: %+v", falha)
	}
}

func TestSHA256DoPayloadBateComOOraculoExterno(t *testing.T) {
	// Oráculo calculado fora do Go, com `hashlib.sha256` do Python, sobre os
	// mesmos bytes. Comparar SHA256Hex com ele mesmo não provaria nada — provaria
	// que a função é determinística, que toda função pura é. O que precisa ser
	// verdade é outra coisa: que este SHA é o **mesmo** que o TypeScript e o
	// Postgres calculariam, senão a tentativa aponta para um corpo que ninguém
	// mais reconhece. A Tarefa 3 estende essa igualdade à assinatura inteira.
	const esperado = "3883720899a3e4f084e237d1c9a48f06e8405c7f5d61b58f5450c808fde7d2d4"
	obtido := SHA256Hex([]byte(`{"texto":"olá"}`))
	if obtido != esperado {
		t.Fatalf("SHA divergiu do oráculo externo:\n obtido:   %s\n esperado: %s", obtido, esperado)
	}
	if obtido == SHA256Hex([]byte(`{"texto":"tchau"}`)) {
		t.Fatal("payloads diferentes deram o mesmo SHA")
	}
	if err := ValidarSHA256(obtido); err != nil {
		t.Fatalf("SHA gerado não passa na regra do banco: %v", err)
	}
}
