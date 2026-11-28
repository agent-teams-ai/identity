# Formatting authority qualification

The [complete profile](../../architecture/foundation/quality-format-coverage.yaml)
keeps the physical maintained-input census with Foundation and literal formatting
with the installed Stack contract. One consumer authority owns the exact native,
generated and retained inputs. Its direct Node entry is
[scripts/check-format-inputs.ts](../../scripts/check-format-inputs.ts).

The authority checks the exact reviewed native-input inventory and bytes,
strict native lock structure, public scaffold plan/receipt validation, complete
fresh compiler input/output evidence and read-only Buf/Go formatting. Actual
compilation and deterministic contract generation happen in their owning gates
before this check. Formatting never invokes a build, generator, network client,
database or provider.

The build records its complete source and compiler-configuration inventory before
the native compiler commands. After they succeed, a changed inventory or input
digest prevents publication of build evidence. The recorded outputs include that
precompile snapshot. This catches source drift between the two snapshots; it is
not a substitute for the native compiler exit result or an isolated CI checkout.

## Required independent witnesses

`pnpm format:qualify` copies the consumer without its Git metadata or installed
dependency directories into task-owned temporary directories. It reuses the
installed public development tools through a temporary node_modules link; this
fixture link is not consumer registry-adoption evidence and is never committed.

The unchanged authority must first succeed without modifying any copied input.
The same real entry must then reject seven independently changed inputs:

- unreviewed runtime-pin bytes;
- corrupted native lock bytes;
- a fabricated retained scaffold receipt;
- changed generated contract bytes;
- changed source bytes after compilation;
- changed actual compiler output;
- an unexpected new generated file family.

The witness requires the expected validator diagnostic and complete native
process exit. Crashes, interrupted processes, timeouts and unrelated failures
are not successful witnesses. Every rejecting execution must also preserve its
input bytes. An explicit no-op substitution demonstrates that exit zero fails
the independent rejecting oracle. If the actual authority becomes a no-op, the
first bad-input witness fails the required qualification route.

A separate producer control changes source after the precompile snapshot. The
real evidence-recording entry must refuse the mismatch without changing or
replacing existing evidence. It cannot bless newly observed inputs merely
because earlier compiler output is present.

The controlled corruptions exercise byte custody across every declared route
kind. They do not independently prove every semantic property of pnpm, Buf,
Protobuf, the SQL migration or the compiler. Frozen installation, real native
generation, strict compilation, PostgreSQL tests and public receipt validation
remain separate required owners. The full `format:check` then executes the
actual Foundation census, literal Stack formatter and admitted authority chain.
