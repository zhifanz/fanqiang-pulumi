import nunjucks from "nunjucks";
import { ShadowsocksProperties } from "../proxy/shadowsocks";

const template = nunjucks.configure(__dirname);

export type ClashParams = Partial<ShadowsocksProperties> & { host: string };

export function render(params: ClashParams): string {
  return template.render("clash-config.yml.j2", params);
}
