# Teambuild

A ccmjs v28 component for collaborative team formation, with optional authentication,
configurable team rules, responsive team cards and safe concurrent updates.
Component logic and UI rendering live in `ccm.teambuild.mjs`; the stylesheet is
loaded through a `ccm.load` dependency. No build step is required.

## Embedding

```html
<script src="./libs/framework/ccm-28.0.0.min.js"></script>
<div id="teams"></div>
<script type="module">
  await ccm.start("./ccm.teambuild.mjs", {
    data: {
      key: "seminar",
      store: ["ccm.store", {
        name: "teambuild",
        url: "https://your-ccm-server.example",
        observe: { key: "seminar" }
      }]
    },
    user: ["ccm.instance", "./libs/user/ccm.user-1.0.0.min.mjs", {
      url: "https://your-ccm-server.example",
      realm: "ccm"
    }],
    maxMembers: 4,
    maxTeams: 6,
    teamNames: ["Idea Workshop", "New Perspectives", "Future Lab"]
  }, document.querySelector("#teams"));
</script>
```

The server must support the `ifMatch` write option described below. Deploy the
accompanying extension in `ccm-server/lib/data.mjs` on the server. Unmodified ccmjs
v28 already forwards this option. The component never falls back to unconditional
overwrites.

`index.html` provides an interactive demo with the User component. Open the page
through an HTTP server. Authentication and team data use the local CCM server at
`http://localhost:8080`. Teams are stored in the `teambuild` datastore under the
`demo` key and survive page reloads. WebSocket observation is enabled: joins,
departures and name changes appear automatically in every open demo instance.
Without an existing dataset, the demo starts with one empty team; the first join
creates the dataset on the server. Once signed in, users can join, switch teams,
leave and rename their own team.

`resources/configs.mjs` also provides `realtime`, `manual` and `frozen`
configurations for the local CCM server. Load them with a dependency such as
`["ccm.load", "./resources/configs.mjs#realtime"]`.

When `user` is configured, the User component renders its own sign-in button and,
after authentication, profile and sign-out controls at the top right of the toolbar.
Its dialog remains mounted while teams refresh. Without `user`, there is no login
area and the team formation is read-only.

## Configuration

| Property | Default | Description |
| --- | --- | --- |
| `data.store` | `["ccm.store"]` | CCM datastore; defaults to in-memory storage |
| `data.key` | `"teambuild"` | One dataset per formation; compound CCM keys are also supported |
| `data.permissions` | See below | Access metadata applied when creating the dataset; `null` omits it |
| `user` | Not set | Optional User component; login controls on the right of the toolbar |
| `maxMembers` | `0` | Maximum members per team; `0` means unlimited |
| `maxTeams` | `0` | Maximum number of teams; `0` means unlimited |
| `teamNames` | `[]` | Preset names in team order |
| `editable` | `true` | Members may rename their own team |
| `joinable` | `true` | Users may join teams |
| `leavable` | `true` | Members may leave their current team |
| `teamOverrides` | `[]` | Per-team rules; index 0 applies to team 1 |
| `allowSwitch` | `true` | Direct team switching; checks both departure and joining rules |
| `nameMaxLength` | `60` | Maximum length of an edited team name, using JavaScript string length |
| `avatarSize` | `96` | Maximum thumbnail edge in pixels for a copied private profile upload |
| `labels` | German text | Interface text, accessible names, hints and error messages |
| `icons` | SVGs and text | Button icons as trusted inline SVG markup, text symbols or empty strings |
| `theme` | `{}` | CSS custom-property overrides without the `--tb-` prefix |
| `css` | Stylesheet dependency | Replace or extend the styling through `ccm.load` |
| `refreshInterval` | `30000` | Background reconciliation interval in milliseconds when observation is enabled; `0` disables the timer |
| `retryLimit` | `12` | Maximum conditional-write attempts per action, including the initial attempt |
| `onchange` | Not set | Callback after a successful local join, leave or rename action |
| `onerror` | Not set | Callback for loading, saving, observation, profile-image and extension errors |

