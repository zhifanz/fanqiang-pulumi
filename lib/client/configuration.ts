import * as templates from "../jinja/templates";
import { ShadowsocksProperties } from "../proxy/ShadowsocksServer";

export function render(ssp: ShadowsocksProperties, ipAddress: string): string {
  return templates.render("clash-config.yml.j2", {
    host: ipAddress,
    ...ssp,
  });
}
