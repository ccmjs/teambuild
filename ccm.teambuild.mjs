/**
 * Collaborative team formation with conditional writes and optional live updates.
 *
 * File guide: config describes the public options; Instance owns lifecycle, reads,
 * writes and DOM views. The exported domain helpers below it apply rules without I/O.
 * Local locking and shared datastore subscriptions are handled at the end of the file.
 * A notification requests a full read; only the resulting DOM changes are incremental.
 *
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 * @version 1.0.0
 */
export const component = {
  name: "teambuild",
  ccm: "././libs/framework/ccm-28.0.0.min.js",
  /** Default instance configuration. Optional dependencies and callbacks are shown as commented examples. */
  config: {
    /** Stylesheet dependency loaded by CCM; replace or extend it to customize the instance's appearance. */
    css: ["ccm.load", "././resources/styles.css"],

    /** Shared dataset containing all teams and members of one formation. */
    data: {
      /**
       * CCM datastore dependency or an existing datastore accessor. The default uses in-memory storage.
       * A store with name only uses IndexedDB; name plus url uses the remote CCM server.
       * For realtime updates, add observe: { key: <data.key> } to the remote store configuration.
       * Example: ["ccm.store", { name: "teambuild", url: "https://example.org/api", observe: { key: "teambuild" } }].
       * Remote writes require the server's options.ifMatch support to prevent lost concurrent changes.
       */
      store: ["ccm.store"],
      /** Dataset key shared by all participants; a CCM key string or a compound key array. */
      key: "teambuild",
      /**
       * Metadata copied into the dataset's _ property only when the first participant creates it.
       * The component sets owner to that participant's realm:key; existing permissions are preserved.
       * Pre-create the dataset as a teacher to retain ownership. null omits this metadata on creation.
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
    // user: ["ccm.instance", "././libs/user/ccm.user-1.0.0.min.mjs"],

    /** Maximum members per team: a non-negative integer; 0 means unlimited. Lowering it never removes members. */
    maxMembers: 0,

    /** Maximum number of teams: a non-negative integer; 0 means unlimited. Lowering it retains occupied teams. */
    maxTeams: 0,

    /**
     * Preset team names as a string array; index 0 names team 1. Missing entries use labels.team.
     * Stored member-chosen names take precedence. Preset names alone do not create additional team cards.
     */
    teamNames: [],

    /** Whether members may rename their own team; does not control joining or leaving. Overridable per team. */
    editable: true,

    /** Whether signed-in users may join teams, including the trailing empty team. Overridable per team. */
    joinable: true,

    /** Whether members may leave their current team. Overridable per team. */
    leavable: true,

    /**
     * Per-team rule objects; index 0 applies to team 1. Explicit booleans override the global flags:
     * - editable: allow this team's members to rename it.
     * - joinable: allow joining this team.
     * - leavable: allow leaving this team.
     * Omitted flags inherit their global values. Example: [{ joinable: true, leavable: true }].
     * These are UI rules; server-side write permissions are configured separately in data.permissions.
     */
    teamOverrides: [],

    /**
     * Allow a direct team switch, saved as one atomic change. Requires leavable on the current team
     * and joinable plus a free seat on the target team. false requires leaving before joining another team.
     */
    allowSwitch: true,

    /** Maximum length of a trimmed, edited team name, using JavaScript string length; a positive integer. */
    nameMaxLength: 60,

    /**
     * Maximum thumbnail edge in pixels for a private CCM profile upload copied into a member record.
     * A positive integer; aspect ratio is preserved and smaller images are not enlarged.
     */
    avatarSize: 96,

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

    /**
     * CSS custom-property overrides, omitting the --tb- prefix. An empty object uses the stylesheet defaults.
     * Supported keys in the supplied stylesheet:
     * - accent: primary buttons, live indicator and own-team border; accent-hover: primary button hover color.
     * - background: component and input background; surface: cards, dialogs and secondary buttons.
     * - text: main text color; muted: secondary text color; border: neutral borders and separators.
     * - radius: card/dialog/component corner radius with a CSS unit; font: CSS font-family value.
     * Example: { accent: "#6d28d9", radius: "14px" }. Partial overrides are supported.
     */
    theme: {},

    /** Button icons as trusted inline SVG markup, plain text symbols or an empty string; partial overrides are merged. */
    icons: {
      /** Icon for joining a team when the user has no current team. */
      join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
      /** Icon for leaving the user's current team. */
      leave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4H4v16h5m2-8h10m-4-4 4 4-4 4"/></svg>',
      /** Icon for switching directly from the current team to another team. */
      switch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/></svg>',
      /** Icon for opening the team-name editor; displayed only to members allowed to rename their team. */
      edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m15 5 4 4M4 20l5-1L20 8a3 3 0 0 0-4-4L5 15z"/></svg>',
      /** Refresh/reconnect icon; shown without visible text while live updates work. Empty keeps the text visible. */
      refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 7M4 12l2 7a8 8 0 0 0 13-3"/></svg>',
      /** Icon for saving a team name in the editor. */
      save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 12 4 4L19 6"/></svg>',
      /** Icon for dismissing the team-name editor without saving. */
      cancel: "×",
    },

    /** Interface text, accessible button names and messages. Defaults are German; partial overrides are merged. */
    labels: {
      /** Toolbar noun for zero or multiple occupied teams; empty team slots are not counted. */
      teams: "Teams",
      /** Toolbar noun for zero or multiple members; empty member slots are not counted. */
      people: "Personen",
      /** Toolbar noun for exactly one occupied team. */
      oneTeam: "Team",
      /** Toolbar noun for exactly one member. */
      onePerson: "Person",
      /** Fallback team name when neither a stored nor a preset name exists; {number} is the 1-based team number. */
      team: "Team {number}",
      /** Small caption above each team name; {number} is padded to at least two digits, e.g. 01. */
      teamNumber: "TEAM {number}",
      /** Badge identifying the signed-in user's current team. */
      yourTeam: "Dein Team",
      /** Marker next to the signed-in user's own member entry. */
      you: "Du",
      /** Main empty-state message for an empty team with unlimited capacity. */
      empty: "Hier ist Platz für eure Ideen.",
      /** Supporting invitation below the empty-state message for an unlimited team. */
      emptyHint: "Sei die erste Person in diesem Team.",
      /** Text for each unoccupied member slot when maxMembers is greater than zero. */
      emptyMember: "Freier Platz",
      /** Disabled join/switch button text when the team has reached maxMembers. */
      full: "Team vollständig",
      /** Disabled join/switch button text when joining is forbidden or the team is beyond maxTeams. */
      closed: "Beitritt geschlossen",
      /** Join button text for a signed-in user without a current team. */
      join: "Beitreten",
      /** Button text for leaving the user's current team. */
      leave: "Team verlassen",
      /** Button text for switching directly from the current team to another team. */
      switch: "Hierhin wechseln",
      /** Accessible name and tooltip of the icon button that opens the team-name editor. */
      edit: "Teamname ändern",
      /** Refresh/reconnect button text, accessible name and tooltip; visually hidden during confirmed live updates. */
      refresh: "Aktualisieren",
      /** Button text for saving the edited team name. */
      save: "Speichern",
      /** Button text for dismissing the team-name editor without saving. */
      cancel: "Abbrechen",
      /** Label of the team-name input field. */
      name: "Teamname",
      /** Heading and accessible dialog name of the team-name editor. */
      editTitle: "Gebt eurem Team einen Namen.",
      /** Explanation shown below the team-name editor heading. */
      editHint: "Alle Mitglieder deines Teams können den Namen ändern.",
      /** Toolbar status for server-confirmed live observation with a current dataset. */
      live: "Automatische Updates",
      /** Toolbar status when remote realtime observation is not configured. */
      manual: "Stand manuell aktualisieren",
      /** Toolbar status while establishing a live connection or waiting for subscription acknowledgement. */
      connecting: "Live-Verbindung wird hergestellt …",
      /** Toolbar status when live observation is unavailable or the latest dataset read failed. */
      disconnected: "Live-Updates unterbrochen",
      /** Initial status while loading the team formation. */
      loading: "Teams werden geladen …",
      /** Status while a join, leave, switch or rename action is being processed. */
      saving: "Änderung wird gespeichert …",
      /** Confirmation after a manual refresh or recovery from a failed read. */
      refreshed: "Der Stand ist aktuell.",
      /** Confirmation after joining or switching; {team} is the destination team's current display name. */
      joined: "Du bist jetzt in {team}.",
      /** Confirmation after leaving a team. */
      left: "Du hast das Team verlassen.",
      /** Confirmation after saving a team name. */
      renamed: "Der Teamname wurde gespeichert.",
      /** Fallback error when reading the dataset fails. */
      loadFailed: "Der Stand konnte nicht geladen werden. Bitte aktualisiere die Ansicht.",
      /** Fallback error when a write fails or its completion cannot be confirmed. */
      saveFailed: "Die Speicherung konnte nicht bestätigt werden. Bitte aktualisiere den Stand vor einem neuen Versuch.",
      /** Error when a remote write returns HTTP 400, indicating an unsupported conditional-write request. */
      unsupported: "Der Server unterstützt noch keine sicheren bedingten Schreibzugriffe. Bitte aktualisiere ccm-server.",
      /** Error when retryLimit is exhausted or another action is already running in this instance. */
      conflict: "Es gab viele gleichzeitige Änderungen. Bitte versuche es erneut.",
      /** Error when a team name changed after the user began editing; the local draft remains available. */
      nameConflict: "Der Teamname wurde inzwischen geändert. Prüfe den aktuellen Namen und versuche es erneut.",
      /** Error when the user's membership changed concurrently, for example in another browser tab. */
      membershipConflict: "Deine Teamzuordnung wurde inzwischen geändert. Bitte prüfe den aktuellen Stand.",
      /** Error when an action requires authentication or the signed-in identity changed before the write. */
      loginRequired: "Bitte melde dich zuerst an.",
      /** Error when team rules, switching settings or membership do not permit an action. */
      forbidden: "Diese Änderung ist für dieses Team nicht freigegeben.",
      /** Error when the target team is full when the action is applied to the latest dataset. */
      teamFull: "Der letzte Platz wurde inzwischen vergeben. Bitte wähle ein anderes Team.",
      /** Error when the requested team number is no longer an available team slot. */
      teamMissing: "Dieser Teamplatz ist nicht mehr verfügbar.",
      /** Error for a blank or overlong edited name; {max} is replaced with nameMaxLength. */
      invalidName: "Bitte gib einen Namen mit 1 bis {max} Zeichen ein.",
      /** Error for an unexpected dataset key, schema, team structure or duplicate member identity. */
      invalidData: "Die gespeicherten Teambildungsdaten haben ein unbekanntes oder ungültiges Format.",
      /** Error when a named local store cannot be protected by the browser's Web Locks API. */
      localLock: "Dieser Browser unterstützt keine sicheren parallelen Änderungen an lokalen Daten.",
      /** Error reported by the datastore when live observation fails, such as a rejected subscription. */
      observeFailed: "Live-Updates sind unterbrochen. Du kannst den Stand jederzeit aktualisieren.",
    },

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
  },
  Instance: function () {
    // state is the latest accepted datastore snapshot; null means no dataset exists yet.
    // store is the resolved CCM accessor; source is its connection/storage configuration.
    let state = null, store, source, shell, content, status, dialog, unsubscribe;
    let totals, sync, grid, teamStat, peopleStat, syncMode, refreshButton;
    // Retain cards by 1-based team number and rows by realm:key, even across team switches.
    // Button metadata follows the element's lifetime; render() removes obsolete card/row entries.
    const teamViews = new Map(), memberViews = new Map(), buttonViews = new WeakMap();
    // readVersion invalidates stale responses within this instance; it is not the saved revision.
    // refreshing/active track the current read/write promises; refreshPending coalesces later reads.
    let destroyed = false, initialized = false, readVersion = 0, refreshing, active;
    // The editor owns its input value; draft stores conflict context and trigger restores focus.
    let refreshTimer, debounceTimer, refreshPending = false, draft = null, trigger = null;
    let userListeners, userListener;
    const life = new AbortController();

    /** Public diagnostics: local action in progress, untrusted snapshot, and observation state. Read only. */
    this.gui = { busy: false, stale: false, connection: "disconnected" };

    /** CCM init: normalize partial options and capture dependencies after CCM has resolved them. */
    this.init = async () => {
      // CCM replaces nested configuration objects; restore omitted labels, icons and data defaults.
      this.labels = { ...component.config.labels, ...this.labels };
      this.icons = { ...component.config.icons, ...this.icons };
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
      unsubscribe = observeStore(store, scheduleRefresh, error => {
        this.gui.connection = "disconnected";
        render();
        announce(this.labels.observeFailed, true);
        report(error);
      }, connection => {
        if (destroyed) return;
        this.gui.connection = connection;
        render();
        // Read again after subscription acknowledgement to close any gap during reconnection.
        if (connection === "connected") scheduleRefresh();
      });
      if (this.user?.subscribe) {
        userListener = type => {
          if (destroyed || !["login", "register", "logout", "deleteAccount"].includes(type)) return;
          closeEditor();
          // Observe subscriptions carry their own authentication token; renew it on account changes.
          if (source.url && store.observe) { store.close?.(); store.connect?.(); }
          scheduleRefresh();
          render();
        };
        userListeners = this.user.subscribe(userListener);
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
    this.getTeams = () => teamsFor(state ?? emptyState(this.data.key), this);

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
    function scheduleRefresh() {
      if (destroyed || !initialized) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => thisRefresh(), 40);
    }
    const thisRefresh = () => this.refresh({ silent: true }).catch(() => {});
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
     * Local stores use a shared lock instead of the server's atomic ifMatch check.
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
        return source.url ? work() : localTransaction(store, source, this.data.key, work);
      })();

      try {
        await active;
        this.gui.stale = false;
        if (!destroyed) {
          closeEditor();
          announce(command.type === "join" ? text("joined", { team: teamName(state?.teams[command.number - 1],
            command.number, this) }) : this.labels[command.type === "leave" ? "left" : "renamed"]);
          emit(command.type);
          notifyLocal(store);
        }
      } catch (error) {
        if (!destroyed) {
          announce(message(error, "saveFailed"), true);
          if (draft) {
            // Keep the draft, but use the newly displayed authoritative name for an explicit retry.
            draft.expectedName = teamName(state?.teams[draft.number - 1], draft.number, this);
            const feedback = dialog.querySelector(".editor-error");
            feedback.textContent = message(error, "saveFailed");
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

    /** Create the persistent shell once. Refreshes patch cards without remounting authentication or dialogs. */
    const mount = () => {
      shell = node("section", "teambuild");
      for (const [key, value] of Object.entries(this.theme))
        if (/^[a-z][a-z0-9-]*$/.test(key)) shell.style.setProperty(`--tb-${key}`, String(value));
      // Keep the toolbar and authentication host connected while the team list refreshes.
      const toolbar = node("div", "toolbar");
      totals = node("div", "totals");
      teamStat = stat(0, ""); peopleStat = stat(0, "");
      totals.append(teamStat, peopleStat);
      sync = node("div", "sync");
      syncMode = node("span", "sync-mode");
      refreshButton = button("refresh", () => this.refresh({ reconnect: true }), "secondary");
      sync.append(syncMode, refreshButton);
      toolbar.append(totals, sync);
      if (this.user) {
        const userArea = node("div", "user-area");
        userArea.append(this.user.host);
        toolbar.append(userArea);
      }
      status = node("p", "status", this.labels.loading);
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      content = node("div", "content");
      grid = node("div", "teams");
      content.append(toolbar, grid);
      dialog = node("dialog", "editor");
      dialog.setAttribute("aria-label", this.labels.editTitle);
      dialog.addEventListener("cancel", event => {
        if (this.gui.busy) event.preventDefault(); else { draft = null; }
      });
      dialog.addEventListener("close", () => { draft = null; restoreTrigger(); });
      shell.append(content, status, dialog);
      this.element.replaceChildren(shell);
      render();
    };

    const announce = (value, error = false) => {
      if (!status || destroyed) return;
      setProperty(status, "textContent", String(value));
      if (status.classList.contains("error") !== error) status.classList.toggle("error", error);
    };

    /** Patch a retained button, including its current action; never replace unchanged SVGs or labels. */
    const updateButton = (result, action, className = "", label = this.labels[action]) => {
      const view = buttonViews.get(result);
      setProperty(result, "className", `button ${className}`.trim());
      setAttribute(result, "data-action", action);
      const markup = String(this.icons[action] ?? "");
      if (view.markup !== markup) {
        // Only trusted configuration icons use HTML; team/member names always use textContent.
        if (markup.trim().startsWith("<svg")) view.icon.innerHTML = markup;
        else view.icon.textContent = markup;
        view.markup = markup;
      }
      setProperty(view.label, "textContent", String(label ?? ""));
    };

    const button = (action, handler, className = "", label = this.labels[action]) => {
      const result = node("button");
      result.type = "button";
      const icon = node("span", "icon");
      icon.setAttribute("aria-hidden", "true");
      const caption = node("span");
      result.append(icon, caption);
      buttonViews.set(result, { icon, label: caption });
      updateButton(result, action, className, label);
      result.addEventListener("click", () => { Promise.resolve().then(() => handler(result)).catch(() => {}); });
      return result;
    };

    /** Create a card's DOM references; renderTeam supplies its current content and effective rules. */
    const createTeamView = number => {
      const card = node("article", "team-card"); card.dataset.team = String(number);
      const top = node("div", "card-top"), caption = node("span", "team-number"), badge = node("span", "badge");
      const heading = node("div", "team-heading"), title = node("h2"), list = node("ul", "members");
      const empty = node("div", "empty-state"), emptyText = node("p"), emptyHint = node("p", "empty-hint");
      empty.append(node("span", "empty-symbol", "+"), emptyText, emptyHint);
      const footer = node("div", "card-footer");
      // This handler reads the button's current action instead of capturing an old join/leave state.
      const action = button("join", target => target.dataset.action === "leave" ? this.leave() : this.join(number));
      footer.append(action);
      return { card, top, caption, badge, heading, title, list, empty, emptyText, emptyHint, footer, action, seats: [] };
    };

    /** A member retains its row and avatar even when moving between team lists. */
    const renderMember = (member, actor) => {
      let view = memberViews.get(member.id);
      if (!view) {
        const row = node("li", "member"); row.dataset.member = member.id;
        const avatar = node("span", "avatar"); avatar.setAttribute("aria-hidden", "true");
        const letters = document.createTextNode(""); avatar.append(letters);
        view = { row, avatar, letters, name: node("span", "member-name"), you: node("span", "you"), picture: null };
        memberViews.set(member.id, view);
      }
      setProperty(view.name, "textContent", member.name);
      setProperty(view.letters, "data", initials(member.name));
      setProperty(view.you, "textContent", String(this.labels.you));
      if (view.sourcePicture !== member.picture) {
        view.sourcePicture = member.picture;
        const picture = pictureURL(member.picture);
        if (view.picture !== picture) {
          view.picture = picture;
          view.image?.remove(); view.image = null;
          if (picture) {
            const image = node("img");
            image.alt = ""; image.loading = "lazy"; image.referrerPolicy = "no-referrer";
            image.addEventListener("error", () => image.remove(), { once: true });
            image.src = picture;
            view.image = image; view.avatar.append(image);
          }
        }
      }
      // A failed URL keeps its initials fallback until the URL changes; unrelated updates do not reload it.
      reconcileChildren(view.row, [view.avatar, view.name, ...(member.id === actor?.id ? [view.you] : [])]);
      return view.row;
    };

    /** Patch one card. team is a derived view descriptor; neither it nor the saved members are mutated here. */
    const renderTeam = (view, team, actor, own, seenMembers) => {
      view.team = team;
      const mine = own === team.number;
      setProperty(view.card, "className", `team-card${mine ? " mine" : ""}${!team.members.length ? " empty" : ""}`);
      setProperty(view.caption, "textContent", text("teamNumber", { number: String(team.number).padStart(2, "0") }));
      setProperty(view.badge, "textContent", String(this.labels.yourTeam));
      reconcileChildren(view.top, [view.caption, ...(mine ? [view.badge] : [])]);
      setProperty(view.title, "textContent", team.name);
      const editable = mine && team.editable;
      if (editable) {
        view.edit ??= button("edit", () => openEditor(view.team), "icon-button");
        updateButton(view.edit, "edit", "icon-button");
        setAttribute(view.edit, "aria-label", this.labels.edit);
        setAttribute(view.edit, "title", this.labels.edit);
        setProperty(view.edit, "disabled", this.gui.busy || this.gui.stale);
      }
      reconcileChildren(view.heading, [view.title, ...(editable ? [view.edit] : [])]);
      const rows = team.members.map(member => {
        seenMembers.add(member.id);
        return renderMember(member, actor);
      });
      // Empty seats exist only in the view; maxMembers = 0 creates no placeholders.
      const free = Math.max(0, this.maxMembers - team.members.length);
      while (view.seats.length > free) view.seats.pop().row.remove();
      while (view.seats.length < free) {
        const row = node("li", "member member-empty"), avatar = node("span", "avatar", "+"), label = node("span", "member-name");
        avatar.setAttribute("aria-hidden", "true"); row.append(avatar, label);
        view.seats.push({ row, label });
      }
      for (const seat of view.seats) {
        setProperty(seat.label, "textContent", String(this.labels.emptyMember));
        rows.push(seat.row);
      }
      reconcileChildren(view.list, rows);
      setProperty(view.emptyText, "textContent", String(this.labels.empty));
      setProperty(view.emptyHint, "textContent", String(this.labels.emptyHint));
      reconcileChildren(view.card, [view.top, view.heading, rows.length ? view.list : view.empty, view.footer]);

      const full = this.maxMembers > 0 && team.members.length >= this.maxMembers;
      const withinLimit = !this.maxTeams || team.number <= this.maxTeams;
      const canSwitch = !own || (this.allowSwitch && rules(this, own).leavable);
      const action = mine ? "leave" : own ? "switch" : "join";
      const label = mine ? this.labels.leave : full ? this.labels.full
        : !team.joinable || !withinLimit ? this.labels.closed : this.labels[action];
      updateButton(view.action, action, mine ? "secondary" : "primary", label);
      setProperty(view.action, "disabled", this.gui.busy || this.gui.stale || (mine
        ? !team.leavable : !actor || full || !team.joinable || !withinLimit || !canSwitch));
    };

    /** Scan all visible teams, patch differing DOM values and release views no longer present. No datastore I/O. */
    const render = () => {
      if (!content || destroyed) return;
      const focused = this.element.getRootNode().activeElement;
      const focusAction = focused?.dataset?.action;
      const focusTeam = focused?.closest?.("[data-team]")?.dataset.team;
      const actor = identity();
      const own = actor ? memberTeam(state, actor.id) : null;
      const teams = visibleTeams(state ?? emptyState(this.data.key), this);
      const total = teams.reduce((sum, team) => sum + team.members.length, 0);
      const teamCount = teams.filter(team => team.members.length).length;
      setProperty(teamStat.firstChild, "textContent", String(teamCount));
      setProperty(teamStat.lastChild, "textContent", String(this.labels[teamCount === 1 ? "oneTeam" : "teams"]));
      setProperty(peopleStat.firstChild, "textContent", String(total));
      setProperty(peopleStat.lastChild, "textContent", String(this.labels[total === 1 ? "onePerson" : "people"]));
      const realtime = Boolean(source.url && store.observe);
      const live = realtime && this.gui.connection === "connected" && !this.gui.stale;
      const mode = live ? "live" : !realtime ? "manual" : this.gui.connection === "connecting" ? "connecting" : "disconnected";
      setProperty(syncMode, "className", `sync-mode${live ? " live" : ""}`);
      setProperty(syncMode, "textContent", String(this.labels[mode]));
      // Keep a visible label if a custom configuration deliberately removes the refresh icon.
      const iconOnly = live && String(this.icons.refresh ?? "").trim();
      updateButton(refreshButton, "refresh", `secondary${iconOnly ? " icon-button" : ""}`);
      setAttribute(refreshButton, "aria-label", this.labels.refresh);
      setAttribute(refreshButton, "title", this.labels.refresh);
      setProperty(refreshButton, "disabled", this.gui.busy);
      const cards = [], seenMembers = new Set(), seenTeams = new Set();
      for (const team of teams) {
        let view = teamViews.get(team.number);
        if (!view) { view = createTeamView(team.number); teamViews.set(team.number, view); }
        renderTeam(view, team, actor, own, seenMembers);
        cards.push(view.card); seenTeams.add(team.number);
      }
      reconcileChildren(grid, cards);
      for (const [number] of teamViews) if (!seenTeams.has(number)) teamViews.delete(number);
      // Clean up after all cards were processed: a row removed from one team may have moved to another.
      for (const [id, view] of memberViews) if (!seenMembers.has(id)) { view.row.remove(); memberViews.delete(id); }
      setAttribute(content, "aria-busy", String(this.gui.busy));
      for (const control of dialog.querySelectorAll("input, button")) setProperty(control, "disabled", this.gui.busy);
      if (focusAction && !dialog.open && this.element.getRootNode().activeElement !== focused) {
        const root = focusTeam ? content.querySelector(`[data-team="${focusTeam}"]`) : content;
        const target = focused.isConnected ? focused : root?.querySelector(`[data-action="${focusAction}"]`);
        if (target && !target.disabled) target.focus({ preventScroll: true });
      }
    };

    /** Capture the displayed name for conflict detection; incoming updates leave the input value untouched. */
    const openEditor = team => {
      trigger = { number: team.number, action: "edit" };
      draft = { number: team.number, expectedName: team.name };
      const form = node("form");
      form.append(node("h2", "", this.labels.editTitle), node("p", "editor-hint", this.labels.editHint));
      const label = node("label", "name-label", this.labels.name);
      const input = node("input");
      input.name = "name"; input.value = team.name; input.required = true; input.maxLength = this.nameMaxLength;
      label.append(input); form.append(label);
      const feedback = node("p", "editor-error"); feedback.setAttribute("role", "alert"); form.append(feedback);
      const actions = node("div", "editor-actions");
      const cancel = button("cancel", closeEditor, "secondary");
      const save = button("save", () => {}, "primary"); save.type = "submit";
      actions.append(cancel, save); form.append(actions);
      form.addEventListener("submit", async event => {
        event.preventDefault();
        if (this.gui.busy || !form.reportValidity() || !draft) return;
        try { await this.rename(draft.number, input.value, draft.expectedName); }
        catch { /* mutate preserves the form and supplies its accessible error. */ }
      });
      dialog.replaceChildren(form);
      dialog.showModal(); input.focus(); input.select();
    };
    const restoreTrigger = () => {
      if (!trigger || destroyed) return;
      content.querySelector(`[data-team="${trigger.number}"] [data-action="${trigger.action}"]`)?.focus();
      trigger = null;
    };
    const closeEditor = () => {
      draft = null;
      if (dialog?.open) dialog.close();
    };

    /**
     * Detach owned listeners/timers and release views, keeping externally shared accessors usable.
     * Wait for an active action; an HTTP write already sent to the server cannot be undone here.
     */
    this.destroy = async () => {
      destroyed = true; ++readVersion;
      life.abort(); clearInterval(refreshTimer); clearTimeout(debounceTimer);
      unsubscribe?.(); userListeners?.delete?.(userListener);
      if (store?.parent === this && !observers.has(store)) store.close?.();
      try { await active; } catch { /* Original caller receives the save error. */ }
      teamViews.clear(); memberViews.clear();
      closeEditor(); this.element.replaceChildren();
    };
  },
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
export function emptyState(key) { return { key, schema: 1, revision: 0, teams: [] }; }
/** Resolve a 1-based team's display name: stored value, configured preset, then numbered label. */
export function teamName(team, number, config) {
  return team?.name ?? config.teamNames[number - 1] ?? format(config.labels.team, { number });
}
/** @returns {number|null} 1-based membership position, or null for an absent user/dataset. */
export function memberTeam(state, id) {
  const index = state?.teams.findIndex(team => team.members.some(member => member.id === id)) ?? -1;
  return index < 0 ? null : index + 1;
}
/** Explicit per-team false is an override too; omitted flags inherit the global rule. */
function rules(config, number) {
  const override = config.teamOverrides[number - 1] ?? {};
  return Object.fromEntries(["editable", "joinable", "leavable"].map(key => [key, override[key] ?? config[key]]));
}
/** Return detached visible-team descriptors: number, resolved name, members and the three effective rules. */
export function teamsFor(state, config) {
  return structuredClone(visibleTeams(state, config));
}
/** Internal view descriptors borrow member arrays; public callers receive detached copies via teamsFor(). */
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
export function applyAction(state, command, actor, config) {
  const next = structuredClone(state);
  const own = memberTeam(state, actor.id);
  if (command.type === "join" && own === command.number) return null;
  if (command.type === "leave" && !own) return null;
  if (own !== command.from) throw issue("membershipConflict");
  if (command.type === "join") {
    const target = teamsFor(state, config).find(team => team.number === command.number);
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
export function validateState(value, key) {
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

function node(tag, className = "", text) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text !== undefined) result.textContent = text;
  return result;
}

/** Avoid even no-op DOM writes so equal snapshots leave existing nodes, images and focus untouched. */
function setProperty(element, property, value) {
  if (element[property] !== value) element[property] = value;
}

function setAttribute(element, name, value) {
  value = String(value);
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/**
 * Match an ordered list of existing node references; callers provide each node at most once.
 * Remove obsolete children first to avoid needlessly moving retained nodes past disappearing ones.
 * insertBefore also moves a retained member row from its previous team without recreating it.
 */
function reconcileChildren(parent, children) {
  const wanted = new Set(children);
  for (const child of [...parent.childNodes]) if (!wanted.has(child)) child.remove();
  let cursor = parent.firstChild;
  for (const child of children) {
    if (child === cursor) cursor = cursor.nextSibling;
    else parent.insertBefore(child, cursor);
  }
}

function stat(count, label) {
  const result = node("span", "stat"); result.append(node("strong", "", count), node("span", "", label)); return result;
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

/** Share local serialization and observation across instances of this component module. */
const localQueues = new WeakMap();

/** Named stores share an origin-wide Web Lock; unnamed in-memory stores queue writes per accessor object. */
async function localTransaction(store, source, key, operation) {
  if (source.name) {
    if (!globalThis.navigator?.locks) throw issue("localLock");
    return navigator.locks.request(`ccm-teambuild:${JSON.stringify([source.name, key])}`, operation);
  }
  const previous = localQueues.get(store) ?? Promise.resolve();
  const result = previous.then(operation);
  const pending = result.catch(() => {}); // A failed action must not block the next; its caller still receives result's rejection.
  localQueues.set(store, pending);
  try { return await result; }
  finally { if (localQueues.get(store) === pending) localQueues.delete(store); }
}

const observers = new WeakMap();

/** Multiplex CCM's single callback slots for shared accessors; return cleanup for just this instance. */
function observeStore(store, changed, failed, connectionChanged) {
  let entry = observers.get(store);
  if (!entry) {
    const previous = store.onchange;
    const previousError = store.onerror;
    const previousConnection = store.onconnectionchange;
    entry = { listeners: new Set(), previous, previousError, previousConnection };
    entry.change = async value => {
      for (const listener of entry.listeners) listener.changed(value);
      // Replace CCM's automatic parent.start callback with our debounced read; preserve custom callbacks.
      if (previous && previous !== store.parent?.start) await previous(value);
    };
    entry.error = async error => {
      for (const listener of entry.listeners) listener.failed(error);
      if (previousError) await previousError(error);
    };
    entry.connection = async state => {
      for (const listener of entry.listeners) listener.connectionChanged(state);
      if (previousConnection) await previousConnection(state);
    };
    store.onchange = entry.change; store.onerror = entry.error; store.onconnectionchange = entry.connection;
    observers.set(store, entry);
  }
  const listener = { changed, failed, connectionChanged }; entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size) return;
    // Restore only slots still owned by this wrapper; an embedding app may have replaced a callback.
    if (store.onchange === entry.change) store.onchange = entry.previous;
    if (store.onerror === entry.error) store.onerror = entry.previousError;
    if (store.onconnectionchange === entry.connection) store.onconnectionchange = entry.previousConnection;
    observers.delete(store);
  };
}

/** Notify sibling instances sharing this local accessor; remote notifications come from the server. */
function notifyLocal(store) {
  if (store.source().url) return;
  for (const listener of observers.get(store)?.listeners ?? []) listener.changed();
}
