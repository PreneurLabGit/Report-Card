export const REPORT_CARD_CSS = String.raw`/* Salt Hub Report Card - shared styles (v2, editorial)
   Used by all five web versions.
   Design intent: one long-form brief per audience, not a stacked dashboard.
   Hairline rules separate sections, not card backgrounds.
   Color is reserved for status signal, not decoration. */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --ink: #1A1A1A;
  --body: #2B2B2B;
  --muted: #6B6B6B;
  --faint: #9A9A9A;
  --hairline: #EDEDEA;

  --bg: #FAFAF9;
  --paper: #FFFFFF;

  --teal: #00ADAA;
  --teal-deep: #00807E;
  --teal-tint: #F0F9F8;

  --pink: #ED347B;
  --pink-deep: #C0245F;
  --pink-tint: #FCEDF3;

  --orange: #F79124;
  --orange-deep: #C2710F;
  --orange-tint: #FDF3E5;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  font-feature-settings: 'tnum' 1, 'cv11' 1;
  color: var(--body);
  background: var(--bg);
  line-height: 1.5;
  padding: 56px 24px 80px;
}

.brief {
  max-width: 640px;
  margin: 0 auto;
  background: var(--paper);
  padding: 56px 64px 56px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02), 0 8px 32px rgba(0,0,0,0.04);
}

.eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--pink);
  margin-bottom: 32px;
}
.eyebrow .sep { color: var(--faint); padding: 0 6px; }

.head {
  padding-bottom: 28px;
  border-bottom: 1px solid var(--hairline);
}
.head__meta {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.head__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.head__sub {
  font-size: 14px;
  color: var(--muted);
  margin-top: 8px;
}
.head__score-inline {
  font-size: 14px;
  color: var(--muted);
  margin-top: 8px;
}
.head__score-inline strong {
  color: var(--ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 6px 10px 6px 8px;
  border-radius: 3px;
}
.status-tag::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.status-tag--green  { background: var(--teal-tint);   color: var(--teal-deep); }
.status-tag--green::before  { background: var(--teal); }
.status-tag--yellow { background: var(--orange-tint); color: var(--orange-deep); }
.status-tag--yellow::before { background: var(--orange); }
.status-tag--red    { background: var(--pink-tint);   color: var(--pink-deep); }
.status-tag--red::before    { background: var(--pink); }

.lede {
  font-size: 19px;
  font-weight: 400;
  color: var(--ink);
  line-height: 1.45;
  letter-spacing: -0.005em;
  padding: 32px 0;
  border-bottom: 1px solid var(--hairline);
}
.lede em { font-style: italic; color: var(--muted); font-weight: 400; }

.section { padding: 32px 0; border-bottom: 1px solid var(--hairline); }
.section:last-of-type { border-bottom: none; padding-bottom: 0; }
.section__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 20px;
}

.nums {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px 32px;
}
.nums--two { grid-template-columns: repeat(2, 1fr); }
.nums--four { grid-template-columns: repeat(4, 1fr); }
.num__value {
  font-size: 32px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.025em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  margin-bottom: 6px;
}
.num__value--green  { color: var(--teal-deep); }
.num__value--yellow { color: var(--orange-deep); }
.num__value--red    { color: var(--pink-deep); }
.num__label {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.35;
}
.num__sub {
  font-size: 12px;
  color: var(--faint);
  margin-top: 4px;
}

.prose {
  font-size: 15px;
  line-height: 1.65;
  color: var(--body);
}
.prose strong { color: var(--ink); font-weight: 600; }
.prose + .prose { margin-top: 14px; }

.actions { display: flex; flex-direction: column; gap: 18px; }
.action {
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 14px;
  align-items: baseline;
}
.action__marker {
  font-size: 13px;
  font-weight: 600;
  color: var(--pink);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.action__body {
  font-size: 15px;
  line-height: 1.6;
  color: var(--body);
}
.action__body strong { color: var(--ink); font-weight: 600; }

.quote {
  border-left: 2px solid var(--teal);
  padding: 4px 0 4px 20px;
  margin-top: 8px;
}
.quote__text {
  font-size: 15px;
  color: var(--body);
  font-style: italic;
  line-height: 1.6;
}
.quote__attr {
  font-size: 12px;
  color: var(--faint);
  margin-top: 8px;
  font-style: normal;
}

.compare {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.compare th, .compare td {
  text-align: left;
  padding: 14px 8px;
  border-bottom: 1px solid var(--hairline);
}
.compare th {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--ink);
  padding: 8px;
}
.compare th:first-child, .compare td:first-child { padding-left: 0; }
.compare th:last-child,  .compare td:last-child  { padding-right: 0; text-align: right; }
.compare th.num, .compare td.num { text-align: right; }
.compare td.who { font-weight: 600; color: var(--ink); }
.compare td.score-cell { font-weight: 600; color: var(--ink); }
.compare tr:last-child td { border-bottom: none; }

.rag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.rag::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.rag--green  { color: var(--teal-deep); }
.rag--green::before  { background: var(--teal); }
.rag--yellow { color: var(--orange-deep); }
.rag--yellow::before { background: var(--orange); }
.rag--red    { color: var(--pink-deep); }
.rag--red::before    { background: var(--pink); }

.delta--up   { color: var(--teal-deep); }
.delta--down { color: var(--pink-deep); }
.delta--flat { color: var(--faint); }

.bottlenecks { display: flex; flex-direction: column; gap: 20px; }
.bot { display: grid; grid-template-columns: 22px 1fr; gap: 14px; align-items: baseline; }
.bot__rank {
  font-size: 13px;
  font-weight: 600;
  color: var(--faint);
  font-variant-numeric: tabular-nums;
}
.bot__theme {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}
.bot__detail {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.55;
}
.bot__detail .tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 3px;
  margin-right: 8px;
  vertical-align: 1px;
}
.tag--platform   { color: var(--pink-deep);   background: var(--pink-tint); }
.tag--capability { color: var(--orange-deep); background: var(--orange-tint); }
.tag--behavioral { color: var(--teal-deep);   background: var(--teal-tint); }

.foot {
  font-size: 11px;
  color: var(--faint);
  text-align: center;
  margin-top: 24px;
  line-height: 1.7;
  letter-spacing: 0.02em;
}
.foot a { color: var(--muted); text-decoration: underline; }

@media (max-width: 720px) {
  body { padding: 24px 12px 40px; }
  .brief { padding: 32px 24px; }
  .nums, .nums--two, .nums--four { grid-template-columns: repeat(2, 1fr); gap: 24px 20px; }
  .head__title { font-size: 24px; }
  .lede { font-size: 17px; padding: 24px 0; }
  .compare { font-size: 13px; }
  .compare th, .compare td { padding: 12px 6px; }
}`;

