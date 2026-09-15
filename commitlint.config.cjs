module.exports = {
    extends: ["@commitlint/config-conventional"],

    parserPreset: {
        parserOpts: {
            headerPattern:
                /^((\d+)-)?([a-z]+)(?:\(([^)]+)\))?(!)?: (.+)$/,

            headerCorrespondence: [
                "issue",
                "issueNumber",
                "type",
                "scope",
                "breaking",
                "subject",
            ],
        },
    },

    rules: {
        "header-max-length": [2, "always", 120],
        "subject-empty": [2, "never"],
    },
};