Every property, including nested permissions, icons and labels, is documented
directly in the component's `config`. It also describes team override fields,
theme keys, units, placeholders and optional callback arguments. Partial overrides
are supported for `labels`, `icons` and `theme`. Functions are needed only for the
optional callbacks.

```js
{
  labels: { join: "Join", leave: "Leave team", refresh: "Refresh" },
  icons: { join: "+", leave: "↗", refresh: "↻" },
  theme: { accent: "#6045a0", "accent-hover": "#49327f", radius: "14px" }
}
```

Additional theme keys are `background`, `surface`, `text`, `muted`, `border` and
`font`. Supported label placeholders are `{number}` in `team` and `teamNumber`,
`{team}` in `joined`, and `{max}` in `invalidName`. Team names and member names are
always rendered as text.

## Team slots and rules

Team numbering starts at 1. Exactly one additional empty team slot appears after
the last occupied team, unless `maxTeams` has been reached. Joining that slot makes
the next one visible. Empty slots between occupied teams remain available; multiple
empty slots at the end are collapsed into one visible slot. Their stored names are
preserved. Preset names alone do not create additional team cards.

When team capacity is limited, the member list includes an entry for each empty
seat. Customize its text through `labels.emptyMember`. Unlimited teams
(`maxMembers: 0`) do not show empty seats. These placeholders are neither counted
as members nor stored in the dataset.

A person can belong to only one team at a time. Switching teams is saved as one
atomic change. It requires `leavable` on the current team and `joinable` on the
target team. Lowering limits never removes existing members or occupied teams;
it restricts subsequent joins.

```js
{
  editable: false,
  joinable: false,
  leavable: false,
  teamOverrides: [
    { joinable: true, leavable: true }
  ]
}
```

This closes team formation except for joining and leaving the first team. That
team's name remains locked. Each explicit per-team rule overrides its global
setting; omitted rules inherit the global value.

Without `user`, the component is read-only. With a User component, participants
must sign in before making changes. Any member may rename their own team when
`editable` allows it. Identity is based on `realm:key`, so identical display names
do not cause collisions. Authentication tokens are never stored in the team data.

Changes to a published app configuration apply to newly loaded instances. Already
open instances do not reload their configuration automatically. An embedding
application can also update rules on the instance and then call `app.start()`.

## Data and permissions

The component stores one complete dataset:

```js
{
  key: "seminar",
  schema: 1,
  revision: 3,
  mutation: "unique-id-of-the-last-change",
  teams: [
    { name: "Idea Workshop", members: [
      { id: "ccm:account_key", name: "Lea Sommer", picture: "https://example.org/lea.jpg" }
    ] }
  ],
  _: {
    owner: "ccm:teacher_key",
    access: { get: "all", set: "realm", del: "owner" }
  }
}
```

`name: null` uses the configured name or the fallback `Team {number}`. A team's
array index is its stable team number minus one. `revision` records the sequence
of changes; conflict detection compares the entire dataset. `mutation` identifies
a completed write even if its HTTP response was lost. Opening the page alone
does not create a dataset. Unknown data formats are never replaced automatically.

When joining or switching teams, the display name is copied from
`user.getState().user`, falling back to the account key. An available `picture`
URL is also stored and displayed as the member's avatar. Missing or failed images
fall back to initials. These values are snapshots taken when joining; existing
member records are not automatically synchronized with later profile changes.
HTTP(S) image URLs and raster image data URLs are supported.

For local CCM accounts with `user.profilePicture` enabled, a private uploaded image
is retrieved through the account and download APIs and copied into the member
record as a thumbnail data URL. This copy is visible to everyone allowed to read
the formation; the original file retains its private permissions. Tokens and
tab-local blob URLs are never stored. A missing or unavailable image does not
prevent joining; the component uses initials instead.

By default, the first join applies `data.permissions` with
`{ access: { get: "all", set: "realm", del: "owner" } }`, and the first creator
becomes the owner. For a teacher-owned formation, the teacher should first create
an empty dataset through their authenticated datastore:

