module.exports = {
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        tarballDir: "dist",
      },
    ],
    "@semantic-release/git",
    [
      "@semantic-release-plus/docker",
      {
        name: process.env["GITHUB_REPOSITORY"],
        registry: "ghcr.io",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: "dist",
      },
    ],
  ],
};
