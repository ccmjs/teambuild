/**
 * Load a named export with ["ccm.load", "./resources/configs.mjs#demo"].
 * demo uses its own dataset; realtime, manual and frozen share the seminar dataset.
 * Use the same backend URL for authentication and data, and match observe.key to data.key.
 */

/** Persistent shared demo with authentication and WebSocket observation through the local CCM server. */
export const demo = {
  maxMembers: 4,
  maxTeams: 6,
  teamNames: ["Ideenwerkstatt", "Perspektivwechsel", "Zukunftslabor"],
  user: ["ccm.instance", "././libs/user/ccm.user-1.0.0.min.mjs", {
    url: "http://localhost:8080", realm: "ccm", registration: true,
  }],
  data: {
    key: "demo",
    store: ["ccm.store", {
      name: "teambuild", url: "http://localhost:8080", observe: { key: "demo" },
    }],
    permissions: { access: { get: "all", set: "realm", del: "owner" } },
  },
};

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
