/**
 * HTML templates for Teambuild, loaded through the component's config.views dependency.
 *
 * Factories receive the instance as app and return one fresh, detached Element synchronously.
 * Treat the optional second argument as read-only; member metadata may reference accepted state.
 * Interpolations run only at creation. renderTeam/renderMember/updateButton in ccm.teambuild.mjs
 * patch later changes through the data-ref elements cached by createView().
 * Preserve required anchors, managed child lists and data-on-* actions (see README: HTML templates).
 * Templates are trusted configuration; interpolate user text normally and reserve ui.raw for trusted icons.
 *
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 */

/** Persistent shell. Keep user empty: its child component is inserted after our events are bound. */
export const main = app => app.ui.html`
  <section class="teambuild">
    <div class="content" data-ref="content">
      <div class="toolbar">
        <div class="totals">
          <span class="stat"><strong data-ref="teamCount"></strong><span data-ref="teamLabel"></span></span>
          <span class="stat"><strong data-ref="peopleCount"></strong><span data-ref="peopleLabel"></span></span>
        </div>
        <div class="sync" data-ref="sync"><span class="sync-mode" data-ref="syncMode"></span></div>
        ${app.user ? app.ui.html`<div class="user-area" data-ref="user"></div>` : null}
      </div>
      <div class="teams" data-ref="grid"></div>
    </div>
    <p class="status" data-ref="status" role="status" aria-live="polite" aria-atomic="true">${app.labels.loading}</p>
    <dialog class="editor" data-ref="dialog" aria-label="${app.labels.editTitle}"
            data-on-cancel="cancelEditor" data-on-close="closedEditor"></dialog>
  </section>
`;

/** Team card for a stable 1-based number; live name, rules and members are supplied by renderTeam. */
export const team = (app, { number }) => app.ui.html`
  <article class="team-card" data-team="${number}">
    <div class="card-top" data-ref="top"><span class="team-number" data-ref="caption"></span><span class="badge" data-ref="badge"></span></div>
    <div class="team-heading" data-ref="heading"><h2 data-ref="title"></h2></div>
    <ul class="members" data-ref="list"></ul>
    <div class="empty-state" data-ref="empty">
      <span class="empty-symbol">+</span><p data-ref="emptyText"></p><p class="empty-hint" data-ref="emptyHint"></p>
    </div>
    <div class="card-footer" data-ref="footer"></div>
  </article>
`;

/** Real member row; Member is a creation-time public snapshot. renderMember patches later metadata. */
export const member = (app, member) => app.ui.html`
  <li class="member" data-member="${member.id}"><span class="avatar" data-ref="avatar" aria-hidden="true"></span><span class="member-name" data-ref="name"></span><span class="you" data-ref="you"></span></li>
`;

/** Presentation-only free seat. The label is patched when labels.emptyMember changes. */
export const seat = app => app.ui.html`
  <li class="member member-empty"><span class="avatar" aria-hidden="true">+</span><span class="member-name" data-ref="label"></span></li>
`;

/** Shared button. The current data-action determines its behavior; icon and label are patched independently. */
export const button = app => app.ui.html`
  <button type="button" class="button" data-on-click="action"><span class="icon" data-ref="icon" aria-hidden="true"></span><span data-ref="label"></span></button>
`;

/** New image for a changed, valid picture URL; an unchanged URL preserves the existing image. */
export const image = app => app.ui.html`<img alt="" loading="lazy" referrerpolicy="no-referrer" data-on-error="imageError">`;

/** Fresh rename form per opening; second argument is the current visible-team descriptor. */
export const editor = (app, team) => app.ui.html`
  <form data-on-submit="saveName">
    <h2>${app.labels.editTitle}</h2><p class="editor-hint">${app.labels.editHint}</p>
    <label class="name-label">${app.labels.name}<input data-ref="name" name="name" value="${team.name}" required maxlength="${app.nameMaxLength}"></label>
    <p class="editor-error" data-ref="error" role="alert"></p>
    <div class="editor-actions" data-ref="actions"></div>
  </form>
`;
