package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"strings"
	"time"
)

// newRouter wires the JSON HTTP API. Patterns use Go's method-aware ServeMux.
func newRouter(t *tailnet, cfg config) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealthz)
	// /peers requires a bearer token when a shared secret is configured; with
	// none it stays open (mirrors the /ssh bridge's opt-in posture).
	mux.HandleFunc("GET /peers", handlePeers(t, cfg.SSHSecret))
	// /ssh is opt-in: with no secret configured the handler refuses with 503.
	mux.HandleFunc("GET /ssh", handleSSH(t, cfg.SSHSecret))
	return logRequests(mux)
}

// bearerToken extracts the token from an "Authorization: Bearer <token>" header,
// or "" when absent/malformed.
func bearerToken(r *http.Request) string {
	const prefix = "Bearer "
	h := r.Header.Get("Authorization")
	if len(h) > len(prefix) && strings.EqualFold(h[:len(prefix)], prefix) {
		return strings.TrimSpace(h[len(prefix):])
	}
	return ""
}

// handleHealthz is a cheap liveness probe; it does not touch the tailnet.
func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service": "headtower-agent",
		"status":  "ok",
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

// handlePeers reports the tailnet peers visible to this node. When a shared
// secret is configured it first requires a valid bearer token (the Headtower
// app mints a short-lived one), so the mesh topology - hostnames, tailnet IPs,
// direct public endpoints, OS/versions - can't be read by anyone who merely
// reaches the agent (e.g. if a reverse proxy exposes the whole /agent/ prefix
// rather than only /ssh).
func handlePeers(t *tailnet, secret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if secret != "" {
			if err := verifyPeersToken(bearerToken(r), secret); err != nil {
				writeError(w, http.StatusUnauthorized, "peers token rejected: "+err.Error())
				return
			}
		}
		resp, err := t.Peers(r.Context())
		if err != nil {
			writeError(w, http.StatusBadGateway, "could not read tailnet status: "+err.Error())
			return
		}
		writeJSON(w, http.StatusOK, resp)
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	if err := enc.Encode(body); err != nil {
		log.Printf("write response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// logRequests logs method, path, status, and duration for each request.
func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
	})
}

// statusRecorder captures the response status code for logging.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// Hijack forwards to the underlying ResponseWriter so this logging wrapper
// doesn't break the /ssh websocket upgrade. Embedding http.ResponseWriter (an
// interface without Hijack) means the wrapper otherwise fails the
// http.Hijacker assertion that coder/websocket's Accept relies on, and the
// upgrade dies with 501 Not Implemented.
func (r *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hj, ok := r.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("underlying ResponseWriter is not an http.Hijacker")
	}
	return hj.Hijack()
}
