import { Code, ConnectError } from '@connectrpc/connect';
import { IdentityErrorDetailSchema, IdentityErrorReason } from '@agent-teams/identity-contracts';
import { isAccountFailure, type FailureReason } from '@agent-teams/identity-core';

const reasons: Partial<Record<FailureReason, IdentityErrorReason>> = {
  ACCOUNT_SUSPENDED: IdentityErrorReason.ACCOUNT_SUSPENDED,
  ACCOUNT_CLOSED: IdentityErrorReason.ACCOUNT_CLOSED,
  REATTACHMENT_REQUIRED: IdentityErrorReason.REATTACHMENT_REQUIRED,
  AUTHENTICATION_REQUIRED_AFTER_CUTOFF: IdentityErrorReason.AUTHENTICATION_REQUIRED_AFTER_CUTOFF,
  INSUFFICIENT_PROOF: IdentityErrorReason.INSUFFICIENT_PROOF,
  RECOVERY_REQUIRED: IdentityErrorReason.RECOVERY_REQUIRED,
  REPAIR_REQUIRED: IdentityErrorReason.REPAIR_REQUIRED,
  CONFLICT: IdentityErrorReason.CONFLICT,
  ADMISSION_EXPIRED: IdentityErrorReason.ADMISSION_EXPIRED,
};

function codeOf(reason: FailureReason): Code {
  switch (reason) {
    case 'UNAUTHENTICATED': return Code.Unauthenticated;
    case 'UNAVAILABLE': return Code.Unavailable;
    case 'PERMISSION_DENIED': return Code.PermissionDenied;
    case 'INVALID_ARGUMENT': return Code.InvalidArgument;
    case 'CONFLICT': return Code.Aborted;
    default: return Code.FailedPrecondition;
  }
}

/** Public failures never carry provider responses, SQL or credentials. */
export function rpcError(error: unknown): ConnectError {
  if (error instanceof ConnectError) return error;
  if (!isAccountFailure(error)) return new ConnectError('Identity is unavailable', Code.Unavailable);
  const reason = reasons[error.reason];
  return new ConnectError(error.reason, codeOf(error.reason), undefined,
    reason === undefined ? undefined : [{ desc: IdentityErrorDetailSchema, value: { reason } }]);
}
