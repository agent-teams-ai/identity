# Account admission executable specification

The [data-only corpus](../../architecture/specifications/admission.json) records
the first ordinary admission policy. Its [strict schema](../../architecture/specifications/admission.schema.json)
fixes the 60,000 ms observation budget and 5,000 ms clock uncertainty.
Foundation validates the corpus and its [gate bindings](../../architecture/specifications/catalog.json);
that static result does not execute or qualify the domain.

## Properties and independent oracle

The existing three domain test families read this corpus and exercise the
production functions. They retain fixed expected examples and add bounded
cross-products:

- Across observation times and credential lifetimes, a status deadline is later
  than observation, no later than observation plus 55,000 ms, and no later than
  the credential expiry minus 5,000 ms. Exact integer counters are preserved.
- At each account or attachment cutoff, authentication at cutoff plus clock
  uncertainty is rejected. One millisecond later is admitted when the remaining
  ordinary proof and account conditions hold.
- Suspend then enable advances the epoch once and preserves the resulting
  authentication cutoff. Enable cannot restore the earlier epoch or erase a
  later pre-existing cutoff. Closure remains terminal.

`pnpm test` is the property gate. Its existing mandatory execution contract
requires all three named families as well as the PostgreSQL, provider, wire and
HTTP families. Missing tests, missing database prerequisites or unfinished
execution cannot satisfy this gate. This bounded corpus is not an exhaustive
proof over all times, states, providers or concurrent transactions; the existing
real PostgreSQL race tests separately cover transactional guarantees.

## Mutation witnesses

`pnpm specifications:mutation` uses a real compiled copy of the same two domain
modules and domain tests in a disposable directory. It first runs the original
copy and requires all three named tests to pass. Each candidate then changes a
specific production expression:

| Mutant                                                          | Required rejecting family     |
| --------------------------------------------------------------- | ----------------------------- |
| Remove clock uncertainty from the status deadline               | Status bounds and counters    |
| Select the later deadline instead of the earlier deadline       | Status bounds and counters    |
| Admit authentication exactly at the uncertainty-adjusted cutoff | Re-entry freshness            |
| Decrement the epoch while enabling an account                   | Enable and terminal lifecycle |
| Reset the cutoff while enabling an account                      | Enable and terminal lifecycle |
| Permit a closed account to be enabled                           | Enable and terminal lifecycle |

Each mutation must apply exactly once to the pinned compiled shape. A changed
compiler shape requires explicit review. A runtime crash, missing module,
timeout, cancellation or different failing family is not a killed mutant.
Every run must finish the three expected tests; the expected family must fail
with a real assertion. Production source and the actual build artifacts remain
unchanged, and the temporary directory is removed only after each child exits.

The source is deliberately independent of XState and generated specification
types. No second account implementation or generic mutation framework is added.
