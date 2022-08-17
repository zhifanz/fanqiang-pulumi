import { ServiceEndpoints } from "./ServiceEndpoints";

export interface ForwardProxyFactory {
  (originalService: ServiceEndpoints, publicKey?: string): ServiceEndpoints;
}
