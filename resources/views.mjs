/**
 * HTML templates for Teambuild, loaded through the component's config.views dependency.
 *
 * Factories receive the instance as app and return one fresh, detached Element synchronously.
 * Treat the optional second argument as read-only; member metadata may reference accepted state.
 * Interpolations run only at creation. renderTeam/renderMember/updateButton in ccm.teambuild.mjs
 * patch later changes through the data-ref elements cached by createView().
 * For a new live field, add its anchor here and its cached reference/update in the owning render function.
 * Template interpolation alone does not update a retained view after creation.
 * Preserve required anchors, managed child lists and data-on-* actions (see README: HTML templates).
 * Templates are trusted configuration; interpolate user text normally and reserve ui.raw for trusted icons.
 *
 * @author André Kless <andre.kless@web.de>
 * @copyright 2026 André Kless
 * @license MIT
 */
export const main=a=>a.ui.html`
  <section class="teambuild">
    <div class="content" data-ref="content">
      <div class="toolbar">
        <div class="totals">
          <span class="stat"><strong data-ref="teamCount"></strong><span data-ref="teamLabel"></span></span>
          <span class="stat"><strong data-ref="peopleCount"></strong><span data-ref="peopleLabel"></span></span>
        </div>
        <div class="sync" data-ref="sync"><span class="sync-mode" data-ref="syncMode"></span></div>
        ${a.user?a.ui.html`<div class="user-area" data-ref="user"></div>`:null}
      </div>
      <div class="teams" data-ref="grid"></div>
    </div>
    <p class="status" data-ref="status" role="status" aria-live="polite" aria-atomic="true">${a.labels.loading}</p>
    <dialog class="editor" data-ref="dialog" aria-label="${a.labels.editTitle}"
            data-on-cancel="cancelEditor" data-on-close="closedEditor"></dialog>
  </section>
`;export const team=(a,{number:e})=>a.ui.html`
  <article class="team-card" data-team="${e}">
    <div class="card-top" data-ref="top"><span class="team-number" data-ref="caption"></span><span class="badge" data-ref="badge"></span></div>
    <div class="team-heading" data-ref="heading"><h2 data-ref="title"></h2></div>
    <ul class="members" data-ref="list"></ul>
    <div class="empty-state" data-ref="empty">
      <span class="empty-symbol">+</span><p data-ref="emptyText"></p><p class="empty-hint" data-ref="emptyHint"></p>
    </div>
    <div class="card-footer" data-ref="footer"></div>
  </article>
`;export const member=(a,e)=>a.ui.html`
  <li class="member" data-member="${e.id}"><span class="avatar" data-ref="avatar" aria-hidden="true"></span><span class="member-name" data-ref="name"></span><span class="you" data-ref="you"></span></li>
`;export const seat=a=>a.ui.html`
  <li class="member member-empty"><span class="avatar" aria-hidden="true">+</span><span class="member-name" data-ref="label"></span></li>
`;export const button=a=>a.ui.html`
  <button type="button" class="button" data-on-click="action"><span class="icon" data-ref="icon" aria-hidden="true"></span><span data-ref="label"></span></button>
`;export const image=a=>a.ui.html`<img alt="" loading="lazy" referrerpolicy="no-referrer" data-on-error="imageError">`;export const editor=(a,e)=>a.ui.html`
  <form data-on-submit="saveName">
    <h2>${a.labels.editTitle}</h2><p class="editor-hint">${a.labels.editHint}</p>
    <label class="name-label">${a.labels.name}<input data-ref="name" name="name" value="${e.name}" required maxlength="${a.nameMaxLength}"></label>
    <p class="editor-error" data-ref="error" role="alert"></p>
    <div class="editor-actions" data-ref="actions"></div>
  </form>
`;
//# sourceMappingURL=https://cdn.jsdelivr.net/gh/ccmjs/teambuild@v1.0.0/resources/views.mjs.map