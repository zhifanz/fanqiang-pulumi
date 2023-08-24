import nunjucks from "nunjucks";

const templates = nunjucks.configure(__dirname, {
  trimBlocks: true,
  lstripBlocks: true,
});

export function render(file: string, properties: object): string {
  return templates.render(file, properties);
}
