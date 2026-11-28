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
