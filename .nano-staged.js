export default {
  "./src/**/*.{js,ts}": (api) =>
    `bunx @biomejs/biome check --write ${api.filenames.join(" ")}`,
};
