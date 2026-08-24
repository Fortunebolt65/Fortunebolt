/* ==========================================================================
   Page logic: HR Analytics (admin/hrbp/hr-analytics.html)
   Read-only aggregation layer — every number here is computed live from
   records other modules write to. Nothing on this page originates data.
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var daysBetween = function (a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); };

  function latestAnnualScore(empId) {
    var list = store.find('appraisals', function (a) { return a.employeeId === empId && a.type === 'Annual' && a.score !== null; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return list.length ? list[0].score : null;
  }

  function renderOverview() {
    var employees = store.get('employees');
    var active = employees.filter(function (e) { return e.status === 'Active' || e.status === 'On PIP'; });
    var exited = employees.filter(function (e) { return e.status === 'Exited'; });
    var everEmployed = active.length + exited.length;
    var turnoverRate = everEmployed ? Math.round((exited.length / everEmployed) * 100) : 0;
    var openReqs = store.get('requisitions').filter(function (r) { return r.status === 'Approved'; });
    var openHeadcount = openReqs.reduce(function (s, r) { return s + r.headcount; }, 0);
    document.getElementById('an-overview').innerHTML = [
      ui.statCardHtml({ label: 'Active headcount', value: active.length }),
      ui.statCardHtml({ label: 'Turnover rate', value: turnoverRate + '%', sub: exited.length + ' exited to date' }),
      ui.statCardHtml({ label: 'Open positions', value: openHeadcount, sub: openReqs.length + ' approved requisition(s)' }),
      ui.statCardHtml({ label: 'Employees on PIP', value: employees.filter(function (e) { return e.status === 'On PIP'; }).length })
    ].join('');
  }

  function renderTurnoverByDept() {
    var depts = store.get('departments');
    var labels = [], values = [];
    depts.forEach(function (d) {
      var staff = store.get('employees').filter(function (e) { return e.departmentId === d.id; });
      var exited = staff.filter(function (e) { return e.status === 'Exited'; }).length;
      if (!staff.length) return;
      labels.push(d.short); values.push(Math.round((exited / staff.length) * 100));
    });
    ui.barChart('#an-turnover-dept', { labels: labels, values: values, valueFormatter: function (v) { return v + '%'; } });
  }

  function renderExitType() {
    var cases = store.get('exitCases');
    var types = ['Resignation', 'Termination', 'Retirement'];
    var counts = types.map(function (t) { return cases.filter(function (c) { return c.type === t; }).length; });
    var host = document.getElementById('an-exit-type');
    if (!cases.length) { host.innerHTML = '<div class="fb-faint fb-small">No exit cases on file yet.</div>'; return; }
    ui.barChart(host, { labels: types, values: counts });
  }

  function renderRiskWatchlist() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active' || e.status === 'On PIP'; });
    var flagged = employees.map(function (e) {
      var score = latestAnnualScore(e.id);
      var reasons = [];
      if (e.status === 'On PIP') reasons.push('On PIP');
      if (score !== null && score < 65) reasons.push('Low appraisal score (' + score + '%)');
      return reasons.length ? { e: e, reasons: reasons } : null;
    }).filter(Boolean).slice(0, 6);
    var host = document.getElementById('an-risk');
    if (!flagged.length) { host.innerHTML = '<div class="fb-faint fb-small">No employees currently flagged at risk.</div>'; return; }
    host.innerHTML = flagged.map(function (f) { return '<div style="padding:7px 0;border-bottom:1px solid var(--fb-border)"><div class="fb-small fb-bold">' + ui.escapeHtml(f.e.firstName + ' ' + f.e.lastName) + '</div><div class="fb-xs fb-faint">' + f.reasons.join(' · ') + '</div></div>'; }).join('');
  }

  function renderFunnel() {
    var stages = ['Applied', 'Screening', 'Shortlisted', 'Testing', 'Interviewing', 'Offer', 'Hired'];
    var candidates = store.get('candidates');
    ui.barChart('#an-funnel', { labels: stages, values: stages.map(function (s) { return candidates.filter(function (c) { return c.status === s; }).length; }) });
  }

  function renderSource() {
    var hired = store.get('candidates').filter(function (c) { return c.status === 'Hired'; });
    var sources = ['Careers Page', 'LinkedIn', 'Referral', 'Recruitment Agency'];
    var host = document.getElementById('an-source');
    if (!hired.length) { host.innerHTML = '<div class="fb-faint fb-small">No hires recorded yet.</div>'; return; }
    ui.barChart(host, { labels: sources.map(function (s) { return s.split(' ')[0]; }), values: sources.map(function (s) { return hired.filter(function (c) { return c.source === s; }).length; }) });
  }

  function renderTimeToHire() {
    var hired = store.get('candidates').filter(function (c) { return c.status === 'Hired'; });
    var host = document.getElementById('an-tth');
    if (!hired.length) { host.innerHTML = '<div class="fb-faint fb-small">No hires recorded yet.</div>'; return; }
    var days = hired.map(function (c) {
      var offer = store.findOne('offers', function (o) { return o.candidateId === c.id && o.status === 'Accepted'; });
      return offer ? daysBetween(c.appliedAt, offer.signedAt) : null;
    }).filter(function (d) { return d !== null && d >= 0; });
    var avgDays = days.length ? Math.round(days.reduce(function (a, b) { return a + b; }, 0) / days.length) : null;
    var scores = hired.map(function (c) {
      var iv = store.findOne('interviews', function (i) { return i.candidateId === c.id && i.score !== null; });
      return iv ? iv.score : null;
    }).filter(function (s) { return s !== null; });
    var avgQuality = scores.length ? (scores.reduce(function (a, b) { return a + b; }, 0) / scores.length).toFixed(1) : null;
    document.getElementById('an-tth').innerHTML =
      '<div class="fb-flex-between" style="padding:7px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">Avg. time-to-hire</span><span class="fb-bold">' + (avgDays !== null ? avgDays + ' day(s)' : '—') + '</span></div>' +
      '<div class="fb-flex-between" style="padding:7px 0"><span class="fb-small">Avg. quality of hire</span><span class="fb-bold">' + (avgQuality !== null ? avgQuality + ' / 5' : '—') + '</span></div>';
  }

  function renderTraining() {
    var completed = store.get('enrollments').filter(function (e) { return e.status === 'Completed' && e.score !== null; });
    var pairs = completed.map(function (en) {
      var prior = latestAnnualScore(en.employeeId);
      return prior !== null ? { before: prior, after: en.score } : null;
    }).filter(Boolean);
    var host = document.getElementById('an-training');
    if (!pairs.length) { host.innerHTML = '<div class="fb-faint fb-small">Not enough completions yet.</div>'; return; }
    var avgDelta = Math.round(pairs.reduce(function (s, p) { return s + (p.after - p.before); }, 0) / pairs.length);
    host.innerHTML = '<div class="fb-flex-between" style="padding:7px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">Courses completed</span><span class="fb-bold">' + completed.length + '</span></div>' +
      '<div class="fb-flex-between" style="padding:7px 0"><span class="fb-small">Avg. score lift</span><span class="fb-bold" style="color:' + (avgDelta >= 0 ? 'var(--fb-status-approved-fg)' : 'var(--fb-status-rejected-fg)') + '">' + (avgDelta >= 0 ? '+' : '') + avgDelta + ' pts</span></div>';
  }

  function renderPerfDist() {
    var scores = store.get('appraisals').filter(function (a) { return a.type === 'Annual' && a.score !== null; }).map(function (a) { return a.score; });
    var bands = [[0, 59], [60, 69], [70, 79], [80, 89], [90, 100]];
    var labels = ['<60', '60-69', '70-79', '80-89', '90+'];
    var counts = bands.map(function (b) { return scores.filter(function (s) { return s >= b[0] && s <= b[1]; }).length; });
    ui.barChart('#an-perf-dist', { labels: labels, values: counts });
  }

  function renderGoal() {
    var depts = store.get('departments');
    var labels = [], values = [];
    depts.forEach(function (d) {
      var staff = store.get('employees').filter(function (e) { return e.departmentId === d.id; });
      var scores = staff.map(function (e) { return latestAnnualScore(e.id); }).filter(function (s) { return s !== null; });
      if (!scores.length) return;
      labels.push(d.short); values.push(Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length));
    });
    ui.barChart('#an-goal', { labels: labels, values: values, valueFormatter: function (v) { return v + '%'; } });
  }

  function renderGender() {
    var active = store.get('employees').filter(function (e) { return e.status !== 'Exiting' && e.status !== 'Exited'; });
    var male = active.filter(function (e) { return e.gender === 'Male'; }).length;
    var female = active.filter(function (e) { return e.gender === 'Female'; }).length;
    ui.barChart('#an-gender', { labels: ['Male', 'Female'], values: [male, female] });
  }

  function renderCadre() {
    var cadres = store.get('cadres');
    var active = store.get('employees').filter(function (e) { return e.status !== 'Exiting' && e.status !== 'Exited'; });
    ui.barChart('#an-cadre', { labels: cadres.map(function (c) { return c.name.split(' ').map(function (w) { return w[0]; }).join(''); }), values: cadres.map(function (c) { return active.filter(function (e) { return e.cadreId === c.id; }).length; }) });
  }

  function renderAbsence() {
    var sick = store.get('sickLeaveRequests');
    var totalDays = sick.reduce(function (s, r) { return s + Math.max(1, daysBetween(r.startDate, r.endDate)); }, 0);
    document.getElementById('an-absence').innerHTML =
      '<div class="fb-flex-between" style="padding:7px 0;border-bottom:1px solid var(--fb-border)"><span class="fb-small">Requests logged</span><span class="fb-bold">' + sick.length + '</span></div>' +
      '<div class="fb-flex-between" style="padding:7px 0"><span class="fb-small">Total sick days</span><span class="fb-bold">' + totalDays + '</span></div>';
  }

  function customBuckets(dimension) {
    var employees = store.get('employees').filter(function (e) { return e.status !== 'Exiting' && e.status !== 'Exited'; });
    var groups = {};
    employees.forEach(function (e) {
      var key = dimension === 'department' ? store.departmentName(e.departmentId) : dimension === 'cadre' ? store.cadreName(e.cadreId) : dimension === 'gender' ? e.gender : e.status;
      (groups[key] = groups[key] || []).push(e);
    });
    return groups;
  }

  function renderCustom() {
    var dimension = document.getElementById('an-dimension').value;
    var metric = document.getElementById('an-metric').value;
    var groups = customBuckets(dimension);
    var labels = Object.keys(groups);
    var values = labels.map(function (k) {
      if (metric === 'headcount') return groups[k].length;
      var scores = groups[k].map(function (e) { return latestAnnualScore(e.id); }).filter(function (s) { return s !== null; });
      return scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : 0;
    });
    ui.barChart('#an-custom-chart', { labels: labels, values: values, valueFormatter: metric === 'avgScore' ? function (v) { return v + '%'; } : undefined });
    document.getElementById('an-export').onclick = function () {
      ui.exportCsv('hr-analytics-custom-report.csv', [{ label: dimension, value: function (r) { return r.label; } }, { label: metric, value: function (r) { return r.value; } }], labels.map(function (l, i) { return { label: l, value: values[i] }; }));
    };
  }

  function renderAll() {
    renderOverview(); renderTurnoverByDept(); renderExitType(); renderRiskWatchlist();
    renderFunnel(); renderSource(); renderTimeToHire();
    renderTraining(); renderPerfDist(); renderGoal();
    renderGender(); renderCadre(); renderAbsence();
    renderCustom();
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderAll();
    document.getElementById('an-dimension').addEventListener('change', renderCustom);
    document.getElementById('an-metric').addEventListener('change', renderCustom);
  });
})();
