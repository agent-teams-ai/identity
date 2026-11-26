---
id: ADR-0001
status: accepted
date: 2026-11-26
---

# ADR-0001: Identity modules and initial tooling

## Context

The owner selected the expanded Identity service and authorized implementation
with GetTok as the first consumer. Account identity, authentication provider
integration and product authorization have different owners. The first
substantive implementation must use actual Foundation mechanisms, full FMS and
the separately adopted Get Modular Consumer Module Standard.

## Decision

The service remains a modular monolith with inward dependencies. The account
feature owns lifecycle and external-identity bindings. Its domain and use cases
consume narrow semantic ports. Provider and PostgreSQL adapters stay outside
those layers. Feature composition exports its public group; the package root
assembles groups; the HTTP Host selects Fastify and Connect at the outer edge.
GetTok owns its BFF sessions and product users. Product repository credentials
and product authorization stay with the product.

Adopt immutable FMS v1.1 from agent-teams-ai/.github commit
89b5d7c512d9c4b5ae63709857a0d71cb2e6d178, content digest
sha256:cfa088ef7396139554fe5e3bcc839271b23299c6b60c569a3a7f1cd7c9f0bc6c.
Adopt Get Modular CMS from get-modular commit
a5f41853200aed26d692e89d768185013d629a12, complete document digest
sha256:ef5044eef1da7a01f3ca40323cd17d9f2597fc22b5abb905c7c77e5318b408d7.
The local profile and required gates map the real modules and their public
surfaces. No generic scaffolder is claimed to generate the DDD feature.

Use published Foundation4.0.2, FMS0.4.3, Stack0.3.1, Get Modular core/assembly0.8.0,
resources0.2.2 and conformance0.5.2. Foundation remains a development dependency.
Node26.11.1 and pnpm11.20.0 are exact native pins. Stack owns TypeScript7.0.2,
Oxlint and Oxfmt. Eligible private library package boundaries use the public
Foundation Node/TypeScript recipe with real plan, review, apply and receipt.
The private HTTP process is an application Host with its own ordinary manifest.

## Consequences

The account core, generated versioned contracts and HTTP Host have separate
package owners. Only an implemented SDK receives a client package. Native gates
must prove real source ownership, strict checking, composition, wire behavior
and the small set of concurrency and credential-boundary tests.

The central admission checker and managed Docs cohort are separate external
admission gates. At the observed central revision, the checker retains Stack0.1.1
and legacy coverage keys while Foundation4 requires quality-v5. Docs stable33 is
QUALIFIED but only Extension Foundation is its canary; stable31 remains
RECOMMENDED. This decision does not grant a bypass, fabricate a managed profile,
or claim complete qualification. Record actual outcomes before merge.
