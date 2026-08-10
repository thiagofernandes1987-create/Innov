// Provedor falso: responde com latência fixa, para que o cliente seja o que
// está sendo medido. Latência de 40 ms é a ordem de um POST à Graph API da
// Meta a partir de São Paulo — o que a camada de execução enfrenta de verdade.
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"sync/atomic"
	"time"
)

func main() {
	latencia := 40 * time.Millisecond
	if len(os.Args) > 1 {
		ms, _ := strconv.Atoi(os.Args[1])
		latencia = time.Duration(ms) * time.Millisecond
	}
	var atendidas int64
	http.HandleFunc("/v1/messages/dispatch", func(w http.ResponseWriter, r *http.Request) {
		io.Copy(io.Discard, r.Body)
		r.Body.Close()
		time.Sleep(latencia)
		atomic.AddInt64(&atendidas, 1)
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"ok":true,"providerMessageId":"wamid.FAKE"}`)
	})
	http.HandleFunc("/contagem", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, atomic.LoadInt64(&atendidas))
	})
	srv := &http.Server{Addr: "127.0.0.1:8791"}
	fmt.Fprintln(os.Stderr, "provedor falso em 127.0.0.1:8791, latencia", latencia)
	srv.ListenAndServe()
}
