# Contributing to Phosphur

Bug reports, fixes and small improvements are welcome. For a larger change (a new feature, a different proxy runtime or transport, a redesign), open an issue first so we can agree on the approach before you build it.

## Reporting issues

Search existing issues first. Include reproducible steps, expected and actual behavior, your browser, and whether you use a hosted instance or your own deployment. Review logs and screenshots before sharing; remove secrets and personal information.

- **Bugs and feature requests:** open an issue with the matching form.
- **Security problems:** follow [SECURITY.md](SECURITY.md); don't open a public issue.

## Development

Setup and the check commands are in the README's [Development](README.md#development) section; [AGENTS.md](AGENTS.md) lists the checks in order. All of them, including the end-to-end tests, must pass before a pull request is merged.

## Pull requests

- Keep each pull request to one focused change, and fill in the pull request template.
- Put logic in a pure `src/lib/` module with unit tests; keep components thin.
- Update affected docs when behavior changes.
- Write in American English: code, comments, docs and user-facing text.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`fix(tabs): ...`) and carry a DCO sign-off (`git commit -s`).
- Upgrade the pinned Scramjet packages only together, following [docs/agents/proxy-runtime.md](docs/agents/proxy-runtime.md).

## Releasing

Maintainers only.

1. Bump `version` in `package.json` (SemVer).
2. Write `.github/release-notes/vX.Y.Z.md` in the style of the earlier notes.
3. Commit as `chore(release): vX.Y.Z`, tag `vX.Y.Z` on `main` and push the tag.

The release workflow checks that the tag matches `package.json`, runs every check including the end-to-end tests, packages the built site and server as `phosphur-X.Y.Z.tar.gz` and `.zip`, and publishes the release with the notes and a Full Changelog link. Run it by hand from the Actions tab for a dry run that builds without publishing.

## Licensing

Contributions are licensed under the project's [MIT License](LICENSE).
