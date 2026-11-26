import { defineContract, type CapabilitiesOf } from '@get-modular/assembly';
import type { HttpHost } from '../contracts/http.js';

export const HttpHostContract = defineContract<HttpHost>()({ id: 'identity/http-host', revision: 1 });
export type HttpContracts = typeof HttpHostContract;
export interface HttpCapabilities extends CapabilitiesOf<HttpContracts> {}
