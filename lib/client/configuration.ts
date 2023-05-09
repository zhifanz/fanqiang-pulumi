import nunjucks from "nunjucks";
import { ShadowsocksProperties } from "../proxy/ShadowsocksServer";

const template = nunjucks.configure(__dirname, {
  trimBlocks: true,
  lstripBlocks: true,
});

export type ClashParams = Partial<ShadowsocksProperties> & { host: string };

export function render(params: ClashParams): string {
  return template.render("clash-config.yml.j2", params);
}
