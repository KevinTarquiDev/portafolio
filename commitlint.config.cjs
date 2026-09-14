module.exports = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: {
    parserOpts: {
      headerPattern: /^((\d+)-)?([a-z]+)(?:\(([^)]+)\))?!?: (.+)$/,
      headerCorrespondence: [
        "issue",
        "issueNumber",
        "type",
        "scope",
        "subject",
      ],
    },
  },
};
