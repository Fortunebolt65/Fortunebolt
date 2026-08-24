/* ==========================================================================
   Page logic: Performance Management & PIP (admin/ld/performance-pip.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var PIP_DAYS = 60;

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
      onRowClick: openModal,
      emptyMessage: 'No appraisals recorded yet.'
    });
  }

  function openModal(a) {
    var e = store.employee(a.employeeId);
    var body = '<div class="fb-grid fb-grid--2">' +
      '<div><div class="fb-xs fb-faint">Employee</div><div class="fb-bold">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Reviewer</div><div class="fb-bold">' + ui.escapeHtml(store.employeeName(a.reviewerId)) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Period</div><div class="fb-bold">' + ui.escapeHtml(a.period) + '</div></div>' +
      '<div><div class="fb-xs fb-faint">Score</div><div class="fb-bold">' + (a.score !== null ? a.score + '%' : 'Not yet scored') + '</div></div>' +
      '</div><hr class="fb-divider" />';
    if (a.status === 'Draft' || a.score === null) {
      body += '<div class="fb-field"><label>Score (%)</label><input type="number" id="pp-score" min="0" max="100" /></div><div class="fb-field"><label>Notes</label><textarea id="pp-notes" placeholder="KPI/IPI performance notes..."></textarea></div>';
    } else {
      body += '<div class="fb-xs fb-faint">Notes</div><p class="fb-small">' + ui.escapeHtml(a.resultNotes || '—') + '</p>';
    }

    var hasPip = a.type === 'Annual' && store.findOne('appraisals', function (p) { return p.type === 'PIP' && p.employeeId === a.employeeId; });
    var footer = '';
    if (a.status === 'Draft' || (a.type === 'Annual' && a.score === null)) footer = '<button class="fb-btn fb-btn--primary" data-act="score">Submit score</button>';
    else if (a.type === 'Annual' && a.score < 70 && !hasPip) footer = '<button class="fb-btn fb-btn--danger" data-act="genpip">Generate PIP &amp; notify L&amp;D</button>';
    else if (a.type === 'PIP' && a.status === 'Pending Approval') footer = '<button class="fb-btn fb-btn--primary" data-act="approve-pip">Approve PIP</button>';
    else if (a.type === 'PIP' && a.status === 'Approved') footer = '<button class="fb-btn fb-btn--primary" data-act="close-pip">Confirm improvement &amp; close PIP</button>';

    ui.modal({
      title: a.type + ' — ' + e.firstName + ' ' + e.lastName, body: body, footer: footer,
      onMount: function (box) {
        var scoreBtn = box.querySelector('[data-act="score"]');
        if (scoreBtn) scoreBtn.addEventListener('click', function () {
          var score = Number(document.getElementById('pp-score').value) || 0;
          var notes = document.getElementById('pp-notes').value.trim();
          store.update('appraisals', a.id, { score: score, resultNotes: notes, status: 'Approved' });
          store.auditLog(store.currentUser().id, 'Scored ' + a.type + ' appraisal', 'Employee', e.id);
          ui.closeModal();
          ui.toast(score < 70 && a.type === 'Annual' ? 'Scored ' + score + '% — below threshold, PIP can now be generated.' : 'Score submitted.', score < 70 && a.type === 'Annual' ? 'error' : 'success');
          renderAll();
        });
        var pipBtn = box.querySelector('[data-act="genpip"]');
        if (pipBtn) pipBtn.addEventListener('click', function () {
          store.update('employees', e.id, { status: 'On PIP' });
          store.insert('appraisals', { employeeId: e.id, type: 'PIP', period: '60-day Improvement Plan', score: null, status: 'Pending Approval', reviewerId: a.reviewerId, resultNotes: 'Auto-generated: annual appraisal scored ' + a.score + '% (below 70% threshold).' });
          store.notify('PIP generated — ' + e.firstName + ' ' + e.lastName, 'Annual appraisal scored ' + a.score + '%. L&D notified to support a 60-day improvement plan.', 'Performance', 'admin/ld/performance-pip.html');
          store.auditLog(store.currentUser().id, 'Generated PIP from low annual score', 'Employee', e.id);
          ui.closeModal(); ui.toast('PIP created. L&D notified.', 'success'); renderAll();
        });
        var approvePipBtn = box.querySelector('[data-act="approve-pip"]');
        if (approvePipBtn) approvePipBtn.addEventListener('click', function () {
          store.update('appraisals', a.id, { status: 'Approved' });
          ui.closeModal(); ui.toast('PIP approved and active.', 'success'); renderAll();
        });
        var closePipBtn = box.querySelector('[data-act="close-pip"]');
        if (closePipBtn) closePipBtn.addEventListener('click', function () {
          store.update('appraisals', a.id, { status: 'Closed' });
          store.update('employees', e.id, { status: 'Active' });
          store.notify('PIP closed — ' + e.firstName + ' ' + e.lastName, 'Improvement confirmed. Employee returned to active status.', 'Performance', 'admin/ld/performance-pip.html');
          store.auditLog(store.currentUser().id, 'Closed PIP — improvement confirmed', 'Employee', e.id);
          ui.closeModal(); ui.toast(e.firstName + ' is back to active status.', 'success'); renderAll();
        });
      }
    });
  }

  function openNewAppraisalModal() {
    var employees = store.get('employees').filter(function (e) { return e.status === 'Active'; });
    var body = '<div class="fb-field"><label>Employee</label><select id="pn-emp">' + employees.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Period</label><input type="text" id="pn-period" placeholder="e.g. 2026 FY" /></div>';
    ui.modal({
      title: 'New annual appraisal', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Create draft</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var empId = document.getElementById('pn-emp').value;
          var emp = store.employee(empId);
          store.insert('appraisals', { employeeId: empId, type: 'Annual', period: document.getElementById('pn-period').value.trim() || '2026 FY', score: null, status: 'Draft', reviewerId: emp.managerId || store.currentUser().id, resultNotes: '' });
          ui.closeModal(); ui.toast('Appraisal draft created.', 'success'); renderAll();
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
