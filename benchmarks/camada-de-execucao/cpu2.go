// Micro-problema 1, decomposto e com Go escrito de forma idiomática.
//
// A primeira medição comparou o JSON.stringify do Node (C++ otimizado) contra
// json.Marshal sobre map[string]any (reflexão + ordenação de chaves), que é o
// caminho mais lento do Go e não é o que alguém escreveria de verdade. Aqui o
// envelope é struct tipada, que é como a camada de execução seria escrita.
//
// Separa também as duas metades — serialização e criptografia — porque a
// conclusão muda conforme onde o custo esteja.
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const segredo = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

type Parametro struct {
	Type string `json:"type"`
	Text string `json:"text"`
}
type Componente struct {
	Type       string      `json:"type"`
	SubType    string      `json:"sub_type,omitempty"`
	Index      string      `json:"index,omitempty"`
	Parameters []Parametro `json:"parameters"`
}
type Template struct {
	Name       string       `json:"name"`
	Language   string       `json:"language"`
	Components []Componente `json:"components"`
}
type Conteudo struct {
	Template Template `json:"template"`
}
type Identidade struct {
	IdentityID        string `json:"identityId"`
	DisplayPhone      string `json:"displayPhone"`
	ProviderAccountID string `json:"providerAccountId"`
}
type Destinatario struct {
	WaID        string `json:"waId"`
	ProfileName string `json:"profileName"`
}
type Entrega struct {
	Attempt        int    `json:"attempt"`
	MaxAttempts    int    `json:"maxAttempts"`
	SequenceNumber int    `json:"sequenceNumber"`
	IdempotencyKey string `json:"idempotencyKey"`
	NotBefore      string `json:"notBefore"`
	RateBucket     string `json:"rateBucket"`
}
type Auditoria struct {
	RequestedBy string `json:"requestedBy"`
	RequestedAt string `json:"requestedAt"`
	ProjectID   string `json:"projectId"`
	ModuleKey   string `json:"moduleKey"`
}
type Envelope struct {
	SchemaVersion  string       `json:"schemaVersion"`
	CorrelationID  string       `json:"correlationId"`
	CausationID    string       `json:"causationId"`
	Channel        string       `json:"channel"`
	OrganizationID string       `json:"organizationId"`
	Identity       Identidade   `json:"identity"`
	Recipient      Destinatario `json:"recipient"`
	Content        Conteudo     `json:"content"`
	Delivery       Entrega      `json:"delivery"`
	Audit          Auditoria    `json:"audit"`
}

func envelopeBase() *Envelope {
	return &Envelope{
		SchemaVersion:  "1.0.0",
		CorrelationID:  "b7f3c1e2-4a5d-4c8b-9e1f-0a2b3c4d5e6f",
		CausationID:    "a1b2c3d4-e5f6-4718-9a0b-1c2d3e4f5061",
		Channel:        "WHATSAPP",
		OrganizationID: "89fc39e2-9377-421f-8b32-890533916b53",
		Identity: Identidade{
			IdentityID:        "5b1a9c77-3d2e-4f10-8a6b-9c0d1e2f3a4b",
			DisplayPhone:      "+5531999990000",
			ProviderAccountID: "1029384756",
		},
		Recipient: Destinatario{WaID: "5531988887777", ProfileName: "Construtora Exemplo Ltda"},
		Content: Conteudo{Template: Template{
			Name: "medicao_aprovada_v3", Language: "pt_BR",
			Components: []Componente{
				{Type: "body", Parameters: []Parametro{
					{Type: "text", Text: "Medição 07/2026"},
					{Type: "text", Text: "R$ 184.320,55"},
					{Type: "text", Text: "Obra Residencial Aurora - Bloco B"},
					{Type: "text", Text: "Aprovada em 10/08/2026 as 14:32"},
				}},
				{Type: "button", SubType: "url", Index: "0", Parameters: []Parametro{
					{Type: "text", Text: "medicao/2026-07/aurora-bloco-b"},
				}},
			},
		}},
		Delivery: Entrega{
			Attempt: 1, MaxAttempts: 6, SequenceNumber: 184320,
			IdempotencyKey: "whatsapp:outbox:184320:1",
			NotBefore:      "2026-08-10T14:32:00.000Z",
			RateBucket:     "org:89fc39e2:wa:1029384756",
		},
		Audit: Auditoria{
			RequestedBy: "95b51071-f3cc-4d7b-8c5a-e559f1c469d7",
			RequestedAt: "2026-08-10T14:31:58.114Z",
			ProjectID:   "3f2a1b09-8c7d-4e6f-b5a4-9382716f0d5c",
			ModuleKey:   "comunicacao",
		},
	}
}

func medir(nome string, n int, f func(i int) int) map[string]any {
	sumidouro := 0
	for i := 0; i < 20000; i++ {
		sumidouro ^= f(i)
	}
	inicio := time.Now()
	for i := 0; i < n; i++ {
		sumidouro ^= f(i)
	}
	d := time.Since(inicio)
	return map[string]any{
		"etapa": nome, "ns_por_job": d.Nanoseconds() / int64(n),
		"jobs_por_segundo": int64(float64(n) / d.Seconds()), "sumidouro": sumidouro,
	}
}

func main() {
	const n = 200000
	env := envelopeBase()
	corpoFixo, _ := json.Marshal(env)

	resultados := []map[string]any{}

	// a) só serialização
	resultados = append(resultados, medir("serializacao", n, func(i int) int {
		env.Delivery.SequenceNumber = i
		b, _ := json.Marshal(env)
		return len(b)
	}))

	// b) só criptografia, sobre corpo já serializado
	resultados = append(resultados, medir("criptografia", n, func(i int) int {
		soma := sha256.Sum256(corpoFixo)
		canonica := strings.Join([]string{
			strconv.Itoa(1754835120000 + i), "nonce-" + strconv.Itoa(i),
			"POST", "/v1/messages/dispatch", hex.EncodeToString(soma[:]),
		}, ".")
		mac := hmac.New(sha256.New, []byte(segredo))
		mac.Write([]byte(canonica))
		return int(mac.Sum(nil)[0])
	}))

	// c) job completo, como a camada faria
	resultados = append(resultados, medir("job_completo", n, func(i int) int {
		env.Delivery.SequenceNumber = i
		body, _ := json.Marshal(env)
		soma := sha256.Sum256(body)
		canonica := strings.Join([]string{
			strconv.Itoa(1754835120000 + i), "nonce-" + strconv.Itoa(i),
			"POST", "/v1/messages/dispatch", hex.EncodeToString(soma[:]),
		}, ".")
		mac := hmac.New(sha256.New, []byte(segredo))
		mac.Write([]byte(canonica))
		return int(mac.Sum(nil)[0])
	}))

	saida, _ := json.Marshal(map[string]any{
		"runtime": "go " + runtime.Version(), "forma": "struct tipada",
		"bytes_do_corpo": len(corpoFixo), "jobs": n, "etapas": resultados,
	})
	fmt.Println(string(saida))
}
