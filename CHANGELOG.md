# Changelog

Notable changes to the ccmjs Teambuild component are documented here, newest first.

## 2.0.0

### Breaking changes and migration

- `resources/configs.mjs` now exports only `demo`. If your app loaded
  `#realtime`, `#manual` or `#frozen`, move the settings into your own
  configuration. Keep your existing backend URL, datastore name and dataset key
  to continue using the same teams. The dataset format is still `schema: 1`.
  - For `realtime`, set `observe: { key }` in the datastore options, using the
    same key as `data.key`. For `manual`, omit `observe`.
  - For `frozen`, use the realtime settings and set `editable`, `joinable` and
    `leavable` to `false`. Set `teamOverrides: [{ joinable: true, leavable: true }]`
    to keep the first team open for joining and leaving.
- Custom stylesheets that target the former `.teambuild` wrapper should target
  `.root` inside the shadow root. With `root: false`, scope those rules to your
  embedding container. The component host has the attribute `data-ccm-component="teambuild"`.

### Changed

- The toolbar and rename dialog use the ccmjs tile logo. Set `theme.logo` to a
  CSS image such as `url("/assets/logo.svg")` to replace it in both places.
- The English demo uses `https://kless.inf.h-brs.de/api/` for CCM account
  registration, sign-in and live team data. German remains available through
  `resources/content.mjs#labels.de`.
- Teambuild uses ccmjs 29.1.0 and bundles User 1.2.0. The bundled dependencies
  include both their readable and minified files.

## 1.0.0

### Added

- Initial release with configurable team sizes and permissions, authenticated
  membership and renaming, and optional WebSocket updates. Concurrent edits
  use conditional writes (`ifMatch`).