export const TEAM_MEMBER_TEMPLATE = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Salt Hub - Your Week</title>
    <style>
{{embedded_css}}
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{preheader}}</div>
    <main class="brief">
      <div class="eyebrow">SALT HUB <span class="sep">/</span> WEEKLY ADOPTION BRIEF <span class="sep">/</span> YOUR WEEK</div>

      <header class="head">
        <div class="head__meta">
          <span>{{week_label}}</span>
          <span class="status-tag {{status_class}}">{{status_text}}</span>
        </div>
        <h1 class="head__title">Your week in Salt Hub, {{user_name}}</h1>
        <p class="head__sub">{{team_label}} &middot; {{role_label}}</p>
      </header>

      <section class="lede">{{lede}}</section>

      <section class="section">
        <div class="section__label">Your activity</div>
        <div class="nums nums--four">
          <div>
            <div class="num__value num__value--green">{{login_count}}</div>
            <div class="num__label">Logins</div>
            <div class="num__sub">{{login_sub}}</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{active_days_value}}</div>
            <div class="num__label">Active days</div>
            <div class="num__sub">{{active_days_sub}}</div>
          </div>
          <div>
            <div class="num__value">{{last_active_value}}</div>
            <div class="num__label">Last active</div>
            <div class="num__sub">{{last_active_sub}}</div>
          </div>
          <div>
            <div class="num__value">{{wow_delta_value}}</div>
            <div class="num__label">Score WoW</div>
            <div class="num__sub">{{wow_delta_sub}}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">What you got done</div>
        <div class="nums">
          <div>
            <div class="num__value num__value--green">{{pipeline_entries_created}}</div>
            <div class="num__label">Pipeline entries created</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{estimates_created}}</div>
            <div class="num__label">Estimates created</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{estimates_submitted}}</div>
            <div class="num__label">Estimates submitted</div>
            <div class="num__sub">{{estimates_submitted_sub}}</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{approvals_received}}</div>
            <div class="num__label">Approvals received</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{projects_confirmed}}</div>
            <div class="num__label">Projects you confirmed</div>
          </div>
          <div>
            <div class="num__value">{{rework_events}}</div>
            <div class="num__label">Rework events</div>
            <div class="num__sub">{{rework_sub}}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">One observation</div>
        <p class="prose">{{observation}}</p>
      </section>

      <footer class="foot">
        This is a personal read just for you &middot; Used to help us improve Salt Hub, not to rank you<br />
        Your manager sees a team rollup, not your individual card &middot;
        <a href="https://support.saltxcai.com">Salt Hub Support</a>
      </footer>
    </main>
  </body>
