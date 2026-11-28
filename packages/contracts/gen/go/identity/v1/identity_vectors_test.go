package identityv1

import (
	"encoding/json"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"os"
	"testing"
)

// Authored vectors shared with TypeScript; this file is not generated.
func TestStatusWireVector(t *testing.T) {
	data, err := os.ReadFile("../../testdata/status-v1.json")
	if err != nil {
		t.Fatal(err)
	}
	var value AccountStatusEvidence
	if err := protojson.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	if value.AccountRevision != 9007199254740997 || value.SecurityEpoch != 9007199254740993 || value.AttachmentGeneration != 9007199254740995 {
		t.Fatal("a revision above the JavaScript safe-integer range lost precision")
	}
	if value.AuthenticationCutoff.GetNanos() != 123456789 {
		t.Fatal("timestamp precision changed")
	}
	wire, err := proto.Marshal(&value)
	if err != nil {
		t.Fatal(err)
	}
	var decoded AccountStatusEvidence
	if err := proto.Unmarshal(wire, &decoded); err != nil {
		t.Fatal(err)
	}
	if !proto.Equal(&value, &decoded) {
		t.Fatal("binary round trip changed evidence")
	}
	encoded, err := protojson.Marshal(&value)
	if err != nil {
		t.Fatal(err)
	}
	var rendered map[string]any
	if err := json.Unmarshal(encoded, &rendered); err != nil {
		t.Fatal(err)
	}
	if rendered["securityEpoch"] != "9007199254740993" {
		t.Fatal("uint64 JSON must remain a decimal string")
	}
}

func TestUnknownAndAbsentValuesDoNotBecomeActiveEvidence(t *testing.T) {
	var unknown AccountStatusEvidence
	if err := protojson.Unmarshal([]byte(`{"eligibility":99}`), &unknown); err != nil {
		t.Fatal(err)
	}
	if unknown.Eligibility != AccountEligibility(99) {
		t.Fatal("unknown enum was coerced into a known permission")
	}
	var absent AccountStatusEvidence
	if err := protojson.Unmarshal([]byte(`{}`), &absent); err != nil {
		t.Fatal(err)
	}
	if absent.Eligibility != AccountEligibility_ACCOUNT_ELIGIBILITY_UNSPECIFIED || absent.ObservedAt != nil || absent.ValidUntil != nil {
		t.Fatal("missing evidence must remain missing")
	}
}

func TestClosureReceiptWireVector(t *testing.T) {
	data, err := os.ReadFile("../../testdata/closure-receipt-v1.json")
	if err != nil {
		t.Fatal(err)
	}
	var value ReportClosureRequest
	if err := protojson.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	participant := value.GetParticipant()
	if participant.GetAccount().GetAccountId() != "019acf27-a591-7000-8000-000000000001" || participant.GetAccount().GetAuthorityIncarnation() != "fixture-authority-v1" {
		t.Fatal("closure participant identity changed")
	}
	if participant.GetClosureRevision() != 9007199254740997 || participant.GetParticipantGeneration() != 9007199254740995 {
		t.Fatal("a closure generation above the JavaScript safe-integer range lost precision")
	}
	if participant.GetManifestVersion() != 1 || value.Outcome != ClosureReceiptOutcome_CLOSURE_RECEIPT_OUTCOME_REPAIR_REQUIRED {
		t.Fatal("closure contract version or outcome changed")
	}
	wire, err := proto.Marshal(&value)
	if err != nil {
		t.Fatal(err)
	}
	var decoded ReportClosureRequest
	if err := proto.Unmarshal(wire, &decoded); err != nil {
		t.Fatal(err)
	}
	if !proto.Equal(&value, &decoded) {
		t.Fatal("binary round trip changed closure receipt")
	}
	encoded, err := protojson.Marshal(&value)
	if err != nil {
		t.Fatal(err)
	}
	var rendered map[string]any
	if err := json.Unmarshal(encoded, &rendered); err != nil {
		t.Fatal(err)
	}
	fields, ok := rendered["participant"].(map[string]any)
	if !ok || fields["closureRevision"] != "9007199254740997" || fields["participantGeneration"] != "9007199254740995" {
		t.Fatal("closure uint64 JSON must remain decimal strings")
	}
}

func TestClosureReceiptUnknownAndAbsentValuesRemainExplicit(t *testing.T) {
	var unknown ReportClosureRequest
	if err := protojson.Unmarshal([]byte(`{"outcome":99}`), &unknown); err != nil {
		t.Fatal(err)
	}
	if unknown.Outcome != ClosureReceiptOutcome(99) {
		t.Fatal("unknown closure outcome was coerced into a supported receipt")
	}
	var absent ReportClosureRequest
	if err := protojson.Unmarshal([]byte(`{}`), &absent); err != nil {
		t.Fatal(err)
	}
	if absent.Participant != nil || absent.Outcome != ClosureReceiptOutcome_CLOSURE_RECEIPT_OUTCOME_UNSPECIFIED {
		t.Fatal("missing closure proof must remain missing")
	}
	var response ReportClosureResponse
	if err := protojson.Unmarshal([]byte(`{}`), &response); err != nil {
		t.Fatal(err)
	}
	if response.Accepted {
		t.Fatal("an absent acknowledgement must not become accepted")
	}
}
