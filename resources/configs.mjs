/**
 * Load a named export with `["ccm.load", "./resources/configs.mjs#demo"]`.
 * Use the same backend URL for authentication and data, and match `observe.key` to `data.key`.
 */

const server = "https://kless.inf.h-brs.de/api/";

/**
 * English team formation with up to six teams of four. Changes to the demo dataset
 * reach connected participants via WebSocket. Participants can register a CCM
 * account or sign in with their CCM username and password.
 */
export const demo = {
  data: {
    store: ["ccm.store", {
      name: "teambuild", url: server, observe: { key: "demo" },
    }],
    key: "demo",
    permissions: { access: { get: "all", set: "realm", del: "owner" } },
  },
  user: ["ccm.instance", "././libs/user/ccm.user-1.2.0.min.mjs", {
    url: server, realm: "ccm", registration: true,
  }],
  maxTeams: 6,
  maxMembers: 4,
  teamNames: ["Idea Workshop", "New Perspectives", "Future Lab"],
};
