# Disposable native Keycloak profile

`realm-test.json` is a non-production realm for the real provider qualification
fixture. Its credentials come from environment substitution; it contains only
the synthetic `fixture-person` account. Never import it into a real identity
realm or replace production secrets with these fixtures.

## Pinned provider

The tested source target is Keycloak **26.8.2**, tag commit
[`e514445f9dcdabc5bdcf67cab56c1e49655de067`](https://github.com/keycloak/keycloak/tree/e514445f9dcdabc5bdcf67cab56c1e49655de067).
Use the [official release archive](https://github.com/keycloak/keycloak/releases/download/26.8.2/keycloak-26.8.2.tar.gz)
with SHA-256
`dd124787283918bc597628887168333465ee2a811a389e0003569e52be7e487f`.
The release archive does not bundle a JVM. The
[November 2026 security advisory](https://www.keycloak.org/2026/11/java4shell-vulnerability-cve-2026-114938)
requires the corrected JVM (OpenJDK 21.0.13.1 for the Java 21 line); the first
26.8.2 container builds must not be treated as equivalent to the fixed
26.8.2-3 image. This repository does not invent an unverified image digest.

The native database qualification target is PostgreSQL **18.7**. An H2
startup is insufficient evidence for the supported production database
route. Record actual provider, JVM, database, source and profile digests in
the execution evidence; a documented version is not an executed check.

## Ordinary flow fixture

The human client accepts Authorization Code with S256 PKCE only. Its audience
mapper permits `identity-api`; the separate workload client receives only
`identity.status:read`. The explicit native `basic` client scope supplies
`sub` and `auth_time`; importing a custom scope list must not accidentally
omit these default mappers.

Provide nonempty disposable `IDENTITY_TEST_CLIENT_SECRET`,
`IDENTITY_TEST_WORKLOAD_SECRET`, `IDENTITY_TEST_USER_PASSWORD` during realm
import, and `IDENTITY_TEST_ISSUER` to the fixture. Build the repository, start
the pinned provider with the imported realm and PostgreSQL, then run:

```sh
node .test-build/packages/identity/tests/features/account/keycloak-profile.native.js
```

The fixture performs actual form login, code exchange, PKCE failure/replay,
nonce and JWT checks through the production verifier, plus separate workload
authentication and disabled alternate grants. It emits coarse results only;
no code, token, password or client secret is logged. Missing configuration
fails rather than skips. The fixture uses a disposable local password to
exercise the OIDC boundary; GitHub/GitLab broker login and GetTok's actual BFF
callback require their own complete integration checks.

`sid` is the provider session, not a local product session. This initial
ordinary profile remains bounded by the original access-token expiry, at
most 300 seconds. Machine status does not extend that deadline or prove
instant provider logout. Upstream refresh and durable native logout are
separate qualification requirements before lengthening the admitted lease.

## Stronger profile remains closed

This realm does not claim D3-A independent continuity. Keycloak's native
current-credential LoA/AIA behavior alone does not preserve the monotone
previously-admitted-factor invariant after factor loss. `acr`, `amr` or a
theme cannot substitute for this enforcement. See the
[qualification decision record](../../docs/reviews/keycloak-profile-qualification-2026-11-26.md)
for the bounded implementation options and required falsifying scenarios.
