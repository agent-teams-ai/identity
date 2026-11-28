import type { CapabilitiesOf } from "@get-modular/assembly";
import type { HttpContracts } from "../features/http/composition/http.contracts.js";

export interface ServerCapabilities extends CapabilitiesOf<HttpContracts> {}
