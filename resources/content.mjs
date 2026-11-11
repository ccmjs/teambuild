/**
 * Default interface content for Teambuild.
 *
 * config.labels selects labels.en or labels.de through ccm.load; config.icons loads the shared icons.
 * Each instance merges overrides over the English defaults; both supplied language maps are complete.
 * Labels are plain text, including accessible names and messages. Keep their documented placeholders.
 * Icons accept trusted SVG markup, text symbols or an empty string; never insert user-provided markup.
 * HTML structure lives in views.mjs; the component patches changed text and icons in retained views.
 *
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 */

/** Complete language maps; load #labels.en (default) or #labels.de (demo). */
export const labels = {
  /** English interface text, accessible names and status/error messages. */
  en: {
    /** Toolbar noun for zero or multiple occupied teams; empty team slots are not counted. */
    teams: "Teams",
    /** Toolbar noun for zero or multiple members; empty member slots are not counted. */
    people: "People",
    /** Toolbar noun for exactly one occupied team. */
    oneTeam: "Team",
    /** Toolbar noun for exactly one member. */
    onePerson: "Person",
    /** Fallback team name when neither a stored nor a preset name exists; {number} is the 1-based team number. */
    team: "Team {number}",
    /** Small caption above each team name; {number} is padded to at least two digits, e.g. 01. */
    teamNumber: "TEAM {number}",
    /** Badge identifying the signed-in user's current team. */
    yourTeam: "Your team",
    /** Marker next to the signed-in user's own member entry. */
    you: "You",
    /** Main empty-state message for an empty team with unlimited capacity. */
    empty: "There's room for your ideas here.",
    /** Supporting invitation below the empty-state message for an unlimited team. */
    emptyHint: "Be the first person to join this team.",
    /** Text for each unoccupied member slot when maxMembers is greater than zero. */
    emptyMember: "Available spot",
    /** Disabled join/switch button text when the team has reached maxMembers. */
    full: "Team full",
    /** Disabled join/switch button text when joining is forbidden or the team is beyond maxTeams. */
    closed: "Joining closed",
    /** Join button text for a signed-in user without a current team. */
    join: "Join",
    /** Button text for leaving the user's current team. */
    leave: "Leave team",
    /** Button text for switching directly from the current team to another team. */
    switch: "Switch to this team",
    /** Accessible name and tooltip of the icon button that opens the team-name editor. */
    edit: "Rename team",
    /** Refresh/reconnect button text, accessible name and tooltip; visually hidden during confirmed live updates. */
    refresh: "Refresh",
    /** Button text for saving the edited team name. */
    save: "Save",
    /** Button text for dismissing the team-name editor without saving. */
    cancel: "Cancel",
    /** Label of the team-name input field. */
    name: "Team name",
    /** Heading and accessible dialog name of the team-name editor. */
    editTitle: "Give your team a name.",
    /** Explanation shown below the team-name editor heading. */
    editHint: "Any member of your team can change its name.",
    /** Toolbar status for server-confirmed live observation with a current dataset. */
    live: "Live updates",
    /** Toolbar status when remote realtime observation is not configured. */
    manual: "Refresh manually",
    /** Toolbar status while establishing a live connection or waiting for subscription acknowledgement. */
    connecting: "Connecting to live updates …",
    /** Toolbar status when live observation is unavailable or the latest dataset read failed. */
    disconnected: "Live updates interrupted",
    /** Initial status while loading the team formation. */
    loading: "Loading teams …",
    /** Status while a join, leave, switch or rename action is being processed. */
    saving: "Saving change …",
    /** Confirmation after a manual refresh or recovery from a failed read. */
    refreshed: "Teams are up to date.",
    /** Confirmation after joining or switching; {team} is the destination team's current display name. */
    joined: "You have joined {team}.",
    /** Confirmation after leaving a team. */
    left: "You have left the team.",
    /** Confirmation after saving a team name. */
    renamed: "The team name has been saved.",
    /** Fallback error when reading the dataset fails. */
    loadFailed: "The teams could not be loaded. Please refresh.",
    /** Fallback error when a write fails or its completion cannot be confirmed. */
    saveFailed: "Saving could not be confirmed. Please refresh before trying again.",
    /** Error when a remote write returns HTTP 400, indicating an unsupported conditional-write request. */
    unsupported: "The server does not yet support safe conditional writes. Please update ccm-server.",
    /** Error when retryLimit is exhausted or another action is already running in this instance. */
    conflict: "Too many changes happened at once. Please try again.",
    /** Error when a team name changed after the user began editing; the local draft remains available. */
    nameConflict: "The team name has changed. Review the current name and try again.",
    /** Error when the user's membership changed concurrently, for example in another browser tab. */
    membershipConflict: "Your team membership has changed. Please review the current state.",
    /** Error when an action requires authentication or the signed-in identity changed before the write. */
    loginRequired: "Please sign in first.",
    /** Error when team rules, switching settings or membership do not permit an action. */
    forbidden: "This change is not allowed for this team.",
    /** Error when the target team is full when the action is applied to the latest dataset. */
    teamFull: "The last spot has been taken. Please choose another team.",
    /** Error when the requested team number is no longer an available team slot. */
    teamMissing: "This team slot is no longer available.",
    /** Error for a blank or overlong edited name; {max} is replaced with nameMaxLength. */
    invalidName: "Please enter a name with 1 to {max} characters.",
    /** Error for an unexpected dataset key, schema, team structure or duplicate member identity. */
    invalidData: "The saved team data has an unknown or invalid format.",
    /** Error when a named local store cannot be protected by the browser's Web Locks API. */
    localLock: "This browser does not support safe concurrent changes to local data.",
    /** Error reported by the datastore when live observation fails, such as a rejected subscription. */
    observeFailed: "Live updates are interrupted. You can refresh at any time.",
  },

  /** German translations of the keys documented above; keep keys and placeholders in sync. */
  de: {
    teams: "Teams",
    people: "Personen",
    oneTeam: "Team",
    onePerson: "Person",
    team: "Team {number}",
    teamNumber: "TEAM {number}",
    yourTeam: "Dein Team",
    you: "Du",
    empty: "Hier ist Platz für eure Ideen.",
    emptyHint: "Sei die erste Person in diesem Team.",
    emptyMember: "Freier Platz",
    full: "Team vollständig",
    closed: "Beitritt geschlossen",
    join: "Beitreten",
    leave: "Team verlassen",
    switch: "Hierhin wechseln",
    edit: "Teamname ändern",
    refresh: "Aktualisieren",
    save: "Speichern",
    cancel: "Abbrechen",
    name: "Teamname",
    editTitle: "Gebt eurem Team einen Namen.",
    editHint: "Alle Mitglieder deines Teams können den Namen ändern.",
    live: "Automatische Updates",
    manual: "Stand manuell aktualisieren",
    connecting: "Live-Verbindung wird hergestellt …",
    disconnected: "Live-Updates unterbrochen",
    loading: "Teams werden geladen …",
    saving: "Änderung wird gespeichert …",
    refreshed: "Der Stand ist aktuell.",
    joined: "Du bist jetzt in {team}.",
    left: "Du hast das Team verlassen.",
    renamed: "Der Teamname wurde gespeichert.",
    loadFailed: "Der Stand konnte nicht geladen werden. Bitte aktualisiere die Ansicht.",
    saveFailed: "Die Speicherung konnte nicht bestätigt werden. Bitte aktualisiere den Stand vor einem neuen Versuch.",
    unsupported: "Der Server unterstützt noch keine sicheren bedingten Schreibzugriffe. Bitte aktualisiere ccm-server.",
    conflict: "Es gab viele gleichzeitige Änderungen. Bitte versuche es erneut.",
    nameConflict: "Der Teamname wurde inzwischen geändert. Prüfe den aktuellen Namen und versuche es erneut.",
    membershipConflict: "Deine Teamzuordnung wurde inzwischen geändert. Bitte prüfe den aktuellen Stand.",
    loginRequired: "Bitte melde dich zuerst an.",
    forbidden: "Diese Änderung ist für dieses Team nicht freigegeben.",
    teamFull: "Der letzte Platz wurde inzwischen vergeben. Bitte wähle ein anderes Team.",
    teamMissing: "Dieser Teamplatz ist nicht mehr verfügbar.",
    invalidName: "Bitte gib einen Namen mit 1 bis {max} Zeichen ein.",
    invalidData: "Die gespeicherten Teambildungsdaten haben ein unbekanntes oder ungültiges Format.",
    localLock: "Dieser Browser unterstützt keine sicheren parallelen Änderungen an lokalen Daten.",
    observeFailed: "Live-Updates sind unterbrochen. Du kannst den Stand jederzeit aktualisieren.",
  },
};

/** Button icons; an empty string hides the icon while preserving the button label. */
export const icons = {
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
};
