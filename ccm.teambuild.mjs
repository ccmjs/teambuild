/**
 * Collaborative team formation with conditional writes and optional live updates.
 *
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 * @version 1.0.0
 */
export const component = {
  name: "teambuild",
  ccm: "././libs/framework/ccm-28.0.0.min.js",
  config: {
    css: ["ccm.load", "././resources/styles.css"],
    /** One dataset per formation. Remote writes require ccm-server's options.ifMatch support. */
    data: {
      store: ["ccm.store"],
      key: "teambuild",
      /** Applied only on creation; pre-create the dataset to make the teacher its owner. */
      permissions: { access: { get: "all", set: "realm", del: "owner" } },
    },
    // user: ["ccm.instance", "././libs/user/ccm.user-1.0.0.min.mjs"],
    /** Zero means unlimited. Existing members are never removed when a limit is reduced. */
    maxMembers: 0,
    maxTeams: 0,
    teamNames: [],
    editable: true,
    joinable: true,
    leavable: true,
    /** Index 0 overrides team 1. Omitted flags inherit their global setting. */
    teamOverrides: [],
    allowSwitch: true,
    nameMaxLength: 60,
    /** Background reconciliation when observe is enabled, including after a missed WebSocket event. */
    refreshInterval: 30000,
    retryLimit: 12,
    title: "Gemeinsam geht mehr.",
    description: "Finde dein Team und gestaltet gemeinsam, was als Nächstes kommt.",
    /** CSS custom properties without the --tb- prefix, e.g. { accent: '#6d28d9' }. */
    theme: {},
    /** Icons may be trusted SVG markup, a text symbol, or an empty string. */
    icons: {
      join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
      leave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 4H4v16h5m2-8h10m-4-4 4 4-4 4"/></svg>',
      switch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/></svg>',
      edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m15 5 4 4M4 20l5-1L20 8a3 3 0 0 0-4-4L5 15z"/></svg>',
      refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 7M4 12l2 7a8 8 0 0 0 13-3"/></svg>',
      save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 12 4 4L19 6"/></svg>',
      cancel: "×",
    },
    labels: {
      eyebrow: "TEAM FINDEN · ZUSAMMEN STARTEN",
      teams: "Teams", people: "Personen", oneTeam: "Team", onePerson: "Person", team: "Team {number}",
      teamNumber: "TEAM {number}", yourTeam: "Dein Team", you: "Du",
      empty: "Hier ist Platz für eure Ideen.", emptyHint: "Sei die erste Person in diesem Team.",
      members: "{count} Mitglieder", capacity: "{count} von {max} Plätzen", free: "{count} Plätze frei",
      oneMember: "1 Mitglied", oneFree: "1 Platz frei",
      unlimited: "Platz für alle", full: "Team vollständig", closed: "Beitritt geschlossen",
      join: "Beitreten", leave: "Team verlassen", switch: "Hierhin wechseln",
      edit: "Teamname ändern", refresh: "Aktualisieren", save: "Speichern", cancel: "Abbrechen",
      name: "Teamname", editTitle: "Gebt eurem Team einen Namen.",
      editHint: "Alle Mitglieder deines Teams können den Namen ändern.",
      readOnly: "Du siehst den aktuellen Stand der Teambildung.",
      signIn: "Melde dich oben an, um einem Team beizutreten.",
      assigned: "Du bist in {team}.", unassigned: "Dein Platz im Team wartet auf dich.",
      live: "Automatische Updates", manual: "Stand manuell aktualisieren",
      loading: "Teams werden geladen …", saving: "Änderung wird gespeichert …",
      refreshed: "Der Stand ist aktuell.", joined: "Du bist jetzt in {team}.",
      left: "Du hast das Team verlassen.", renamed: "Der Teamname wurde gespeichert.",
      loadFailed: "Der Stand konnte nicht geladen werden. Bitte aktualisiere die Ansicht.",
      saveFailed: "Die Speicherung konnte nicht bestätigt werden. Bitte aktualisiere den Stand vor einem neuen Versuch.",
      unsupported: "Der Server unterstützt noch keine sicheren bedingten Schreibzugriffe. Bitte aktualisiere ccm-server.",
      conflict: "Es gab viele gleichzeitige Änderungen. Bitte versuche es erneut.",
      nameConflict: "Der Teamname wurde inzwischen geändert. Prüfe den aktuellen Namen und versuche es erneut.",
      membershipConflict: "Deine Teamzuordnung wurde inzwischen geändert. Bitte prüfe den aktuellen Stand.",
      loginRequired: "Bitte melde dich zuerst an.", forbidden: "Diese Änderung ist für dieses Team nicht freigegeben.",
      teamFull: "Der letzte Platz wurde inzwischen vergeben. Bitte wähle ein anderes Team.",
      teamMissing: "Dieser Teamplatz ist nicht mehr verfügbar.",
      invalidName: "Bitte gib einen Namen mit 1 bis {max} Zeichen ein.",
      invalidData: "Die gespeicherten Teambildungsdaten haben ein unbekanntes oder ungültiges Format.",
      localLock: "Dieser Browser unterstützt keine sicheren parallelen Änderungen an lokalen Daten.",
      observeFailed: "Live-Updates sind unterbrochen. Du kannst den Stand jederzeit aktualisieren.",
    },
    /** Optional callbacks: onchange({ app, type, value }), onerror({ app, error }). */
  },
  Instance: function () {
    let state = null, store, source, shell, content, status, dialog, unsubscribe;
    let destroyed = false, initialized = false, readVersion = 0, refreshing, active;
    let refreshTimer, debounceTimer, refreshPending = false, draft = null, trigger = null;
    let userListeners, userListener;
    const life = new AbortController();
    this.gui = { busy: false, stale: false };

    this.init = async () => {
      // CCM replaces nested configuration objects; accept partial text/icon/theme overrides.
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

    this.ready = async () => {
      unsubscribe = observeStore(store, scheduleRefresh, error => {
        announce(this.labels.observeFailed, true);
        report(error);
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

    /** Authoritative reads are serialized; late responses cannot roll back a completed mutation. */
    this.refresh = async ({ silent = false } = {}) => {
      if (destroyed) return;
      // CCM reconnects once automatically; a later reconciliation can re-establish observation.
      if (source.url && store.observe) store.connect?.();
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
          if (!silent || recovered) announce(this.labels.refreshed);
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

    /** Detached, complete dataset for embedding applications; never exposes tokens. */
    this.getValue = () => structuredClone(state ?? emptyState(this.data.key));
    /** Public team numbers are 1-based, like their visible labels. */
    this.getTeams = () => teamsFor(this.getValue(), this);
    this.join = number => mutate({ type: "join", number });
    this.leave = () => mutate({ type: "leave" });
    this.rename = (number, name, expectedName) => mutate({ type: "rename", number, name, expectedName });

    const identity = () => {
      if (!this.user?.isLoggedIn()) return null;
      const user = this.user.getState();
      if (!user?.realm || !user.key) return null;
      return { id: `${user.realm}:${user.key}`, name: String(user.user || user.key) };
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
    function scheduleRefresh() {
      if (destroyed || !initialized) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => thisRefresh(), 40);
    }
    const thisRefresh = () => this.refresh({ silent: true }).catch(() => {});
    const drainRefresh = () => {
      if (refreshPending && !destroyed && !this.gui.busy && !refreshing) {
        refreshPending = false;
        scheduleRefresh();
      }
    };

    const mutate = async command => {
      if (destroyed) throw new Error("Instance has been destroyed.");
      if (this.gui.busy) throw issue("conflict");
      const actor = identity();
      if (!actor) throw issue("loginRequired");
      command.from = memberTeam(state, actor.id);
      if (command.type === "rename" && command.expectedName === undefined)
        command.expectedName = teamName(state?.teams[command.number - 1], command.number, this);
      const mutation = crypto.randomUUID();
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
      active = source.url ? work() : localTransaction(store, source, this.data.key, work);
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

    const mount = () => {
      shell = node("section", "teambuild");
      for (const [key, value] of Object.entries(this.theme))
        if (/^[a-z][a-z0-9-]*$/.test(key)) shell.style.setProperty(`--tb-${key}`, String(value));
      const header = node("header", "topbar");
      header.append(node("span", "eyebrow", this.labels.eyebrow));
      if (this.user) {
        const userArea = node("div", "user-area");
        userArea.append(this.user.host);
        header.append(userArea);
      }
      const intro = node("div", "intro");
      intro.append(node("h1", "", this.title), node("p", "description", this.description));
      status = node("p", "status", this.labels.loading);
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      content = node("div", "content");
      dialog = node("dialog", "editor");
      dialog.setAttribute("aria-label", this.labels.editTitle);
      dialog.addEventListener("cancel", event => {
        if (this.gui.busy) event.preventDefault(); else { draft = null; }
      });
      dialog.addEventListener("close", () => { draft = null; restoreTrigger(); });
      shell.append(header, intro, content, status, dialog);
      this.element.replaceChildren(shell);
      render();
    };
    const announce = (value, error = false) => {
      if (!status || destroyed) return;
      status.textContent = value;
      status.classList.toggle("error", error);
    };
    const button = (action, handler, className = "", label = this.labels[action]) => {
      const result = node("button", `button ${className}`);
      result.type = "button";
      result.dataset.action = action;
      const icon = node("span", "icon");
      icon.setAttribute("aria-hidden", "true");
      if (String(this.icons[action] ?? "").trim().startsWith("<svg")) icon.innerHTML = this.icons[action];
      else icon.textContent = this.icons[action] ?? "";
      result.append(icon, node("span", "", label));
      result.addEventListener("click", () => { Promise.resolve().then(() => handler(result)).catch(() => {}); });
      return result;
    };
    const render = () => {
      if (!content || destroyed) return;
      const focused = this.element.getRootNode().activeElement;
      const focusAction = focused?.dataset?.action;
      const focusTeam = focused?.closest?.("[data-team]")?.dataset.team;
      const actor = identity();
      const own = actor ? memberTeam(state, actor.id) : null;
      const teams = teamsFor(state ?? emptyState(this.data.key), this);
      const total = teams.reduce((sum, team) => sum + team.members.length, 0);
      const toolbar = node("div", "toolbar");
      const totals = node("div", "totals");
      const teamCount = teams.filter(team => team.members.length).length;
      totals.append(stat(teamCount, this.labels[teamCount === 1 ? "oneTeam" : "teams"]),
        stat(total, this.labels[total === 1 ? "onePerson" : "people"]));
      const sync = node("div", "sync");
      sync.append(node("span", store.observe ? "sync-mode live" : "sync-mode", this.labels[store.observe ? "live" : "manual"]));
      sync.append(button("refresh", () => this.refresh(), "secondary"));
      toolbar.append(totals, sync);
      const note = node("p", "membership", !this.user ? this.labels.readOnly : !actor ? this.labels.signIn : own
        ? text("assigned", { team: teamName(state.teams[own - 1], own, this) }) : this.labels.unassigned);
      const grid = node("div", "teams");
      for (const team of teams) {
        const mine = own === team.number;
        const card = node("article", `team-card${mine ? " mine" : ""}${!team.members.length ? " empty" : ""}`);
        card.dataset.team = String(team.number);
        const top = node("div", "card-top");
        top.append(node("span", "team-number", text("teamNumber", { number: String(team.number).padStart(2, "0") })));
        if (mine) top.append(node("span", "badge", this.labels.yourTeam));
        card.append(top);
        const heading = node("div", "team-heading");
        heading.append(node("h2", "", team.name));
        if (mine && team.editable) {
          const edit = button("edit", target => openEditor(team, target), "icon-button");
          edit.setAttribute("aria-label", this.labels.edit);
          edit.title = this.labels.edit;
          heading.append(edit);
        }
        card.append(heading);
        const capacity = this.maxMembers
          ? text("capacity", { count: team.members.length, max: this.maxMembers })
          : team.members.length === 1 ? this.labels.oneMember : text("members", { count: team.members.length });
        card.append(node("p", "capacity", capacity));
        if (this.maxMembers) {
          const meter = node("div", "capacity-bar");
          const fill = node("span");
          fill.style.width = `${Math.min(100, team.members.length / this.maxMembers * 100)}%`;
          meter.append(fill); card.append(meter);
        }
        const list = node("ul", "members");
        for (const member of team.members) {
          const row = node("li", "member");
          const avatar = node("span", "avatar", initials(member.name));
          avatar.setAttribute("aria-hidden", "true");
          row.append(avatar, node("span", "member-name", member.name));
          if (member.id === actor?.id) row.append(node("span", "you", this.labels.you));
          list.append(row);
        }
        if (team.members.length) card.append(list);
        else {
          const empty = node("div", "empty-state");
          empty.append(node("span", "empty-symbol", "+"), node("p", "", this.labels.empty),
            node("p", "empty-hint", this.labels.emptyHint));
          card.append(empty);
        }
        const footer = node("div", "card-footer");
        const full = this.maxMembers > 0 && team.members.length >= this.maxMembers;
        const withinLimit = !this.maxTeams || team.number <= this.maxTeams;
        const canSwitch = !own || (this.allowSwitch && rules(this, own).leavable);
        if (mine) {
          const leave = button("leave", () => this.leave(), "secondary");
          leave.disabled = !team.leavable; footer.append(leave);
        } else {
          const join = button(own ? "switch" : "join", () => this.join(team.number), "primary",
            full ? this.labels.full : !team.joinable || !withinLimit ? this.labels.closed : this.labels[own ? "switch" : "join"]);
          join.disabled = !actor || full || !team.joinable || !withinLimit || !canSwitch;
          footer.append(join);
        }
        footer.append(node("span", "availability", full ? this.labels.full : this.maxMembers
          ? this.maxMembers - team.members.length === 1 ? this.labels.oneFree
            : text("free", { count: Math.max(0, this.maxMembers - team.members.length) }) : this.labels.unlimited));
        card.append(footer);
        grid.append(card);
      }
      content.replaceChildren(toolbar, note, grid);
      content.setAttribute("aria-busy", String(this.gui.busy));
      for (const control of content.querySelectorAll("button"))
        if (this.gui.busy || (this.gui.stale && control.dataset.action !== "refresh")) control.disabled = true;
      for (const control of dialog.querySelectorAll("input, button")) control.disabled = this.gui.busy;
      if (focusAction && !dialog.open) {
        const root = focusTeam ? content.querySelector(`[data-team="${focusTeam}"]`) : content;
        const target = root?.querySelector(`[data-action="${focusAction}"]`);
        if (target && !target.disabled) target.focus({ preventScroll: true });
      }
    };
    const openEditor = (team, target) => {
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

    /** Detach only listeners owned by this instance, keeping shared datastore accessors usable. */
    this.destroy = async () => {
      destroyed = true; ++readVersion;
      life.abort(); clearInterval(refreshTimer); clearTimeout(debounceTimer);
      unsubscribe?.(); userListeners?.delete?.(userListener);
      if (store?.parent === this && !observers.has(store)) store.close?.();
      try { await active; } catch { /* Original caller receives the save error. */ }
      closeEditor(); this.element.replaceChildren();
    };
  },
};

/** Pure domain operations, also available to custom editors and embedding applications. */
export function emptyState(key) { return { key, schema: 1, revision: 0, teams: [] }; }
export function teamName(team, number, config) {
  return team?.name ?? config.teamNames[number - 1] ?? format(config.labels.team, { number });
}
export function memberTeam(state, id) {
  const index = state?.teams.findIndex(team => team.members.some(member => member.id === id)) ?? -1;
  return index < 0 ? null : index + 1;
}
function rules(config, number) {
  const override = config.teamOverrides[number - 1] ?? {};
  return Object.fromEntries(["editable", "joinable", "leavable"].map(key => [key, override[key] ?? config[key]]));
}
export function teamsFor(state, config) {
  const last = state.teams.findLastIndex(team => team.members.length > 0);
  // Reuse empty trailing places, retain occupied teams beyond a subsequently reduced limit.
  const count = Math.max(last + 1, Math.min(last + 2, config.maxTeams || Infinity));
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1, name: teamName(state.teams[index], index + 1, config),
    members: structuredClone(state.teams[index]?.members ?? []), ...rules(config, index + 1),
  }));
}
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
function checkConfig(config) {
  for (const key of ["maxMembers", "maxTeams", "refreshInterval"])
    if (!Number.isSafeInteger(config[key]) || config[key] < 0) throw new Error(`${key} must be a non-negative integer.`);
  for (const key of ["nameMaxLength", "retryLimit"])
    if (!Number.isSafeInteger(config[key]) || config[key] < 1) throw new Error(`${key} must be a positive integer.`);
  if (!Array.isArray(config.teamNames) || config.teamNames.some(name => typeof name !== "string"))
    throw new Error("teamNames must be a string array.");
  if (!Array.isArray(config.teamOverrides)) throw new Error("teamOverrides must be an array.");
  for (const settings of [config, ...config.teamOverrides.filter(Boolean)])
    for (const key of ["editable", "joinable", "leavable"])
      if (settings[key] !== undefined && typeof settings[key] !== "boolean") throw new Error(`${key} must be boolean.`);
}
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
function stat(count, label) {
  const result = node("span", "stat"); result.append(node("strong", "", count), node("span", "", label)); return result;
}
function initials(name) { return name.trim().split(/\s+/).slice(0, 2).map(part => [...part][0] ?? "").join("").toUpperCase(); }

/** Share local serialization and observation across instances of this component module. */
const localQueues = new WeakMap();
async function localTransaction(store, source, key, operation) {
  if (source.name) {
    if (!globalThis.navigator?.locks) throw issue("localLock");
    return navigator.locks.request(`ccm-teambuild:${JSON.stringify([source.name, key])}`, operation);
  }
  const previous = localQueues.get(store) ?? Promise.resolve();
  const result = previous.then(operation);
  const pending = result.catch(() => {});
  localQueues.set(store, pending);
  try { return await result; }
  finally { if (localQueues.get(store) === pending) localQueues.delete(store); }
}
const observers = new WeakMap();
function observeStore(store, changed, failed) {
  let entry = observers.get(store);
  if (!entry) {
    const previous = store.onchange;
    const previousError = store.onerror;
    entry = { listeners: new Set(), previous, previousError };
    entry.change = async value => {
      for (const listener of entry.listeners) listener.changed(value);
      if (previous && previous !== store.parent?.start) await previous(value);
    };
    entry.error = async error => {
      for (const listener of entry.listeners) listener.failed(error);
      if (previousError) await previousError(error);
    };
    store.onchange = entry.change; store.onerror = entry.error;
    observers.set(store, entry);
  }
  const listener = { changed, failed }; entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size) return;
    if (store.onchange === entry.change) store.onchange = entry.previous;
    if (store.onerror === entry.error) store.onerror = entry.previousError;
    observers.delete(store);
  };
}
function notifyLocal(store) {
  if (store.source().url) return;
  for (const listener of observers.get(store)?.listeners ?? []) listener.changed();
}
