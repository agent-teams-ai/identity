# Disposable native Keycloak profile

`realm-test.json` is a non-production realm for the real provider qualification
fixture. Its credentials come from environment substitution; it contains only
the synthetic `fixture-person` and `fixture-gettok` accounts. Never import it into a real identity
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

The pinned archive metadata is in `runtime.json`. The Temurin JDK checksum
was checked against both the official GitHub release digest and the
downloaded vendor checksum file, then against the actual downloaded archive.
The native launcher does not download or substitute runtime artifacts.

The mandatory CI command is:

```sh
node tools/check-native-keycloak.ts
```

Before running it, install and verify the exact Keycloak/JDK archives and
build the repository. Set `KEYCLOAK_HOME`, `JAVA_HOME`, optional `PSQL_BIN`,
and distinct fresh loopback PostgreSQL URLs in
`KEYCLOAK_TEST_DATABASE_URL` (database `keycloak_test`) and
`IDENTITY_TEST_DATABASE_URL` (database `identity_test`). Provide nonempty
disposable `IDENTITY_TEST_CLIENT_SECRET`, `IDENTITY_TEST_WORKLOAD_SECRET`,
`IDENTITY_TEST_USER_PASSWORD`, and set `IDENTITY_TEST_ISSUER` to
`http://127.0.0.1:18080/realms/identity-test`.

The launcher rejects existing user tables instead of truncating a database.
It verifies actual JVM/provider/database versions, applies the real Identity
migration, imports the realm, bounds readiness, and runs
`keycloak-profile.native.js` and `keycloak-service.native.js` from the
compiled test graph. The default native route also requires the signing-key
overlap fixture below. Provider cleanup is mandatory; a cleanup failure fails
the command. A fresh CI job is required after a completed lifecycle test,
which deliberately closes the native fixture subject.

The fixture performs actual form login, code exchange, PKCE failure/replay,
nonce and JWT checks through the production verifier, plus separate workload
authentication and disabled alternate grants. It emits coarse results only;
no token, password or client secret is logged by the fixture. Missing configuration
fails rather than skips. The fixture uses a disposable local password to
exercise the OIDC boundary; GitHub/GitLab broker login and GetTok's actual BFF
callback require their own complete integration checks.

The same native service test admits an independent second TEST consumer
with its own confidential human/workload clients, generated disposable
client secrets and exact callback. Both authenticate the same fixture
person over the real provider and use the same Identity HTTP/Connect
and PostgreSQL service. It checks one account reference, separate
consumer policies and receipts, denial before attachment, and global
lifecycle revocation observed by both consumers. This is not a second
production integration or browser SSO qualification.

The human client also admits the exact GetTok TEST callback
`http://127.0.0.1:18182/api/v1/auth/central/callback`. Its assigned default
scopes keep `identity.resolve:self` when the BFF explicitly requests
`openid email profile`. The synthetic user's verified contact email is
provided for GetTok's registration policy; it is not an account-linking key.

`sid` is the provider session, not a local product session. This initial
ordinary profile remains bounded by the original access-token expiry, at
most 300 seconds. Machine status does not extend that deadline or prove
instant provider logout. Upstream refresh and durable native logout are
separate qualification requirements before lengthening the admitted lease.

## Signing-key overlap fixture

`keycloak-rotation.native.ts` obtains a real human PKCE credential, warms the
production verifier, then uses a launcher-generated disposable bootstrap admin
client to add one higher-priority `rsa-generated` provider through the actual
Keycloak Admin API. Keycloak owns key generation and storage. The fixture never
exports a private key, changes an existing provider or retires an old key.
The same real login flow must issue a token with a different `kid`; the one
warm production verifier must accept it after refreshing issuer keys and keep
accepting the original unexpired token. Unknown, tampered and malformed tokens
must remain unauthenticated.

The existing verifier has a 30-second refresh cooldown, a 300-second cache
maximum age and a three-second fetch timeout. The fixture uses the real clock,
bounded polling and a 60-second process deadline; it does not claim immediate
rotation admission. Only the default `pnpm test:native-authentication` route
runs this scenario, avoiding repetition in the GetTok consumer lane. The entire
disposable provider is stopped by the existing launcher on success or failure.

The exact 26.8.2 owners are the
[component Admin API](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/services/resources/admin/ComponentResource.java),
[generated RSA factory](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/keys/GeneratedRsaKeyProviderFactory.java)
and [key selection](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/keys/DefaultKeyManager.java).
This qualifies disposable overlap and warm-cache refresh only. Production
rotation scheduling, overlap duration, retirement, compromise response and
multi-replica distribution remain pending operational policy and qualification.

## Stronger profile remains closed

This realm does not claim D3-A independent continuity. Keycloak's native
current-credential LoA/AIA behavior alone does not preserve the monotone
previously-admitted-factor invariant after factor loss. `acr`, `amr` or a
theme cannot substitute for this enforcement. See the
[qualification decision record](../../docs/reviews/keycloak-profile-qualification-2026-11-26.md)
for the bounded implementation options and required falsifying scenarios.
