import nunjucks from "nunjucks";
import { ShadowsocksProperties } from "../proxy/ShadowsocksServer";

const template = nunjucks.configure(__dirname, {
  trimBlocks: true,
  lstripBlocks: true,
});

export function render(ssp: ShadowsocksProperties, ipAddress: string): string {
  return template.render("clash-config.yml.j2", {
    host: ipAddress,
    ...ssp,
  });
}