</html>`;

export const BUSINESS_OWNER_TEMPLATE = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Salt Hub - Manager Brief</title>
    <style>
{{embedded_css}}
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{preheader}}</div>
    <main class="brief">
      <div class="eyebrow">SALT HUB <span class="sep">/</span> WEEKLY ADOPTION BRIEF <span class="sep">/</span> MANAGER</div>

      <header class="head">
        <div class="head__meta">
          <span>{{week_label}}</span>
          <span class="status-tag {{status_class}}">{{status_text}}</span>
        </div>
        <h1 class="head__title">{{user_name}} &mdash; {{team_title}}</h1>
        <p class="head__sub">{{manager_subline}}</p>
      </header>

      <section class="lede">{{lede}}</section>

      <section class="section">
        <div class="section__label">The numbers</div>
        <div class="nums">
          <div>
            <div class="num__value num__value--yellow">{{active_users_value}}</div>
            <div class="num__label">Active users</div>
            <div class="num__sub">{{active_users_sub}}</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{pipeline_entries_created}}</div>
            <div class="num__label">Pipeline entries created</div>
            <div class="num__sub">{{pipeline_entries_sub}}</div>
          </div>
          <div>
            <div class="num__value num__value--yellow">{{estimates_submitted_value}}</div>
            <div class="num__label">Estimates submitted</div>
            <div class="num__sub">{{estimates_submitted_sub}}</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{approvals_completed}}</div>
            <div class="num__label">Approvals completed</div>
          </div>
          <div>
            <div class="num__value num__value--green">{{projects_confirmed}}</div>
            <div class="num__label">Projects confirmed</div>
          </div>
          <div>
            <div class="num__value">{{rework_events}}</div>
            <div class="num__label">Rework events</div>
            <div class="num__sub">{{rework_sub}}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">What stands out</div>
        <p class="prose">{{what_stands_out}}</p>
      </section>

      <section class="section">
        <div class="section__label">Worth doing this week</div>
        <div class="actions">
          <div class="action">
            <div class="action__marker">01</div>
            <div class="action__body">{{worth_doing_1}}</div>
          </div>
          <div class="action">
            <div class="action__marker">02</div>
            <div class="action__body">{{worth_doing_2}}</div>
          </div>
          <div class="action">
            <div class="action__marker">03</div>
            <div class="action__body">{{worth_doing_3}}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">Your friction note from last week</div>
        <div class="quote">
          <div class="quote__text">{{friction_note_text}}</div>
          <div class="quote__attr">{{friction_note_attr}}</div>
        </div>
      </section>

      <footer class="foot">
        Generated by the Salt Hub delivery pipeline &middot; A diagnostic instrument, not a scorecard<br />
        Individual user data stays at the manager level &middot;
        <a href="https://support.saltxcai.com">Salt Hub Support</a>
      </footer>
    </main>
  </body>
</html>`;

export const SUPER_ADMIN_TEMPLATE = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Salt Hub - Leader Brief</title>
    <style>
{{embedded_css}}
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{preheader}}</div>
    <main class="brief">
      <div class="eyebrow">SALT HUB <span class="sep">/</span> BI-WEEKLY ADOPTION BRIEF <span class="sep">/</span> LEADER</div>

      <header class="head">
        <div class="head__meta">
          <span>{{period_label}}</span>
          <span class="status-tag {{status_class}}">{{status_text}}</span>
        </div>
        <h1 class="head__title">{{user_name}} &mdash; {{leader_title}}</h1>
        <p class="head__sub">{{leader_subline}}</p>
      </header>

      <section class="lede">{{lede}}</section>

      <section class="section">
        <div class="section__label">Your managers, side by side</div>
        <table class="compare">
          <thead>
            <tr>
              <th>Manager</th>
              <th>Status</th>
              <th class="num">Score</th>
              <th class="num">Active</th>
              <th class="num">Confirmed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="who">{{manager_1_name}}</td>
              <td>{{manager_1_status}}</td>
              <td class="num score-cell">{{manager_1_score}}</td>
              <td class="num">{{manager_1_active}}</td>
              <td class="num">{{manager_1_confirmed}}</td>
            </tr>
            <tr>
              <td class="who">{{manager_2_name}}</td>
              <td>{{manager_2_status}}</td>
              <td class="num score-cell">{{manager_2_score}}</td>
              <td class="num">{{manager_2_active}}</td>
              <td class="num">{{manager_2_confirmed}}</td>
            </tr>
            <tr>
              <td class="who">{{manager_3_name}}</td>
              <td>{{manager_3_status}}</td>
              <td class="num score-cell">{{manager_3_score}}</td>
              <td class="num">{{manager_3_active}}</td>
              <td class="num">{{manager_3_confirmed}}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <div class="section__label">Where to spend coaching time</div>
        <div class="actions">
          <div class="action">
            <div class="action__marker">01</div>
            <div class="action__body">{{coaching_1}}</div>
          </div>
          <div class="action">
            <div class="action__marker">02</div>
            <div class="action__body">{{coaching_2}}</div>
          </div>
          <div class="action">
            <div class="action__marker">03</div>
            <div class="action__body">{{coaching_3}}</div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__label">Friction themes across your span</div>
        <div class="quote">
          <div class="quote__text">{{friction_theme_text}}</div>
          <div class="quote__attr">{{friction_theme_attr}}</div>
        </div>
      </section>

      <footer class="foot">
        For leadership coaching, not for stack ranking &middot; Individual user data stays at the manager level<br />
        Generated by the Salt Hub delivery pipeline &middot;
        <a href="https://support.saltxcai.com">Salt Hub Support</a>
      </footer>
    </main>
  </body>
</html>`;