```js
await teacherStore.set({
  key: "seminar", schema: 1, revision: 0, teams: [],
  _: { access: { get: "all", set: "realm", del: "owner" } }
}, undefined, { ifMatch: null });
```

The backend supplies the owner's identity. Existing permissions are preserved
during subsequent changes. To restrict participation, `set` can reference a CCM
group instead of `"realm"`.

`editable`, `joinable`, `leavable` and team limits are component UI rules, not
server-enforced field permissions. Clients with write access could submit other
changes through the general datastore API. To enforce a final formation, the
owner must also restrict write access on the server, for example with
`set: "owner"` or a CCM schedule. The backend's general dataset permissions cannot
enforce individual team rules as a security boundary.

## Realtime updates and safe concurrent writes

`observe: { key: "seminar" }` enables WebSocket observation in the remote datastore.
The server address remains an HTTP(S) URL: ccmjs writes through HTTP and uses the
WebSocket for notifications. Without `observe`, use the refresh button to load
changes. With server-confirmed live observation, the button appears as an icon
with a tooltip and accessible name. Its text remains visible without realtime,
while connecting or when the connection has problems. Clicking it reloads the
current dataset and restarts an interrupted or incomplete live connection. Once
the server acknowledges observation, missed changes are reloaded and subsequent
changes arrive automatically again.

The bundled framework exposes the observation state through
`getConnectionState()` and `onconnectionchange`. With a framework that does not
provide this interface, the button text remains visible. It also remains visible
when `icons.refresh` is empty.

Window focus and network recovery also trigger reconciliation. In realtime mode,
`refreshInterval` supplements notifications with periodic reads so that changes
missed during an interruption can be recovered.

Each notification triggers a fresh dataset read. This is necessary because CCM
deletion notifications can contain the old dataset. Read responses that predate
a local mutation are discarded. The login area and an open team-name draft remain
mounted during updates.

Safe writes use an **atomic comparison condition**:

```js
const before = await store.get("seminar");
const after = structuredClone(before);
// Apply the intended change to after.
await store.set(after, undefined, { ifMatch: before });
```

The server first checks the current read and write permissions. Within its write
queue, it compares `before` with the current dataset. If they match, the change is
saved. Otherwise, it returns **HTTP 409** without modifying data or notifying
observers. `ifMatch: null` means: create only if no dataset with this key exists.

Two concurrent joins therefore cannot overwrite each other based on the same old
member list. After a 409 response, the second client rereads the dataset, rechecks
the rules and available seats, and applies its join to the latest state. If the
last seat has already been taken, it displays the corresponding message.
Conflicting edits to the same team name are reported explicitly; the local draft
is preserved so the user can review and retry deliberately.

Comparison and saving are serialized together. This guarantee applies to the CCM
backend's supported operation with **one server process per database**, with all
writes passing through that server. Multiple server processes or direct database
writes require an additional database-level mechanism. All participating team
formation clients must use conditional writes.

For local IndexedDB storage, the Web Locks API coordinates changes across tabs
of the same origin. Local writes are rejected if that API is unavailable. Unnamed
in-memory stores serialize changes per shared datastore accessor within the page;
they do not provide collaboration across devices. Other local writers must use
the same lock. Use the CCM server for collaboration between remote clients.

## Instance API

| Method | Effect |
| --- | --- |
| `start()` | Mount the UI or reload the current state |
| `refresh()` | Reload the dataset |
| `refresh({ reconnect: true })` | Also rebuild an interrupted or stalled live connection |
| `getValue()` | Return a detached copy of the current dataset |
| `getTeams()` | Return visible teams, including the empty slot and their effective rules |
| `join(1)` | Join team 1 or switch to it |
| `leave()` | Leave the current team |
| `rename(1, "New name")` | Rename the user's own team |
| `destroy()` | Remove owned timers and listeners and unmount the UI |

Mutation methods are asynchronous, enforce the same rules as the UI and reject
on errors. `onchange({ app, type, value })` receives `join` (including switches),
`leave` or `rename`; `onerror({ app, error })` receives errors. Returned datasets
and team lists are detached copies. An externally supplied, shared datastore
remains owned by the embedding application.
