// Micro-problema 2 — quantos jobs em voo o runtime sustenta, e a que custo de
// memória. É o que a camada de execução faz de verdade: manter K chamadas ao
// provedor simultâneas, assinando cada uma. Go: uma goroutine por job.
package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const segredo = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func rssKB() int64 {
	b, err := os.ReadFile("/proc/self/status")
	if err != nil {
		return 0
	}
	for _, linha := range strings.Split(string(b), "\n") {
		if strings.HasPrefix(linha, "VmHWM:") {
			campos := strings.Fields(linha)
			v, _ := strconv.ParseInt(campos[1], 10, 64)
			return v
		}
	}
	return 0
}

func main() {
	total, _ := strconv.Atoi(os.Args[1])
	concorrencia, _ := strconv.Atoi(os.Args[2])
	corpo, _ := os.ReadFile("payload.json")

	transporte := &http.Transport{
		MaxIdleConns:        concorrencia,
		MaxIdleConnsPerHost: concorrencia,
		MaxConnsPerHost:     concorrencia,
		IdleConnTimeout:     90 * time.Second,
	}
	cliente := &http.Client{Transport: transporte, Timeout: 30 * time.Second}

	var ok, falhas int64
	jobs := make(chan int, total)
	for i := 0; i < total; i++ {
		jobs <- i
	}
	close(jobs)

	inicio := time.Now()
	var wg sync.WaitGroup
	for w := 0; w < concorrencia; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				soma := sha256.Sum256(corpo)
				canonica := strings.Join([]string{
					strconv.FormatInt(time.Now().UnixMilli(), 10),
					"nonce-" + strconv.Itoa(i),
					"POST", "/v1/messages/dispatch", hex.EncodeToString(soma[:]),
				}, ".")
				mac := hmac.New(sha256.New, []byte(segredo))
				mac.Write([]byte(canonica))
				assinatura := hex.EncodeToString(mac.Sum(nil))

				req, _ := http.NewRequest("POST", "http://127.0.0.1:8791/v1/messages/dispatch", bytes.NewReader(corpo))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("x-innov-signature", assinatura)
				resp, err := cliente.Do(req)
				if err != nil {
					atomic.AddInt64(&falhas, 1)
					continue
				}
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
				atomic.AddInt64(&ok, 1)
			}
		}()
	}
	wg.Wait()
	decorrido := time.Since(inicio)

	saida, _ := json.Marshal(map[string]any{
		"runtime": "go " + runtime.Version(), "total": total, "concorrencia": concorrencia,
		"segundos":     fmt.Sprintf("%.3f", decorrido.Seconds()),
		"jobs_por_seg": int64(float64(ok) / decorrido.Seconds()),
		"ok":           ok, "falhas": falhas, "rss_pico_kb": rssKB(),
	})
	fmt.Println(string(saida))
}
