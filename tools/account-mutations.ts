export const domainTest = "packages/identity/tests/features/account/domain-admission.test.js";
export const domainNames = [
  "status preserves large counters and spends clock uncertainty inside its fixed lifetime",
  "re-entry requires proof strictly newer than each cutoff including uncertainty",
  "enable cannot restore an old epoch; closure and exhausted counters remain terminal",
] as const;

const policyFile = "packages/identity/src/features/account/domain/admission-policy.js";
const modelFile = "packages/identity/src/features/account/domain/model.js";
export const mutationInputs = [
  policyFile,
  modelFile,
  domainTest,
  "packages/identity/tests/features/account/admission-specification.js",
] as const;

export interface AccountMutation {
  readonly id: string;
  readonly file: string;
  readonly expectedFailure: string;
  readonly edits: readonly { readonly before: string; readonly after: string }[];
}

export const accountMutations: readonly AccountMutation[] = [
  {
    id: "remove-status-clock-budget",
    file: policyFile,
    expectedFailure: domainNames[0],
    edits: [
      {
        before:
          "Math.min(observedAtMs + policy.statusBudgetMs, credentialExpiresAtMs) -\n            policy.maximumClockSkewMs",
        after: "Math.min(observedAtMs + policy.statusBudgetMs, credentialExpiresAtMs)",
      },
    ],
  },
  {
    id: "extend-status-to-later-deadline",
    file: policyFile,
    expectedFailure: domainNames[0],
    edits: [
      {
        before: "Math.min(observedAtMs + policy.statusBudgetMs, credentialExpiresAtMs)",
        after: "Math.max(observedAtMs + policy.statusBudgetMs, credentialExpiresAtMs)",
      },
    ],
  },
  {
    id: "admit-exact-cutoff",
    file: policyFile,
    expectedFailure: domainNames[1],
    edits: [
      {
        before: "actor.signedInAtMs <= cutoff + policy.maximumClockSkewMs",
        after: "actor.signedInAtMs < cutoff + policy.maximumClockSkewMs",
      },
    ],
  },
  {
    id: "restore-earlier-epoch",
    file: modelFile,
    expectedFailure: domainNames[2],
    edits: [
      {
        before: 'transition === "enable" ? account.securityEpoch : account.securityEpoch + 1n',
        after: 'transition === "enable" ? account.securityEpoch - 1n : account.securityEpoch + 1n',
      },
    ],
  },
  {
    id: "erase-authentication-cutoff",
    file: modelFile,
    expectedFailure: domainNames[2],
    edits: [
      {
        before: "? account.authenticationCutoffMs",
        after: "? 0",
      },
    ],
  },
  {
    id: "reopen-closed-account",
    file: modelFile,
    expectedFailure: domainNames[2],
    edits: [
      {
        before:
          'if (account.revision !== expectedRevision) {\n        throw new AccountFailure("CONFLICT");\n    }\n    if (account.eligibility === "closed") {\n        throw new AccountFailure("ACCOUNT_CLOSED");\n    }',
        after:
          'if (account.revision !== expectedRevision) {\n        throw new AccountFailure("CONFLICT");\n    }',
      },
      {
        before: '(transition === "enable" && account.eligibility !== "suspended")',
        after:
          '(transition === "enable" && account.eligibility !== "suspended" && account.eligibility !== "closed")',
      },
    ],
  },
];
