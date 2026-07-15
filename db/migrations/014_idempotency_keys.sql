-- Inventário TI — Usina Caçu
-- Migration 014: chave de idempotência para mutações vindas do app mobile,
-- que mantém uma fila de sincronização offline-first. Sem isso, reenviar uma
-- operação cujo resultado se perdeu na rede (o servidor processou, mas a
-- resposta nunca chegou ao app) criaria um registro duplicado.

CREATE TABLE idempotency_keys (
  key UUID PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_idempotency_keys_created_at ON idempotency_keys(created_at);
