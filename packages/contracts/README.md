# Identity protocol candidate

This private TEST candidate implements the transport boundary defined by
[`identity.proto`](proto/identity/v1/identity.proto). It is not a released SDK or
a promise that the complete account lifecycle and stronger authentication
profile already run in production. The [consumer handoff](../../docs/contracts/identity-v1-test-candidate.md)
defines the required interpretation of these messages.

The schema owns wire messages. Domain and application modules do not import
generated DTOs; inbound and outbound adapters translate at their boundaries.

## Reproduction

The workspace pins Buf 1.75.0, protoc-gen-es / protobuf 2.17.0 and Connect 2.3.0.
Native Go bindings use Go 1.27.4, protoc-gen-go 1.36.12 and
protoc-gen-connect-go 1.21.1. Install those exact generator versions in a
task-owned tool directory, put that directory and the workspace binaries on
`PATH`, then run `node tools/generate-contracts.ts` from the repository root.
The native generator owns output formatting. The one declared normalization
removes exactly its file-wide `eslint-disable` banner after the two pinned
generated header lines, because Foundation forbids that suppression. Header
or occurrence drift fails for review; no other source bytes are rewritten.

Generated TypeScript lives under
`src/features/protocol/contracts/gen`; native Go lives under `gen/go` with
module path `github.com/agent-teams-ai/identity/packages/contracts/gen/go`.
Only curated TypeScript symbols are exported from the package root.

`pnpm contracts:check` checks Buf, deterministic generation with the same
declared normalization and native Go
vectors without changing tracked files. The shared JSON vector exercises
64-bit revisions above JavaScript's safe integer range and nanosecond
timestamps in both languages. Unknown enum values and absent timestamps must
remain non-authoritative, never silently become ACTIVE or infinite validity.

An external Go workspace may join a local consumer and this candidate during
development. Do not commit a local `replace` as a purported published SDK.
Before a consumer adopts the artifact, record its real source commit, schema
digest and compatibility evidence. A later release must provide the normal
immutable version and provenance rather than pretending this local candidate
is already published.

## Pure TypeScript consumer status guard — private TEST candidate

The `pinConsumerSession` and `observeConsumerStatus` helpers consume the
existing versioned protobuf DTOs without provider credentials, network calls,
transport, database or mutable global clocks. An authenticated **human**
`ResolveSelf` response establishes immutable account identity, consumer,
security epoch, attachment generation, admission policy and original
human-proof deadline. A separately authenticated workload status observation
may renew **status freshness only**, never that original human proof.

The caller must capture request-start and response-received values from the
**same monotonic clock**. The helper spends transport time and a configured
clock uncertainty inside the source's exact validity window, bounds status
leases to at most 60 seconds, anchors **all future evidence deadlines** to
the original human request/observed timestamp rather than reminting a cached
response's lifetime, and requires a fresh clock instance ID after process
restart or handoff. It rejects unknown/foreign/expired evidence,
contradictory equal revisions, lost revocation, changed attachment generation,
and any attempt to issue the unqualified independent-continuity profile.
A denial must invalidate the calling product's session/use authorization;
discarding the exception and reusing stale cached authority is forbidden.

The helper is intentionally a pure typed guard, not a credential validator.
The owning BFF/worker must authenticate the actual response channel, persist
its local revocation high-water mark and closed-owner fences, apply local
roles/SCM permissions, coordinate concurrent refresh and handle provider
logout/unknown external effects. No helper call upgrades product access.
Consumer integration and a published signed SDK artifact remain separate
qualification gates; this package is still private and version `0.0.0`.
