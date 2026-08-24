/* ==========================================================================
   Page logic: Performance Management & PIP (admin/ld/performance-pip.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var PIP_DAYS = 60;
  var DEFAULT_KPIS = ['Quality of work / output', 'Productivity vs. target', 'Teamwork & collaboration', 'Compliance & attendance'];

  function rows() { return store.get('appraisals').filter(function (a) { return a.type === 'Annual' || a.type === 'PIP'; }); }

  function renderAlert() {
    var lowScored = store.get('appraisals').filter(function (a) { return a.type === 'Annual' && a.score !== null && a.score < 70; });
    var withoutPip = lowScored.filter(function (a) {
      return !store.findOne('appraisals', function (p) { return p.type === 'PIP' && p.employeeId === a.employeeId; });
    });
    var host = document.getElementById('fb-pip-alert');
    if (!withoutPip.length) { host.innerHTML = ''; return; }
    host.innerHTML = '<div class="fb-restricted-note">⚠️ <span>' + withoutPip.length + ' annual appraisal(s) scored below 70% and have no PIP yet — open the record to generate one.</span></div>';
  }

  function renderActivePips() {
    var pips = store.get('appraisals').filter(function (a) { return a.type === 'PIP'; });
    var host = document.getElementById('fb-pip-active');
    if (!pips.length) { host.innerHTML = '<div class="fb-empty"><div class="fb-empty__icon">🎯</div>No employees currently on a Performance Improvement Plan.</div>'; return; }
    host.innerHTML = pips.map(function (p) {
      var e = store.employee(p.employeeId);
      var created = new Date(p.createdAt);
      var deadline = new Date(created.getTime() + PIP_DAYS * 86400000);
      var daysLeft = Math.round((deadline - new Date()) / 86400000);
      var pct = Math.min(100, Math.max(0, Math.round(((new Date() - created) / (deadline - created)) * 100)));
      var overdue = daysLeft < 0 && p.status !== 'Closed';
      return '<div class="fb-flex-between" style="padding:12px 0;border-bottom:1px solid var(--fb-border)">' +
        '<div>' + ui.personCell(e.firstName + ' ' + e.lastName, e.jobTitle + ' · ' + store.departmentName(e.departmentId)) + '</div>' +
        '<div style="width:200px"><div class="fb-progress"><div class="fb-progress__bar" style="width:' + pct + '%;background:' + (overdue ? 'var(--fb-status-rejected-fg)' : 'var(--fb-brand-500)') + '"></div></div><div class="fb-xs fb-faint" style="margin-top:4px">' + (overdue ? 'Overdue for review' : daysLeft + ' day(s) remaining') + '</div></div>' +
        ui.badge(p.status) +
        '</div>';
    }).join('');
  }

  function renderTable() {
    ui.table({
      container: '#fb-perf-table', rows: rows().slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: ['period'],
      filter: { key: 'type', options: ['Annual', 'PIP'] },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { var e = store.employee(r.employeeId); return ui.personCell(e ? e.firstName + ' ' + e.lastName : 'Unknown', e ? store.departmentName(e.departmentId) : ''); } },
        { key: 'type', label: 'Type', render: function (r) { return ui.tag(r.type); } },
        { key: 'period', label: 'Period' },
        { key: 'score', label: 'Score', render: function (r) { return r.score !== null && r.score !== undefined ? r.score + '%' : '—'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } }
      ],
      onRowClick: openDrawer,
      emptyMessage: 'No appraisals recorded yet.'
    });
  }

  function kpiRowsHtml(kpis) {
    return '<div class="fb-table-wrap"><table class="fb-table"><thead><tr><th>KPI / IPI</th><th style="width:90px">Weight %</th><th style="width:90px">Score</th></tr></thead><tbody>' +
      kpis.map(function (k, i) { return '<tr><td><input type="text" class="kpi-desc" data-idx="' + i + '" value="' + ui.escapeHtml(k.desc) + '" style="width:100%;border:none;background:transparent" /></td>' +
        '<td><input type="number" class="kpi-weight" data-idx="' + i + '" value="' + k.weight + '" min="0" max="100" style="width:100%;border:none;background:transparent" /></td>' +
        '<td><input type="number" class="kpi-score" data-idx="' + i + '" value="' + (k.score !== null ? k.score : '') + '" min="0" max="100" style="width:100%;border:none;background:transparent" /></td></tr>'; }).join('') +
      '</tbody></table></div><div class="fb-flex-between" style="margin-top:10px"><span class="fb-xs fb-faint">Weighted overall score</span><span class="fb-bold" id="kpi-total">—</span></div>';
  }
  function wireKpiTable(box) {
    function recompute() {
      var descs = box.querySelectorAll('.kpi-desc'), weights = box.querySelectorAll('.kpi-weight'), scores = box.querySelectorAll('.kpi-score');
      var totalWeight = 0, weighted = 0, anyScore = false;
      weights.forEach(function (w, i) {
        var weight = Number(w.value) || 0; var score = Number(scores[i].value);
        totalWeight += weight;
        if (scores[i].value !== '') { weighted += (weight / 100) * score; anyScore = true; }
      });
      var totalEl = box.querySelector('#kpi-total');
      if (totalEl) totalEl.textContent = anyScore ? Math.round(weighted) + '%' + (totalWeight !== 100 ? ' (weights total ' + totalWeight + '%)' : '') : '—';
    }
    box.querySelectorAll('.kpi-weight, .kpi-score').forEach(function (el) { el.addEventListener('input', recompute); });
    recompute();
  }
  function collectKpis(box, fallbackDescs) {
    var descs = box.querySelectorAll('.kpi-desc'), weights = box.querySelectorAll('.kpi-weight'), scores = box.querySelectorAll('.kpi-score');
    var kpis = [];
    descs.forEach(function (d, i) { kpis.push({ desc: d.value.trim() || fallbackDescs[i], weight: Number(weights[i].value) || 0, score: scores[i].value !== '' ? Number(scores[i].value) : null }); });
    return kpis;
  }
  function weightedScore(kpis) {
    var weighted = 0, any = false;
    kpis.forEach(function (k) { if (k.score !== null) { weighted += (k.weight / 100) * k.score; any = true; } });
    return any ? Math.round(weighted) : null;
  }

  function appraisalDisplaySteps(a) {
    var steps = (a.approvalHistory || []).slice();
    if (a.status === 'Draft') steps.push({ stage: 'Scoring', status: 'current', action: 'Awaiting KPI scoring' });
    else if (a.status === 'Pending Approval') steps.push({ stage: 'PIP Approval', status: 'current', action: 'Awaiting approval' });
    return steps;
  }

  function openDrawer(a) {
    a = store.getById('appraisals', a.id) || a;
    var e = store.employee(a.employeeId);
    var kpis = a.kpis || DEFAULT_KPIS.map(function (d) { return { desc: d, weight: 25, score: null }; });
    var overviewHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Employee</div><div class="fb-detail-item__value">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Reporting line / reviewer</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(a.reviewerId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Period</div><div class="fb-detail-item__value">' + ui.escapeHtml(a.period) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Overall score</div><div class="fb-detail-item__value">' + (a.score !== null ? a.score + '%' : 'Not yet scored') + '</div></div>' +
      '</div><hr class="fb-divider" />';
    if (a.status === 'Draft' || a.score === null) {
      overviewHtml += '<div class="fb-form-section-title">KPI / IPI scoring</div>' + kpiRowsHtml(kpis);
    } else {
      overviewHtml += '<div class="fb-form-section-title">KPI / IPI breakdown</div>' + kpiRowsHtml(kpis).replace(/<input/g, '<input disabled');
      overviewHtml += '<div class="fb-form-section-title">Notes</div><p class="fb-small">' + ui.escapeHtml(a.resultNotes || '—') + '</p>';
    }

    var workflowHtml = '<div id="pp-workflow-timeline"></div>';

    var hasPip = a.type === 'Annual' && store.findOne('appraisals', function (p) { return p.type === 'PIP' && p.employeeId === a.employeeId; });
    var footer = '';
    if (a.status === 'Draft' || (a.type === 'Annual' && a.score === null)) footer = '<button class="fb-btn fb-btn--primary" data-act="score">Submit score</button>';
    else if (a.type === 'Annual' && a.score < 70 && !hasPip) footer = '<button class="fb-btn fb-btn--danger" data-act="genpip">Generate PIP &amp; notify L&amp;D</button>';
    else if (a.type === 'PIP' && a.status === 'Pending Approval') footer = '<button class="fb-btn fb-btn--primary" data-act="approve-pip">Approve PIP</button>';
    else if (a.type === 'PIP' && a.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="close-pip">Confirm improvement &amp; close PIP</button>';

    ui.drawer({
      eyebrow: (a.type === 'PIP' ? 'Performance Improvement Plan' : 'Annual Appraisal') + ' · ' + a.id,
      title: e.firstName + ' ' + e.lastName,
      subtitle: ui.badge(a.status),
      size: 'xl',
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }],
      body: '<section data-fb-tabpanel="overview">' + overviewHtml + '</section><section data-fb-tabpanel="workflow" style="display:none">' + workflowHtml + '</section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#pp-workflow-timeline'), appraisalDisplaySteps(a));
        if (a.status === 'Draft' || a.score === null) wireKpiTable(box);
        var scoreBtn = box.querySelector('[data-act="score"]');
        if (scoreBtn) scoreBtn.addEventListener('click', function () {
          var newKpis = collectKpis(box, DEFAULT_KPIS);
          var score = weightedScore(newKpis);
          if (score === null) { ui.toast('Score at least one KPI first.', 'error'); return; }
          store.recordApproval('appraisals', a.id, { stage: 'Scored', action: 'Scored ' + score + '%', comment: 'Weighted score across ' + newKpis.length + ' KPIs.', patch: { score: score, kpis: newKpis, status: 'Approved' } });
          store.auditLog(store.currentUser().id, 'Scored ' + a.type + ' appraisal', 'Employee', e.id);
          ui.closeDrawer();
          ui.toast(score < 70 && a.type === 'Annual' ? 'Scored ' + score + '% — below threshold, PIP can now be generated.' : 'Score submitted.', score < 70 && a.type === 'Annual' ? 'error' : 'success');
          renderAll();
        });
        var pipBtn = box.querySelector('[data-act="genpip"]');
        if (pipBtn) pipBtn.addEventListener('click', function () {
          store.update('employees', e.id, { status: 'On PIP' });
          var pip = store.insert('appraisals', { employeeId: e.id, type: 'PIP', period: '60-day Improvement Plan', score: null, status: 'Pending Approval', reviewerId: a.reviewerId, resultNotes: 'Auto-generated: annual appraisal scored ' + a.score + '% (below 70% threshold).', approvalHistory: [] });
          store.recordApproval('appraisals', pip.id, { stage: 'PIP Drafted', action: 'Auto-generated', comment: 'Annual appraisal scored ' + a.score + '% — below the 70% threshold.' });
          store.notify('PIP generated — ' + e.firstName + ' ' + e.lastName, 'Annual appraisal scored ' + a.score + '%. L&D notified to support a 60-day improvement plan.', 'Performance', 'admin/ld/performance-pip.html');
          store.auditLog(store.currentUser().id, 'Generated PIP from low annual score', 'Employee', e.id);
          ui.closeDrawer(); ui.toast('PIP created. L&D notified.', 'success'); renderAll();
        });
        var approvePipBtn = box.querySelector('[data-act="approve-pip"]');
        if (approvePipBtn) approvePipBtn.addEventListener('click', function () {
          store.recordApproval('appraisals', a.id, { stage: 'PIP Approval', action: 'Approved', comment: 'Improvement plan approved and active.', patch: { status: 'Approved' } });
          ui.closeDrawer(); ui.toast('PIP approved and active.', 'success'); renderAll();
        });
        var closePipBtn = box.querySelector('[data-act="close-pip"]');
        if (closePipBtn) closePipBtn.addEventListener('click', function () {
          store.recordApproval('appraisals', a.id, { stage: 'Closed', action: 'Improvement confirmed', comment: 'Employee returned to active status.', patch: { status: 'Closed' } });
          store.update('employees', e.id, { status: 'Active' });
          store.notify('PIP closed — ' + e.firstName + ' ' + e.lastName, 'Improvement confirmed. Employee returned to active status.', 'Performance', 'admin/ld/performance-pip.html');
          store.auditLog(store.currentUser().id, 'Closed PIP — improvement confirmed', 'Employee', e.id);
          ui.closeDrawer(); ui.toast(e.firstName + ' is back to active status.', 'success'); renderAll();
        });
      }
    });
  }

  function openNewAppraisalModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active'; });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">👤 Appraisal details</div>' +
      '<div class="fb-field"><label>Employee</label><select id="pn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Period</label><input type="text" id="pn-period" placeholder="e.g. 2026 FY" /></div>' +
      '<div class="fb-field"><label>Reporting line (reviewer)</label><select id="pn-reviewer">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">🎯 KPI / IPI template</div><div class="fb-hint" style="margin-bottom:10px">Weightage and reporting line are captured up front; scores are entered once the review period closes.</div>' +
      kpiRowsHtml(DEFAULT_KPIS.map(function (d) { return { desc: d, weight: 25, score: null }; })) + '</div>';
    ui.drawer({
      title: 'New annual appraisal', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create draft</button>',
      onMount: function (box) {
        wireKpiTable(box);
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('pn-emp').value;
          var emp = store.employee(empId);
          var kpis = collectKpis(box, DEFAULT_KPIS);
          store.insert('appraisals', { employeeId: empId, type: 'Annual', period: document.getElementById('pn-period').value.trim() || '2026 FY', score: null, status: 'Draft', reviewerId: document.getElementById('pn-reviewer').value || emp.managerId || store.currentUser().id, resultNotes: '', kpis: kpis, approvalHistory: [] });
          ui.closeDrawer(); ui.toast('Appraisal draft created with KPI template.', 'success'); renderAll();
        });
      }
    });
  }

  function renderAll() { renderAlert(); renderActivePips(); renderTable(); }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderAll();
    document.getElementById('fb-btn-new-appraisal').addEventListener('click', openNewAppraisalModal);
  });
})();
