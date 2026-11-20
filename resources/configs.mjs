/**
 * Load a named export with ["ccm.load", "./resources/configs.mjs#demo"].
 * demo uses its own dataset; realtime, manual and frozen share the seminar dataset.
 * Use the same backend URL for authentication and data, and match observe.key to data.key.
 */

/** Shared formation with authenticated users and WebSocket observation. */
export const realtime = {
  maxMembers: 4,
  maxTeams: 6,
  teamNames: ["Ideenwerkstatt", "Perspektivwechsel", "Zukunftslabor"],
  data: {
    key: "seminar",
    store: ["ccm.store", {
      name: "teambuild", url: "http://localhost:8080", observe: { key: "seminar" },
    }],
    permissions: { access: { get: "all", set: "realm", del: "owner" } },
  },
  user: ["ccm.instance", "././libs/user/ccm.user-1.0.0.min.mjs", {
    // Reuse Teambuild's framework instead of loading the User release's older default.
    ccm: "././libs/framework/ccm-29.0.0.min.js",
    url: "http://localhost:8080", realm: "ccm", registration: true,
  }],
};

/** Same persistent data, manual refresh instead of WebSocket observation. */
export const manual = {
  ...realtime,
  data: {
    ...realtime.data,
    store: ["ccm.store", { name: "teambuild", url: "http://localhost:8080" }],
  },
};

/** UI freeze with a first-team exception for joining/leaving; renaming stays locked in every team. */
export const frozen = {
  ...realtime, editable: false, joinable: false, leavable: false,
  teamOverrides: [{ joinable: true, leavable: true }],
};

/** Realtime demo with German labels and a separate dataset; all other options are inherited. */
export const demo = {
  ...realtime,
  labels: ["ccm.load", "././resources/content.mjs#labels.de"],
  data: {
    ...realtime.data,
    key: "demo",
    store: [realtime.data.store[0], {
      ...realtime.data.store[1],
      observe: { ...realtime.data.store[1].observe, key: "demo" },
    }],
  },
};
