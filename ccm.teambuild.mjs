/**
 * Collaborative team formation with conditional writes and optional live updates.
 *
 * File guide: `config` describes the public options; Instance owns lifecycle, reads,
 * writes and DOM updates. `resources/views.mjs` creates markup; Instance's `render()` patches it.
 * `resources/content.mjs` supplies labels and icons. Private helpers inside Instance apply rules without I/O.
 * Each Instance owns its datastore accessor, callbacks, state and private helpers.
 * A notification requests a full read; only the resulting DOM changes are incremental.
 *
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 * @version 2.0.0
 */
export const component = {
  name: "teambuild",
  ccm: "././libs/framework/ccm-29.1.0.min.js",
  /** Default instance configuration. Optional dependencies and callbacks are shown as commented examples. */
  config: {
    /** Shared dataset containing all teams and members of one formation. */
    data: {
      /**
       * CCM datastore dependency or an existing accessor dedicated to this instance; never share an accessor.
       * Prefer a fresh `ccm.store` dependency per instance. The default uses isolated in-memory storage.
       * A store with name only uses IndexedDB; name plus url uses the remote CCM server.
       * For realtime updates, add observe: `{ key: <data.key> }` to the remote store configuration.
       * Example: `["ccm.store", { name: "teambuild", url: "https://example.org/api", observe: { key: "teambuild" } }]`.
       * Remote writes require the server's `options.ifMatch` support to prevent lost concurrent changes.
       */
      store: ["ccm.store"],
      /** Dataset key shared by all participants; a CCM key string or a compound key array. */
      key: "teambuild",
      /**
       * Metadata copied into the dataset's `_` property only when the first participant creates it.
       * The component sets owner to that participant's `realm:key`; existing permissions are preserved.
       * Pre-create the dataset as a teacher to retain ownership. `null` omits this metadata on creation.
       */
      permissions: {
        /** Server-enforced access rules for the entire dataset; independent of the team UI rules below. */
        access: {
          /** Anyone, including signed-out visitors, may read the team formation. */
          get: "all",
          /** Authenticated users in the owner's realm may update the dataset. */
          set: "realm",
          /** Only the dataset owner may delete it. */
          del: "owner",
        },
      },
    },
    /**
     * Optional CCM User instance; renders its own login/profile/logout controls in the top-right toolbar.
     * Omit it for read-only viewing. With a User instance, participants must sign in before changing teams.
     * Pass User-specific options such as url, realm and registration in the dependency's third argument.
     * Display names and available profile pictures are copied into member records when joining or switching.
     */
    // user: ["ccm.instance", "././libs/user/ccm.user-1.2.0.min.mjs"],
    /**
     * Maximum thumbnail edge in pixels for a private CCM profile upload copied into a member record.
     * A positive integer; aspect ratio is preserved and smaller images are not enlarged.
     */
    avatarSize: 96,

    /** Maximum number of teams: a non-negative integer; 0 means unlimited. Lowering it retains occupied teams. */
    maxTeams: 0,
    /** Maximum members per team: a non-negative integer; 0 means unlimited. Lowering it never removes members. */
    maxMembers: 0,
    /**
     * Preset team names as a string array; index 0 names team 1. Missing entries use labels.team.
     * Stored member-chosen names take precedence. Preset names alone do not create additional team cards.
     */
    teamNames: [],

    /** Whether signed-in users may join teams, including the trailing empty team. Overridable per team. */
    joinable: true,
    /** Whether members may leave their current team. Overridable per team. */
    leavable: true,
    /**
     * Allow a direct team switch, saved as one atomic change. Requires leavable on the current team
     * and joinable plus a free seat on the target team. false requires leaving before joining another team.
     */
    allowSwitch: true,
    /** Whether members may rename their own team; does not control joining or leaving. Overridable per team. */
    editable: true,
    /** Maximum length of a trimmed, edited team name, using JavaScript string length; a positive integer. */
    nameMaxLength: 60,
    /**
     * Per-team rule objects; index 0 applies to team 1. Explicit booleans override the global flags:
     * - joinable: allow joining this team.
     * - leavable: allow leaving this team.
     * - editable: allow this team's members to rename it.
     * Omitted flags inherit their global values. Example: `[{ joinable: true, leavable: true }]`.
     * These are UI rules; server-side write permissions are configured separately in `data.permissions`.
     */
    teamOverrides: [],

    /**
     * Background reconciliation interval in milliseconds when datastore observation is enabled.
     * A non-negative integer; 0 disables the timer. WebSocket, focus and online events still trigger refreshes.
     * The timer reloads missed changes and attempts to reconnect observation while the page is visible.
     */
    refreshInterval: 30000,
    /**
     * Maximum conditional-write attempts per action, including the first attempt; a positive integer.
     * After HTTP 409, the component rereads the dataset and revalidates the action before retrying.
     */
    retryLimit: 12,

    /** Versioned HTML templating and declarative event binding; loaded through CCM like the stylesheet. */
    ui: ["ccm.load", "././libs/ccm-ui/ccm-ui-1.0.0.min.mjs"],
    /**
     * HTML template module with named Element factories (see resources/views.mjs and README).
     * May also be a plain object or another ccm.load module overriding individual factories.
     * init() loads omitted factories from the default module; supplied overrides take precedence.
     * Templates run only for new views; retained elements are patched by the component's render functions.
     */
    views: ["ccm.load", "././resources/views.mjs"],
    /** Stylesheet for the default Shadow DOM. With root: false, supply CSS scoped to your embedding container. */
    css: ["ccm.load", "././resources/styles.css"],
    /**
     * CSS variables on the CCM content element (.root). For example, `accent` sets `--tb-accent`.
     * Omitted keys use the stylesheet defaults.
     * Supported keys in the supplied stylesheet:
     * - `accent`: primary buttons and own-team border; `accent-hover`: primary button hover color.
     * - `background`: component and input background; `surface`: cards, dialogs and secondary buttons.
     * - `text`: main text color; `muted`: secondary text color; `border`: neutral borders and separators.
     * - `positive`: live indicator and membership badge; `highlight`: empty-team marker.
     * - `logo`: CSS image for the toolbar and rename dialog, e.g. `url("/assets/logo.svg")`.
     * - `radius`: card/dialog/component corner radius with a CSS unit; `font`: CSS font-family value.
     * Example: `{ accent: "#6d28d9", radius: "14px" }`. Partial overrides are supported.
     */
    theme: {},

    /**
     * Optional callback after a successful action in this instance; incoming live updates do not invoke it.
     * Receives { app, type, value }: app is this instance, type is join (including switches), leave or rename,
     * and value is a detached dataset snapshot. May return a Promise; failures are forwarded to onerror.
     */
    // onchange: async ({ app, type, value }) => {},
    /**
     * Optional callback receiving { app, error } for loading, saving, observation, profile-image or onchange errors.
     * Domain errors may have error.code; HTTP failures may have error.status. May return a Promise.
     * Callback failures are logged and never roll back an already completed action.
     */
    // onerror: async ({ app, error }) => {},

    /**
     * Button icons from `resources/content.mjs`: trusted SVG markup, text symbols or empty strings.
     * Accepts a `ccm.load` dependency or a plain object; partial overrides are merged with the defaults.
     * Each icon's purpose is documented beside its default value in `resources/content.mjs`.
     */
    icons: ["ccm.load", "././resources/content.mjs#icons"],
    /**
     * Interface text, accessible names and messages from `resources/content.mjs`; defaults are English.
     * Select #labels.de for German. Accepts a `ccm.load` dependency or a plain object.
     * Partial overrides are merged with the English defaults; both bundled language maps are complete.
     * Individual labels and their placeholders are documented in `resources/content.mjs`.
     */
    labels: ["ccm.load", "././resources/content.mjs#labels.en"],
  },
  Instance: function () {
    // state is the latest accepted datastore snapshot; null means no dataset exists yet.
    // store is the resolved CCM accessor; source is its connection/storage configuration.
    let state = null, store, source, content, status, dialog;
    let grid, teamCount, teamLabel, peopleCount, peopleLabel, syncMode, refreshButton, editorView;
    // View records hold the root and cached data-ref Elements, not another copy of the saved dataset.
    // Retain cards by 1-based team number and rows across this instance's teams by realm:key.
    // Each card also retains its button and free-seat view records, using the same { root, ...refs } shape.
    // render() removes obsolete card/row entries only after processing the complete team list.
    const teamViews = new Map(), memberViews = new Map();
    // readVersion invalidates stale responses within this instance; it is not the saved revision.
    // refreshing/active track the current read/write promises; refreshPending coalesces later reads.
    let destroyed = false, initialized = false, readVersion = 0, refreshing, active;
    // The editor owns its input value; draft stores conflict context and trigger restores focus.
    let refreshTimer, debounceTimer, refreshPending = false, draft = null, trigger = null;
    // One lifetime for browser events, User subscriptions and the dedicated accessor's callbacks.
    const life = new AbortController();

    /** Public diagnostics: local action in progress, untrusted snapshot, and observation state. Read only. */
    this.gui = { busy: false, stale: false, connection: "disconnected" };

    /** CCM init: normalize partial options and capture dependencies after CCM has resolved them. */
    this.init = async () => {
      // CCM replaces nested configuration objects; restore omitted labels, icons, views and data defaults.
      // Resolve defaults even for partial overrides; dynamic imports reuse the cached content module.
      // Fresh maps keep per-instance edits separate from other instances and the shared module exports.
      const [labels, icons] = await this.ccm.load(component.config.labels[1], component.config.icons[1]);
      this.labels = { ...labels, ...this.labels };
      this.icons = { ...icons, ...this.icons };
      const requiredViews = ["main", "team", "member", "seat", "button", "image", "editor"];
      // CCM has already loaded a configured module. Only partial overrides need the default module as well.
      if (requiredViews.some(name => this.views?.[name] === undefined))
        this.views = { ...await this.ccm.load(component.config.views[1]), ...this.views };
      for (const name of requiredViews)
        if (typeof this.views[name] !== "function") throw new Error(`views.${name} must be an Element factory.`);
      this.data = { key: component.config.data.key,
        permissions: structuredClone(component.config.data.permissions), ...this.data };
      checkConfig(this);
      store = this.data?.store;
      if (!store || typeof store.get !== "function" || typeof store.set !== "function" || !this.data.key)
        throw new Error("data requires a CCM datastore and a dataset key.");
      source = store.source();
    };

    /** CCM ready: attach listeners once; start() may then be called repeatedly. */
    this.ready = async () => {
      this.gui.connection = store.getConnectionState?.() ?? "disconnected";
      const callbacks = {
        onchange: scheduleRefresh,
        onerror: error => {
          this.gui.connection = "disconnected";
          render();
          announce(this.labels.observeFailed, true);
          report(error);
        },
        onconnectionchange: connection => {
          if (destroyed) return;
          this.gui.connection = connection;
          render();
          // Read after subscription acknowledgement to close any gap during reconnection.
          if (connection === "connected") scheduleRefresh();
        },
      };
      for (const [name, handler] of Object.entries(callbacks)) {
        const previous = store[name];
        const callback = async value => {
          handler(value);
          // Our debounced read replaces CCM's automatic parent.start; forward custom callbacks.
          if (previous && !(name === "onchange" && previous === store.parent?.start)) await previous(value);
        };
        store[name] = callback;
        life.signal.addEventListener("abort", () => {
          // Embedding code may have replaced a callback since ready(); restore only our own.
          if (store[name] === callback) store[name] = previous;
        }, { once: true });
      }
      if (this.user?.subscribe) {
        const listener = type => {
          if (destroyed || !["login", "register", "logout", "deleteAccount"].includes(type)) return;
          closeEditor();
          // Observe subscriptions carry their own authentication token; renew it on account changes.
          if (source.url && store.observe) { store.close?.(); store.connect?.(); }
          scheduleRefresh();
          render();
        };
        const listeners = this.user.subscribe(listener);
        life.signal.addEventListener("abort", () => listeners?.delete?.(listener), { once: true });
      }
    };

    /** Mount authentication once; subsequent refreshes preserve its dialog and the rename draft. */
    this.start = async () => {
      if (destroyed) return;
      if (!initialized) {
        initialized = true;
        mount();
        window.addEventListener("focus", scheduleRefresh, { signal: life.signal });
        window.addEventListener("online", scheduleRefresh, { signal: life.signal });
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) scheduleRefresh();
        }, { signal: life.signal });
        if (store.observe && this.refreshInterval)
          refreshTimer = setInterval(() => { if (!document.hidden) scheduleRefresh(); }, this.refreshInterval);
        if (this.user) await this.user.start();
      }
      return this.refresh();
    };

    /**
     * Reload the full dataset and reconcile its view. Overlapping reads are coalesced;
     * a write invalidates older read responses so they cannot restore an outdated membership.
     * @param {Object} [options]
     * @param {boolean} [options.silent=false] Suppress the normal success announcement, but not errors/recovery.
     * @param {boolean} [options.reconnect=false] Replace an interrupted or incomplete remote subscription.
     * @returns {Promise<void>} During a write, queues a later read and resolves without waiting for it.
     */
    this.refresh = async ({ silent = false, reconnect = false } = {}) => {
      if (destroyed) return;
      // CCM reconnects once automatically; a later reconciliation can re-establish observation.
      if (source.url && store.observe) {
        // An explicit refresh can replace a stalled connection or a rejected subscription.
        if (reconnect && this.gui.connection !== "connected") store.close?.();
        store.connect?.();
      }
      if (this.gui.busy) { refreshPending = true; return; }
      if (refreshing) { refreshPending = true; return refreshing; }
      const version = ++readVersion;
      refreshing = (async () => {
        try {
          const value = await store.get(this.data.key);
          validateState(value, this.data.key);
          if (destroyed || version !== readVersion) return;
          const recovered = this.gui.stale;
          state = value;
          this.gui.stale = false;
          render();
          if (!silent || recovered || (this.gui.connection === "connected" && status?.textContent === this.labels.observeFailed))
            announce(this.labels.refreshed);
        } catch (error) {
          if (destroyed || version !== readVersion) return;
          this.gui.stale = true;
          render();
          announce(message(error, "loadFailed"), true);
          report(error);
          throw error;
        } finally {
          refreshing = null;
          drainRefresh();
        }
      })();
      return refreshing;
    };

    /** @returns {Formation} Detached dataset, or an unsaved empty formation before the first join. */
    this.getValue = () => structuredClone(state ?? emptyState(this.data.key));

    /** @returns {Object[]} Detached visible teams with 1-based number, name, members and effective rule flags. */
    this.getTeams = () => structuredClone(visibleTeams(state ?? emptyState(this.data.key), this));

    /**
     * @param {number} number 1-based target team; also performs an atomic switch.
     * @returns {Promise<void>} Rejects if authentication, current rules or available seats prevent the action.
     */
    this.join = number => mutate({ type: "join", number });

    /** @returns {Promise<void>} Resolves after leaving, or without writing if already outside all teams. */
    this.leave = () => mutate({ type: "leave" });

    /**
     * @param {number} number 1-based team number; must be the actor's own team.
     * @param {string} name New name, trimmed and checked against nameMaxLength.
     * @param {string} [expectedName] Name seen when editing began; defaults to the currently displayed name.
     * @returns {Promise<void>} Rejects conflicting edits unless the requested name is already stored.
     */
    this.rename = (number, name, expectedName) => mutate({ type: "rename", number, name, expectedName });

    /** @returns {Member|null} Public display metadata only; never the User component's session/token object. */
    const identity = () => {
      if (!this.user?.isLoggedIn()) return null;
      const user = this.user.getState();
      if (!user?.realm || !user.key) return null;
      const picture = pictureURL(user.picture);
      // Persist only display metadata; authentication tokens never enter the shared dataset.
      return { id: `${user.realm}:${user.key}`, name: String(user.user || user.key),
        ...(picture ? { picture } : {}) };
    };

    /** Private CCM uploads need a reusable thumbnail, not the user component's tab-local blob URL. */
    const loadPrivatePicture = async actor => {
      if (actor.picture) return;
      const user = this.user.getSessionOwner?.() ?? this.user;
      if (!user.profilePicture || user.getState()?.provider !== "ccm" || !user.url) return;
      const token = user.getToken?.();
      if (!token) return;
      try {
        const signal = AbortSignal.timeout(5000);
        const request = async params => {
          // Binary downloads are not supported by ccm.load; keep credentials in the POST body.
          const response = await fetch(user.url, { method: "POST", signal,
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...params, token }) });
          if (!response.ok) throw Object.assign(new Error("Profile picture could not be loaded."), { status: response.status });
          return response;
        };
        const account = await (await request({ account: true })).json();
        if (!account.picture || account.defaultPicture === true) return;
        const blob = await (await request({ download: account.picture })).blob();
        const bitmap = await createImageBitmap(blob);
        try {
          const scale = Math.min(1, this.avatarSize / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(bitmap.width * scale));
          canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          actor.picture = canvas.toDataURL("image/webp", 0.85);
        } finally { bitmap.close(); }
      } catch (error) {
        // An unavailable avatar must not prevent joining. The current identity is rechecked before writing.
        report(error);
      }
    };

    const text = (key, values = {}) => format(this.labels[key], values);

    const message = (error, fallback) => text(error.code && this.labels[error.code] ? error.code : fallback,
      { max: this.nameMaxLength });

    const report = error => {
      // Extension failures cannot turn an already committed action into a failed save.
      try { Promise.resolve(this.onerror?.({ app: this, error })).catch(console.error); }
      catch (failure) { console.error(failure); }
    };

    const emit = type => {
      try { Promise.resolve(this.onchange?.({ app: this, type, value: this.getValue() })).catch(report); }
      catch (error) { report(error); }
    };

    // Treat notifications as invalidations, not replacement snapshots (deletions can carry old data).
    // Debounce bursts for 40 ms; the next full read includes all changes committed before that read.
    const scheduleRefresh = () => {
      if (destroyed || !initialized) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.refresh({ silent: true }).catch(() => {}), 40);
    };
    // A notification received during a read/write must still cause a subsequent authoritative read.
    const drainRefresh = () => {
      if (refreshPending && !destroyed && !this.gui.busy && !refreshing) {
        refreshPending = false;
        scheduleRefresh();
      }
    };

    /**
     * Execute one user intent: capture its original context, read, validate, conditionally write.
     * HTTP 409 retries reapply the intent, while domain conflicts require the user to reconsider it.
     * IndexedDB uses an origin-wide lock; this.gui.busy serializes this instance's in-memory actions.
     */
    const mutate = async command => {
      if (destroyed) throw new Error("Instance has been destroyed.");
      if (this.gui.busy) throw issue("conflict");
      const actor = identity();
      if (!actor) throw issue("loginRequired");
      // Keep these preconditions fixed across retries: another tab must not silently change the intent.
      command.from = memberTeam(state, actor.id);
      if (command.type === "rename" && command.expectedName === undefined)
        command.expectedName = teamName(state?.teams[command.number - 1], command.number, this);
      const mutation = crypto.randomUUID(); // One ID per action, shared by all conditional-write attempts.
      this.gui.busy = true;
      ++readVersion;
      render();
      announce(this.labels.saving);

      const work = async () => {
        for (let attempt = 0; attempt < this.retryLimit; attempt++) {
          const before = await store.get(this.data.key);
          validateState(before, this.data.key);
          if (destroyed || identity()?.id !== actor.id) throw issue("loginRequired");
          state = before;
          const next = applyAction(before ?? emptyState(this.data.key), command, actor, this);
          if (!next) return;
          if (!before && this.data.permissions)
            next._ = { ...structuredClone(this.data.permissions), owner: actor.id };
          next.mutation = mutation;
          try {
            // Compare the entire snapshot, including permissions; null allows only first-time creation.
            const saved = await store.set(next, undefined, source.url ? { ifMatch: before } : undefined);
            validateState(saved, this.data.key);
            if (saved?.mutation !== mutation) throw issue("saveFailed");
            state = saved;
            return;
          } catch (error) {
            if (source.url && error.status === 409) {
              // Reapply the intent to a fresh snapshot; never resend a stale teams array.
              await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 35 * (attempt + 1)));
              continue;
            }
            if (source.url && error.status === 400) throw issue("unsupported");
            // A lost HTTP response can follow a successful commit. Confirm by mutation ID,
            // otherwise stop and let the user inspect the current state, without blind retries.
            // If a later write replaced our ID, this read cannot prove whether our write succeeded.
            try {
              const latest = await store.get(this.data.key);
              validateState(latest, this.data.key);
              state = latest;
              if (latest?.mutation === mutation) return;
            } catch { /* Keep the last known state and mark it stale below. */ }
            this.gui.stale = true;
            throw error;
          }
        }
        throw issue("conflict");
      };

      active = (async () => {
        if (command.type === "join") await loadPrivatePicture(actor);
        if (source.url || !source.name) return work();
        // Named IndexedDB stores need a lock across accessors/tabs; gui.busy suffices for isolated memory.
        if (!globalThis.navigator?.locks) throw issue("localLock");
        return navigator.locks.request(`ccm-teambuild:${JSON.stringify([source.name, this.data.key])}`, work);
      })();

      try {
        await active;
        this.gui.stale = false;
        if (!destroyed) {
          closeEditor();
          announce(command.type === "join" ? text("joined", { team: teamName(state?.teams[command.number - 1],
            command.number, this) }) : this.labels[command.type === "leave" ? "left" : "renamed"]);
          emit(command.type);
        }
      } catch (error) {
        if (!destroyed) {
          announce(message(error, "saveFailed"), true);
          if (draft) {
            // Keep the draft, but use the newly displayed authoritative name for an explicit retry.
            draft.expectedName = teamName(state?.teams[draft.number - 1], draft.number, this);
            editorView.error.textContent = message(error, "saveFailed");
          }
          report(error);
        }
        throw error;
      } finally {
        active = null;
        this.gui.busy = false;
        if (!destroyed) render();
        drainRefresh();
      }
    };

    /**
     * createView binds data-on-* to this stable handler map once per new view.
     * data-on-click="action" stays fixed; updateButton changes data-action (join/switch/leave).
     * Reading current attributes and view.team here avoids rebinding or capturing obsolete state.
     */
    this.events = {
      action: ({ currentTarget: target }) => {
        // Capture currentTarget before the asynchronous work; DOM events clear it after dispatch.
        Promise.resolve().then(() => {
          const number = Number(target.closest("[data-team]")?.dataset.team);
          switch (target.dataset.action) {
            case "refresh": return this.refresh({ reconnect: true });
            case "join": case "switch": return this.join(number);
            case "leave": return this.leave();
            case "edit": return openEditor(teamViews.get(number).team);
            case "cancel": return closeEditor();
            // Save is a native submit button; saveName handles both clicks and keyboard submission.
          }
        }).catch(() => {}); // refresh/mutate already report action errors; ccm-ui does not await handlers.
      },
      cancelEditor: event => {
        if (this.gui.busy) event.preventDefault(); else draft = null;
      },
      closedEditor: () => { draft = null; editorView = null; restoreTrigger(); },
      saveName: async event => {
        event.preventDefault();
        if (this.gui.busy || !event.currentTarget.reportValidity() || !draft) return;
        try { await this.rename(draft.number, editorView.name.value, draft.expectedName); }
        catch { /* mutate preserves the form and supplies its accessible error. */ }
      },
      imageError: event => event.currentTarget.remove(),
    };

    /**
     * Create one view record: { root, ...cached descendant Elements named by data-ref }.
     * Check required anchors once, before optional nodes can be detached by reconcileChildren.
     * The factory must preserve the documented element types and child lists; those are not validated here.
     * Called only for new views, never to refresh an existing card or row. Binding also happens here once.
     */
    const createView = (name, data, required = []) => {
      const root = this.views[name](this, data);
      if (!(root instanceof Element)) throw new Error(`views.${name} must return one fresh Element.`);
      const view = { root };
      for (const key of required) {
        const matches = root.querySelectorAll(`[data-ref="${key}"]`);
        if (matches.length !== 1) throw new Error(`views.${name} requires exactly one data-ref="${key}".`);
        view[key] = matches[0];
      }
      this.ui.bind(root, this);
      return view;
    };

    /** Mount once; bind our empty shell before inserting the independently bound User component. */
    const mount = () => {
      const view = createView("main", undefined, ["content", "grid", "status", "dialog", "sync", "syncMode",
        "teamCount", "teamLabel", "peopleCount", "peopleLabel", ...(this.user ? ["user"] : [])]);
      ({ content, grid, status, dialog, syncMode, teamCount, teamLabel, peopleCount, peopleLabel } = view);
      for (const [key, value] of Object.entries(this.theme))
        if (/^[a-z][a-z0-9-]*$/.test(key)) this.element.style.setProperty(`--tb-${key}`, String(value));
      refreshButton = button("refresh", "secondary");
      view.sync.append(refreshButton.root);
      if (this.user) view.user.append(this.user.host);
      // No instance argument: createView already bound our controls; the User owns its own events.
      this.ui.render(view.root, this.element);
      render();
    };

    const announce = (value, error = false) => {
      if (!status || destroyed) return;
      setProperty(status, "textContent", String(value));
      if (status.classList.contains("error") !== error) status.classList.toggle("error", error);
    };

    /** Patch a retained button, including its current action; never replace unchanged SVGs or labels. */
    const updateButton = (view, action, className = "", label = this.labels[action]) => {
      setProperty(view.root, "className", `${view.baseClass} ${className}`.trim());
      setAttribute(view.root, "data-action", action);
      const markup = String(this.icons[action] ?? "");
      if (view.markup !== markup) {
        // Only trusted configuration icons bypass escaping; user-provided text is never passed to raw().
        this.ui.render(this.ui.html`${markup.trim().startsWith("<svg") ? this.ui.raw(markup) : markup}`, view.icon);
        view.markup = markup;
      }
      setProperty(view.label, "textContent", String(label ?? ""));
    };

    const button = (action, className = "", label = this.labels[action]) => {
      const view = createView("button", undefined, ["icon", "label"]);
      view.baseClass = view.root.className;
      updateButton(view, action, className, label);
      return view;
    };

    /** Look up/create by identity, patch display metadata, return the retained row for placement by renderTeam(). */
    const renderMember = (member, actor) => {
      let view = memberViews.get(member.id);
      if (!view) {
        view = createView("member", member, ["avatar", "name", "you"]);
        view.root.dataset.member = member.id;
        view.letters = document.createTextNode(""); view.avatar.append(view.letters);
        view.picture = null;
        memberViews.set(member.id, view);
      }
      setProperty(view.name, "textContent", member.name);
      setProperty(view.letters, "data", initials(member.name));
      setProperty(view.you, "textContent", String(this.labels.you));
      // sourcePicture is the received value; picture is its validated/normalized URL.
      // Remember both to avoid repeated validation and image replacement for equivalent URLs.
      if (view.sourcePicture !== member.picture) {
        view.sourcePicture = member.picture;
        const picture = pictureURL(member.picture);
        if (view.picture !== picture) {
          view.picture = picture;
          view.image?.remove(); view.image = null;
          if (picture) {
            const image = createView("image").root;
            image.src = picture;
            view.image = image; view.avatar.append(image);
          }
        }
      }
      // A failed URL keeps its initials fallback until the URL changes; unrelated updates do not reload it.
      reconcileChildren(view.root, [view.avatar, view.name, ...(member.id === actor?.id ? [view.you] : [])]);
      return view.root;
    };

    /**
     * Create a missing card, then patch its retained view with derived data, just like renderMember().
     * reconcileChildren owns the listed parents' entire direct child lists, including optional nodes.
     * Detached badges, edit buttons and list/empty views keep their cached references for later reuse.
     */
    const renderTeam = (team, actor, own, seenMembers) => {
      let view = teamViews.get(team.number);
      if (!view) {
        view = createView("team", { number: team.number }, ["top", "caption", "badge", "heading", "title", "list", "empty", "emptyText", "emptyHint", "footer"]);
        view.root.dataset.team = String(team.number);
        view.action = button("join");
        view.seats = [];
        view.footer.append(view.action.root);
        teamViews.set(team.number, view);
      }
      view.team = team; // Bound edit handlers read this latest descriptor instead of creation-time data.
      const mine = own === team.number;
      setClass(view.root, "mine", mine);
      setClass(view.root, "empty", !team.members.length);
      setProperty(view.caption, "textContent", text("teamNumber", { number: String(team.number).padStart(2, "0") }));
      setProperty(view.badge, "textContent", String(this.labels.yourTeam));
      reconcileChildren(view.top, [view.caption, ...(mine ? [view.badge] : [])]);
      setProperty(view.title, "textContent", team.name);
      const editable = mine && team.editable;
      if (editable) {
        view.edit ??= button("edit", "icon-button");
        updateButton(view.edit, "edit", "icon-button");
        setAttribute(view.edit.root, "aria-label", this.labels.edit);
        setAttribute(view.edit.root, "title", this.labels.edit);
        setProperty(view.edit.root, "disabled", this.gui.busy || this.gui.stale);
      }
      reconcileChildren(view.heading, [view.title, ...(editable ? [view.edit.root] : [])]);
      const rows = team.members.map(member => {
        seenMembers.add(member.id);
        return renderMember(member, actor);
      });
      // Empty seats are anonymous, positional view records; retain the first N, with no saved member identity.
      // maxMembers = 0 creates no placeholders.
      const free = Math.max(0, this.maxMembers - team.members.length);
      while (view.seats.length > free) view.seats.pop().root.remove();
      while (view.seats.length < free) view.seats.push(createView("seat", undefined, ["label"]));
      for (const seat of view.seats) {
        setProperty(seat.label, "textContent", String(this.labels.emptyMember));
        rows.push(seat.root);
      }
      reconcileChildren(view.list, rows);
      setProperty(view.emptyText, "textContent", String(this.labels.empty));
      setProperty(view.emptyHint, "textContent", String(this.labels.emptyHint));
      reconcileChildren(view.root, [view.top, view.heading, rows.length ? view.list : view.empty, view.footer]);

      const full = this.maxMembers > 0 && team.members.length >= this.maxMembers;
      const withinLimit = !this.maxTeams || team.number <= this.maxTeams;
      const canSwitch = !own || (this.allowSwitch && rules(this, own).leavable);
      const action = mine ? "leave" : own ? "switch" : "join";
      const label = mine ? this.labels.leave : full ? this.labels.full
        : !team.joinable || !withinLimit ? this.labels.closed : this.labels[action];
      updateButton(view.action, action, mine ? "secondary" : "primary", label);
      setProperty(view.action.root, "disabled", this.gui.busy || this.gui.stale || (mine
        ? !team.leavable : !actor || full || !team.joinable || !withinLimit || !canSwitch));
      return view.root;
    };

    /**
     * Reconcile the accepted snapshot plus current identity, rules and gui state. No datastore I/O.
     * Unlike ui.render(), this function retains existing roots and scans for changed properties/positions.
     * Create missing views, patch all visible teams, then release obsolete records after possible row moves.
     * Login, busy/stale and connection changes also call this function without changing the dataset.
     * Always scan the current descriptors: an equal revision does not imply equal labels, rules or UI state.
     * Order: patch toolbar → collect/patch cards and rows → reconcile grid → prune caches → restore focus.
     */
    const render = () => {
      if (!content || destroyed) return;
      const focused = this.element.getRootNode().activeElement;
      const focusAction = focused?.dataset?.action;
      const focusTeam = focused?.closest?.("[data-team]")?.dataset.team;
      const actor = identity();
      const own = actor ? memberTeam(state, actor.id) : null;
      const teams = visibleTeams(state ?? emptyState(this.data.key), this);
      const total = teams.reduce((sum, team) => sum + team.members.length, 0);
      const occupied = teams.filter(team => team.members.length).length;
      setProperty(teamCount, "textContent", String(occupied));
      setProperty(teamLabel, "textContent", String(this.labels[occupied === 1 ? "oneTeam" : "teams"]));
      setProperty(peopleCount, "textContent", String(total));
      setProperty(peopleLabel, "textContent", String(this.labels[total === 1 ? "onePerson" : "people"]));
      const realtime = Boolean(source.url && store.observe);
      const live = realtime && this.gui.connection === "connected" && !this.gui.stale;
      const mode = live ? "live" : !realtime ? "manual" : this.gui.connection === "connecting" ? "connecting" : "disconnected";
      setClass(syncMode, "live", live);
      setProperty(syncMode, "textContent", String(this.labels[mode]));
      // Keep a visible label if a custom configuration deliberately removes the refresh icon.
      const iconOnly = live && String(this.icons.refresh ?? "").trim();
      updateButton(refreshButton, "refresh", `secondary${iconOnly ? " icon-button" : ""}`);
      setAttribute(refreshButton.root, "aria-label", this.labels.refresh);
      setAttribute(refreshButton.root, "title", this.labels.refresh);
      setProperty(refreshButton.root, "disabled", this.gui.busy);
      const cards = [], seenMembers = new Set(), seenTeams = new Set();
      for (const team of teams) {
        cards.push(renderTeam(team, actor, own, seenMembers));
        seenTeams.add(team.number);
      }
      reconcileChildren(grid, cards);
      for (const [number] of teamViews) if (!seenTeams.has(number)) teamViews.delete(number);
      // Clean up after all cards were processed: a row removed from one team may have moved to another.
      for (const [id, view] of memberViews) if (!seenMembers.has(id)) { view.root.remove(); memberViews.delete(id); }
      setAttribute(content, "aria-busy", String(this.gui.busy));
      // Only update editor availability here; writing its input value would overwrite the user's draft.
      for (const control of dialog.querySelectorAll("input, button")) setProperty(control, "disabled", this.gui.busy);
      // Moving/detaching a focused button can blur it. Prefer the same node, then the same team's action.
      // Never take focus away from an open editor or restore it to a disabled control.
      if (focusAction && !dialog.open && this.element.getRootNode().activeElement !== focused) {
        const root = focusTeam ? content.querySelector(`[data-team="${focusTeam}"]`) : content;
        const target = focused.isConnected ? focused : root?.querySelector(`[data-action="${focusAction}"]`);
        if (target && !target.disabled) target.focus({ preventScroll: true });
      }
    };

    /**
     * Create a fresh form for each opening inside the persistent dialog; capture the name for conflict checks.
     * Incoming updates may disable its controls but leave the user's input value and form bindings intact.
     */
    const openEditor = team => {
      trigger = { number: team.number, action: "edit" };
      draft = { number: team.number, expectedName: team.name };
      editorView = createView("editor", team, ["name", "error", "actions"]);
      const cancel = button("cancel", "secondary");
      const save = button("save", "primary"); save.root.type = "submit";
      editorView.actions.append(cancel.root, save.root);
      this.ui.render(editorView.root, dialog);
      dialog.showModal(); editorView.name.focus(); editorView.name.select();
    };
    const restoreTrigger = () => {
      if (!trigger || destroyed) return;
      content.querySelector(`[data-team="${trigger.number}"] [data-action="${trigger.action}"]`)?.focus();
      trigger = null;
    };
    const closeEditor = () => {
      draft = null; editorView = null;
      if (dialog?.open) dialog.close();
    };

    /**
     * Detach owned listeners/timers and release views, restoring callbacks on externally supplied accessors.
     * Wait for an active action; an HTTP write already sent to the server cannot be undone here.
     */
    this.destroy = async () => {
      destroyed = true; ++readVersion;
      life.abort(); clearInterval(refreshTimer); clearTimeout(debounceTimer);
      if (store?.parent === this) store.close?.();
      try { await active; } catch { /* Original caller receives the save error. */ }
      teamViews.clear(); memberViews.clear();
      closeEditor(); this.element.replaceChildren();
    };

    /**
     * Public data shapes. Member metadata is a snapshot taken when joining or switching.
     * @typedef {Object} Member
     * @property {string} id Account identity as realm:key; unique across the whole formation.
     * @property {string} name Display name, independent of the stable identity.
     * @property {string} [picture] Reusable HTTP(S) URL or raster image data URL.
     */

    /**
     * @typedef {Object} Team
     * @property {string|null} name Stored name; null uses the configured name or numbered fallback.
     * @property {Member[]} members Real members only; empty seat placeholders are never stored.
     */

    /**
     * @typedef {Object} Formation
     * @property {string|string[]} key CCM dataset key.
     * @property {number} schema Supported format version: 1.
     * @property {number} revision Number of changes applied by this component; not the comparison condition.
     * @property {Team[]} teams Array position defines the stable team number; empty entries are retained.
     * @property {string} [mutation] ID of the last action written through mutate().
     * @property {Object} [_] CCM ownership and access metadata, preserved on subsequent writes.
     */

    // Pure domain operations: no DOM, datastore, authentication or locking. Callers supply validated data
    // and a complete configuration (defaults plus overrides), as prepared by the component's init().

    /** @returns {Formation} Unsaved empty formation; creating this object does not create a datastore entry. */
    function emptyState(key) { return { key, schema: 1, revision: 0, teams: [] }; }
    /** Resolve a 1-based team's display name: stored value, configured preset, then numbered label. */
    function teamName(team, number, config) {
      return team?.name ?? config.teamNames[number - 1] ?? format(config.labels.team, { number });
    }
    /** @returns {number|null} 1-based membership position, or null for an absent user/dataset. */
    function memberTeam(state, id) {
      const index = state?.teams.findIndex(team => team.members.some(member => member.id === id)) ?? -1;
      return index < 0 ? null : index + 1;
    }
    /** Explicit per-team false is an override too; omitted flags inherit the global rule. */
    function rules(config, number) {
      const override = config.teamOverrides[number - 1] ?? {};
      return Object.fromEntries(["editable", "joinable", "leavable"].map(key => [key, override[key] ?? config[key]]));
    }
    /** Derive visible slots and effective rules; borrow member arrays internally, copy only in public getTeams(). */
    function visibleTeams(state, config) {
      const last = state.teams.findLastIndex(team => team.members.length > 0);
      // Reuse empty trailing places, retain occupied teams beyond a subsequently reduced limit.
      const count = Math.max(last + 1, Math.min(last + 2, config.maxTeams || Infinity));
      return Array.from({ length: count }, (_, index) => ({
        number: index + 1, name: teamName(state.teams[index], index + 1, config),
        members: state.teams[index]?.members ?? [], ...rules(config, index + 1),
      }));
    }
    /**
     * Apply one intent to a fresh snapshot without modifying the inputs. Transport retries belong in mutate().
     * @param {Formation} state Validated dataset, or emptyState(key) if it does not exist yet.
     * @param {Object} command Original user intent, including its preconditions before any retry.
     * @param {"join"|"leave"|"rename"} command.type Action; a join also covers a direct team switch.
     * @param {number|null} command.from Membership when the action began; rejects conflicting moves in another tab.
     * @param {number} [command.number] 1-based target for joining or renaming.
     * @param {string} [command.name] Proposed name for a rename.
     * @param {string} [command.expectedName] Display name when editing began; required for a changed name.
     * @param {Member} actor Authenticated actor's public display metadata, prepared by the caller.
     * @param {Object} config Complete component options, including defaults.
     * @returns {Formation|null} New snapshot with revision incremented once, or null if already satisfied.
     * @throws {Error} Domain failures carry a code matching a configurable label; no data is written here.
     */
    function applyAction(state, command, actor, config) {
      const next = structuredClone(state);
      const own = memberTeam(state, actor.id);
      if (command.type === "join" && own === command.number) return null;
      if (command.type === "leave" && !own) return null;
      if (own !== command.from) throw issue("membershipConflict");
      if (command.type === "join") {
        const target = visibleTeams(state, config).find(team => team.number === command.number);
        if (!target || (config.maxTeams && command.number > config.maxTeams)) throw issue("teamMissing");
        if (!target.joinable || (own && (!config.allowSwitch || !rules(config, own).leavable))) throw issue("forbidden");
        if (config.maxMembers && target.members.length >= config.maxMembers) throw issue("teamFull");
        while (next.teams.length < command.number) next.teams.push({ name: null, members: [] });
        if (own) next.teams[own - 1].members = next.teams[own - 1].members.filter(member => member.id !== actor.id);
        next.teams[command.number - 1].members.push(structuredClone(actor));
      } else if (command.type === "leave") {
        if (!rules(config, own).leavable) throw issue("forbidden");
        next.teams[own - 1].members = next.teams[own - 1].members.filter(member => member.id !== actor.id);
      } else if (command.type === "rename") {
        if (own !== command.number || !rules(config, own).editable) throw issue("forbidden");
        const name = typeof command.name === "string" ? command.name.trim() : "";
        if (!name || name.length > config.nameMaxLength) throw issue("invalidName");
        const current = teamName(state.teams[own - 1], own, config);
        if (name === current) return null;
        if (current !== command.expectedName) throw issue("nameConflict");
        next.teams[own - 1].name = name;
      } else throw new Error("Unknown action.");
      next.revision++;
      return next;
    }

    /** Accept null or the supported schema with the expected key and unique identities; reject without repairing data. */
    function validateState(value, key) {
      if (value === null) return;
      if (!value || JSON.stringify(value.key) !== JSON.stringify(key) || value.schema !== 1 ||
          !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.teams)) throw issue("invalidData");
      const users = new Set();
      for (const team of value.teams) {
        if (!team || !(team.name === null || typeof team.name === "string") || !Array.isArray(team.members))
          throw issue("invalidData");
        for (const member of team.members) {
          if (!member || typeof member.id !== "string" || !member.id || typeof member.name !== "string" || users.has(member.id))
            throw issue("invalidData");
          users.add(member.id);
        }
      }
    }

    /** Fail early for invalid limits/rules, before attaching listeners or allowing mutations. */
    function checkConfig(config) {
      for (const key of ["maxMembers", "maxTeams", "refreshInterval"])
        if (!Number.isSafeInteger(config[key]) || config[key] < 0) throw new Error(`${key} must be a non-negative integer.`);
      for (const key of ["nameMaxLength", "retryLimit", "avatarSize"])
        if (!Number.isSafeInteger(config[key]) || config[key] < 1) throw new Error(`${key} must be a positive integer.`);
      if (!Array.isArray(config.teamNames) || config.teamNames.some(name => typeof name !== "string"))
        throw new Error("teamNames must be a string array.");
      if (!Array.isArray(config.teamOverrides)) throw new Error("teamOverrides must be an array.");
      for (const settings of [config, ...config.teamOverrides.filter(Boolean)])
        for (const key of ["editable", "joinable", "leavable"])
          if (settings[key] !== undefined && typeof settings[key] !== "boolean") throw new Error(`${key} must be boolean.`);
    }

    /** Stable machine-readable codes are translated through labels when displayed and passed intact to onerror. */
    function issue(code) { return Object.assign(new Error(code), { code }); }
    function format(value, values) {
      return String(value).replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
    }

    /** Avoid even no-op DOM writes so equal snapshots leave existing nodes, images and focus untouched. */
    function setProperty(element, property, value) {
      if (element[property] !== value) element[property] = value;
    }

    function setAttribute(element, name, value) {
      value = String(value);
      if (element.getAttribute(name) !== value) element.setAttribute(name, value);
    }

    /** Preserve template-specific classes while changing only the component-owned state flags. */
    function setClass(element, name, enabled) {
      if (element.classList.contains(name) !== enabled) element.classList.toggle(name, enabled);
    }

    /**
     * Match an ordered list of existing node references; callers provide each node at most once.
     * Own the parent's entire direct child list: unlisted nodes, including custom wrappers, are removed.
     * Template extensions must live inside a retained child whose contents are not patched as a leaf.
     * Remove obsolete children first to avoid needlessly moving retained nodes past disappearing ones.
     * insertBefore also moves a retained member row from its previous team without recreating it.
     * This compares node identity and order only; renderTeam/renderMember patch the nodes' contents.
     */
    function reconcileChildren(parent, children) {
      const wanted = new Set(children);
      for (const child of [...parent.childNodes]) if (!wanted.has(child)) child.remove();
      let cursor = parent.firstChild; // First child not yet matched; the prefix before it is already correct.
      for (const child of children) {
        if (child === cursor) cursor = cursor.nextSibling;
        else parent.insertBefore(child, cursor);
      }
    }

    function initials(name) { return name.trim().split(/\s+/).slice(0, 2).map(part => [...part][0] ?? "").join("").toUpperCase(); }

    /** Only reusable web URLs and raster data URLs belong in shared member records, never tab-local blob URLs. */
    function pictureURL(value) {
      if (typeof value !== "string") return null;
      if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
      try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
      } catch { return null; }
    }
  },
};
