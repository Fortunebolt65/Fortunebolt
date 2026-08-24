/* ==========================================================================
   Page logic: Evaluation (admin/ld/evaluation.html)
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var TYPES = ['Pre-Evaluation', 'Training Evaluation', 'Post-Learning Evaluation', 'Course & Presentation Feedback'];

  function renderTable() {
    ui.table({
      container: '#fb-eval-table', rows: store.get('evaluations').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }),
      searchable: true, searchKeys: [],
      filter: { key: 'type', options: TYPES },
      columns: [
        { key: 'employeeId', label: 'Employee', render: function (r) { return ui.escapeHtml(store.employeeName(r.employeeId)); } },
        { key: 'type', label: 'Form', render: function (r) { return ui.tag(r.type); } },
        { key: 'enrollmentId', label: 'Course', render: function (r) { var en = store.getById('enrollments', r.enrollmentId); var c = en ? store.getById('courses', en.courseId) : null; return c ? ui.escapeHtml(c.title) : '—'; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'createdAt', label: 'Date', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openModal,
      emptyMessage: 'No evaluation forms yet — complete a course in the LMS to generate the chain.'
    });
  }

  function beforeAfterChart(box, r) {
    var en = store.getById('enrollments', r.enrollmentId);
    if (!en || r.type !== 'Post-Learning Evaluation') return;
    var priorAppraisal = store.find('appraisals', function (a) { return a.employeeId === r.employeeId && a.type === 'Annual' && a.score !== null; }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })[0];
    var host = box.querySelector('#eval-chart');
    if (!host) return;
    if (priorAppraisal && en.score !== null) {
      ui.barChart(host, { labels: ['Before training', 'After training'], values: [priorAppraisal.score, en.score], valueFormatter: function (v) { return v + '%'; } });
    } else {
      host.innerHTML = '<div class="fb-faint fb-small">Not enough data yet for a before/after comparison.</div>';
    }
  }

  function openModal(r) {
    var en = r.enrollmentId ? store.getById('enrollments', r.enrollmentId) : null;
    var c = en ? store.getById('courses', en.courseId) : null;
    var body = '<div class="fb-xs fb-faint">Employee</div><p class="fb-bold">' + ui.escapeHtml(store.employeeName(r.employeeId)) + '</p>' +
      (c ? '<div class="fb-xs fb-faint">Course</div><p class="fb-bold">' + ui.escapeHtml(c.title) + '</p>' : '') +
      '<hr class="fb-divider" />';
    if (r.type === 'Post-Learning Evaluation') body += '<div class="fb-form-section-title">Performance comparison</div><div id="eval-chart"></div>';
    var footer = r.status.indexOf('Pending') === 0 || r.status.indexOf('Completed') !== 0 ? '<button class="fb-btn fb-btn--primary" data-act="complete">Mark form completed</button>' : '';
    ui.modal({
      title: r.type, body: body, footer: footer,
      onMount: function (box) {
        beforeAfterChart(box, r);
        var btn = box.querySelector('[data-act="complete"]');
        if (btn) btn.addEventListener('click', function () { store.update('evaluations', r.id, { status: 'Completed' }); ui.closeModal(); ui.toast('Evaluation marked complete.', 'success'); renderTable(); });
      }
    });
  }

  function openNewFeedbackModal() {
    var enrollments = store.get('enrollments').filter(function (e) { return e.status === 'Completed'; });
    if (!enrollments.length) { ui.toast('No completed courses to attach feedback to yet.', 'error'); return; }
    var body = '<div class="fb-field"><label>Completed enrollment</label><select id="ef-enr">' + enrollments.map(function (e) { var c = store.getById('courses', e.courseId); return '<option value="' + e.id + '">' + ui.escapeHtml(store.employeeName(e.employeeId)) + ' — ' + (c ? ui.escapeHtml(c.title) : '') + '</option>'; }).join('') + '</select></div>';
    ui.modal({
      title: 'Log course &amp; presentation feedback', body: body, footer: '<button class="fb-btn fb-btn--primary" data-act="save">Save</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var en = store.getById('enrollments', document.getElementById('ef-enr').value);
          store.insert('evaluations', { employeeId: en.employeeId, enrollmentId: en.id, type: 'Course & Presentation Feedback', status: 'Completed' });
          ui.closeModal(); ui.toast('Feedback form logged.', 'success'); renderTable();
        });
      }
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    renderTable();
    document.getElementById('fb-btn-new-feedback').addEventListener('click', openNewFeedbackModal);
  });
})();
