package main

import "testing"

func TestIdentidadeDoWorkerRecusaHostCurto(t *testing.T) {
	// A RPC levanta INVALID_WORKER_ID quando btrim(p_worker_id) tem menos de 3
	// caracteres. Recusar aqui transforma um erro de produção, no meio de um
	// lote, em um erro de partida — que é onde ele custa menos.
	if _, err := IdentidadeDoWorker("  ", 1); err == nil {
		t.Fatal("esperava erro para host em branco, veio nil")
	}
}

func TestIdentidadeDoWorkerEhEstavelEIdentificavel(t *testing.T) {
	id, err := IdentidadeDoWorker("runner-7", 4242)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if id != "execution-plane/runner-7/4242" {
		t.Fatalf("identidade inesperada: %q", id)
	}
}
