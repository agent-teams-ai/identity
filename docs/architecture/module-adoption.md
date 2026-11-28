# Identity module adoption

The accepted [module decision](../decisions/0001-identity-modules-and-tooling.md)
and [one FMS profile](../../architecture/foundation/feature-modules.json) bind the
actual account core, versioned contracts and HTTP Host. Root and package
composition may consume public feature groups. Domain and use-case source stay
independent of HTTP, Keycloak, PostgreSQL and the modular runtime.

The required architecture gate calls the published FMS on-disk checker and Get
Modular layout conformance on Foundation's real parsed source graph. It rejects
unresolved imports and incomplete use-case export observations. Its published
fixture corpus is supplementary; the consumer's actual graph is the subject.

The v5 quality topology uses the public FMS projection and explicitly adds the
directories of the exact native assets from the quality profile. This ensures
the authoritative Protobuf source stays in the production census although the
Buf workspace uses its conventional proto directory. No TypeScript quality
coverage is claimed for Go: Buf generation and native Go tests independently
check the generated consumer and shared wire vectors. Its files remain in the
complete physical formatting census.

The account persistence adapter currently uses pg and versioned SQL under
[ADR-0002](../decisions/0002-native-postgres-first-slice.md). Source and contract
boundaries do not depend on that concrete choice. An actual client SDK will be
added only with an implemented public API and its own qualified surface.

Foundation source, suppression, formatting, gates, agent routes, dependency
declarations, local links and architecture decisions apply immediately.
Scaffolding applies to the two real private library boundaries. Publication,
public API compatibility and protobuf released-baseline evolution activate with
their first real published subject; there is no manufactured release baseline.
Managed Docs admission remains pending the exact eligible central cohort.
