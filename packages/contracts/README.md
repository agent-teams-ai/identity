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
`PATH`, then run `pnpm contracts:generate` from the repository root.
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

## Hosted candidate generation

Pull requests that change contract inputs and pushes to the dedicated
`qualification/identity-contract-candidate-20261128` branch run the
[candidate workflow](../../.github/workflows/identity-contract-candidate.yml)
on their exact source HEAD with the same pinned generators. The dedicated branch
allows generation before publishing a coherent PR checkpoint. Its
`identity-contract-candidate-<head>` artifact contains only the three declared
TypeScript/Go bindings, the compiled descriptor and a JSON manifest with the
source revision and SHA-256 digests of explicit source inputs and candidate
artifacts. Before using the bytes, verify the manifest's revision against the
intended checkout, its input digests against that checkout and its artifact
digests against the extracted files. Review and commit the generated bindings.
An expanded proto input inventory or a Buf dependency lock requires an explicit
update to the workflow's digest inventory before it can generate candidates.

This job produces reviewable candidates. The existing `pnpm contracts:check`
remains read-only and compares committed bindings with an isolated fresh
generation; the required complete CI route still qualifies the committed result.
Candidate generation success does not establish parity or native vector success.

An external Go workspace may join a local consumer and this candidate during
development. Do not commit a local `replace` as a purported published SDK.
Before a consumer adopts the artifact, record its real source commit, schema
digest and compatibility evidence. A later release must provide the normal
immutable version and provenance rather than pretending this local candidate
is already published.
