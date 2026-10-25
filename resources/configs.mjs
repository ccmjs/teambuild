/** A server-free, read-only preview. Authentication is deliberately optional. */
export const demo = {
  maxMembers: 4,
  maxTeams: 6,
  teamNames: ["Ideenwerkstatt", "Perspektivwechsel", "Zukunftslabor"],
  data: {
    key: "demo",
    store: ["ccm.store", { datasets: [{
      key: "demo", schema: 1, revision: 0,
      teams: [
        { name: null, members: [
          { id: "demo:lea", name: "Lea Sommer" },
          { id: "demo:noah", name: "Noah Weber" },
          { id: "demo:mila", name: "Mila Fischer" },
        ] },
        { name: null, members: [
          { id: "demo:emil", name: "Emil Hoffmann" },
          { id: "demo:ada", name: "Ada Nguyen" },
        ] },
      ],
    }] }],
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

/** Global freeze with a higher-priority exception for the first team. */
export const frozen = {
  ...realtime, editable: false, joinable: false, leavable: false,
  teamOverrides: [{ joinable: true, leavable: true }],
};
