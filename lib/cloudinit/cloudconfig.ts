import nunjucks from "nunjucks";

const TEMPLATE_FILE = "cloud-config.yml.j2";
const template = nunjucks.configure(__dirname, {
  trimBlocks: true,
  lstripBlocks: true,
});

export function withSshAuthorizedKeys(sshAuthorizedKeys: string[]): string {
  return template.render(TEMPLATE_FILE, { sshAuthorizedKeys });
}
