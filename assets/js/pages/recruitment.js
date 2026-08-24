/* ==========================================================================
   Page logic: Recruitment & Selection (admin/hrbp/recruitment.html)
   Flagship module — requisition approval, candidate pipeline, assessments,
   interviews, offers, and the onboarding handoff into the Employee record.
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Applied', 'Screening', 'Shortlisted', 'Testing', 'Interviewing', 'Offer', 'Hired'];
  var STAGE_LABELS = { Applied: 'Applied', Screening: 'Screening', Shortlisted: 'Shortlisted', Testing: 'Testing', Interviewing: 'Interviewing', Offer: 'Offer Sent', Hired: 'Hired' };

  function reqTitle(r) { return r ? r.title : 'Unknown role'; }

  function renderRequisitionsTable() {
    var reqs = store.get('requisitions').slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    document.getElementById('fb-req-count').textContent = reqs.length + ' requisition(s)';
    ui.table({
      container: '#fb-req-table',
      rows: reqs,
      searchable: true,
      searchKeys: ['title'],
      filter: { key: 'status', options: ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Filled'] },
      columns: [
        { key: 'title', label: 'Role', render: function (r) { return ui.personCell(r.title, store.departmentName(r.departmentId)); } },
        { key: 'cadreId', label: 'Grade', render: function (r) { return ui.escapeHtml(store.cadreName(r.cadreId)); } },
        { key: 'headcount', label: 'Headcount' },
        { key: 'requestedBy', label: 'Requested by', render: function (r) { return ui.escapeHtml(store.employeeName(r.requestedBy)); } },
        { key: 'candidates', label: 'Candidates', render: function (r) { return store.find('candidates', function (c) { return c.requisitionId === r.id; }).length; } },
        { key: 'status', label: 'Status', render: function (r) { return ui.badge(r.status); } },
        { key: 'createdAt', label: 'Created', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openRequisitionModal,
      emptyMessage: 'No requisitions yet. Click "New requisition" to start one.'
    });
  }

  function stepIndexForRequisition(status) {
    if (status === 'Rejected') return 1;
    return ['Draft', 'Pending Approval', 'Approved'].indexOf(status === 'Filled' ? 'Approved' : status);
  }

  function openRequisitionModal(req) {
    var candCount = store.find('candidates', function (c) { return c.requisitionId === req.id; }).length;
    var stepIdx = stepIndexForRequisition(req.status);
    var body = '' +
      '<div id="fb-req-stepper"></div>' +
      '<div class="fb-grid fb-grid--2">' +
        '<div><div class="fb-xs fb-faint">Department</div><div class="fb-bold">' + ui.escapeHtml(store.departmentName(req.departmentId)) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Grade / Cadre</div><div class="fb-bold">' + ui.escapeHtml(store.cadreName(req.cadreId)) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Headcount</div><div class="fb-bold">' + req.headcount + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Requested by</div><div class="fb-bold">' + ui.escapeHtml(store.employeeName(req.requestedBy)) + '</div></div>' +
      '</div>' +
      '<hr class="fb-divider" />' +
      '<div class="fb-xs fb-faint">Justification</div><p class="fb-small">' + ui.escapeHtml(req.justification) + '</p>' +
      '<div class="fb-xs fb-faint">Candidates linked to this requisition</div><p class="fb-small">' + candCount + ' candidate(s) — see the Candidate Pipeline tab.</p>';

    var footer = '';
    if (req.status === 'Draft') footer = '<button class="fb-btn" data-act="submit">Submit for approval</button>';
    if (req.status === 'Pending Approval') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="approve">Approve</button>';

    var m = ui.modal({
      title: req.title,
      body: body,
      footer: footer,
      onMount: function (box) {
        ui.stepper(box.querySelector('#fb-req-stepper'), ['Draft', 'Pending Approval', 'Approved'], stepIdx, { rejectedIndex: req.status === 'Rejected' ? 1 : -1 });
        var submitBtn = box.querySelector('[data-act="submit"]');
        if (submitBtn) submitBtn.addEventListener('click', function () {
          store.update('requisitions', req.id, { status: 'Pending Approval' });
          store.notify('Requisition pending approval', req.title + ' submitted by ' + store.employeeName(req.requestedBy) + ' needs your approval.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeModal(); ui.toast('Requisition submitted for approval.', 'success'); renderRequisitionsTable();
        });
        var approveBtn = box.querySelector('[data-act="approve"]');
        if (approveBtn) approveBtn.addEventListener('click', function () {
          store.update('requisitions', req.id, { status: 'Approved', approvedBy: store.currentUser().id });
          store.notify('Requisition approved', req.title + ' is now open for candidates.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeModal(); ui.toast('Requisition approved. It is now open for candidates.', 'success'); renderRequisitionsTable(); renderReqSelect();
        });
        var rejectBtn = box.querySelector('[data-act="reject"]');
        if (rejectBtn) rejectBtn.addEventListener('click', function () {
          store.update('requisitions', req.id, { status: 'Rejected' });
          ui.closeModal(); ui.toast('Requisition rejected.', 'error'); renderRequisitionsTable();
        });
      }
    });
    return m;
  }

  function openNewRequisitionModal() {
    var depts = store.get('departments');
    var cadres = store.get('cadres');
    var body = '' +
      '<div class="fb-field"><label>Job title</label><input type="text" id="nr-title" placeholder="e.g. Production Officer" /></div>' +
      '<div class="fb-field-row">' +
        '<div class="fb-field"><label>Department</label><select id="nr-dept">' + depts.map(function (d) { return '<option value="' + d.id + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="fb-field"><label>Grade / Cadre</label><select id="nr-cadre">' + cadres.map(function (c) { return '<option value="' + c.id + '">' + ui.escapeHtml(c.name) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div class="fb-field"><label>Headcount</label><input type="number" id="nr-headcount" min="1" value="1" /></div>' +
      '<div class="fb-field"><label>Justification</label><textarea id="nr-justification" placeholder="Why is this role needed?"></textarea></div>';
    ui.modal({
      title: 'New requisition',
      body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="create">Save as draft</button>',
      onMount: function (box) {
        box.querySelector('[data-act="create"]').addEventListener('click', function () {
          var title = document.getElementById('nr-title').value.trim();
          if (!title) { ui.toast('Enter a job title first.', 'error'); return; }
          var req = store.insert('requisitions', {
            title: title, departmentId: document.getElementById('nr-dept').value, cadreId: document.getElementById('nr-cadre').value,
            headcount: Number(document.getElementById('nr-headcount').value) || 1,
            justification: document.getElementById('nr-justification').value.trim() || 'No justification provided.',
            status: 'Draft', requestedBy: store.currentUser().id, approvedBy: null
          });
          ui.closeModal(); ui.toast('Requisition created as draft.', 'success'); renderRequisitionsTable();
        });
      }
    });
  }

  function renderReqSelect() {
    var sel = document.getElementById('fb-req-select');
    var reqs = store.get('requisitions');
    var current = sel.value;
    sel.innerHTML = reqs.map(function (r) {
      var count = store.find('candidates', function (c) { return c.requisitionId === r.id; }).length;
      return '<option value="' + r.id + '">' + ui.escapeHtml(r.title) + ' — ' + ui.escapeHtml(store.departmentName(r.departmentId)) + ' (' + count + ')</option>';
    }).join('');
    if (current && reqs.some(function (r) { return r.id === current; })) sel.value = current;
  }

  function renderPipeline(reqId) {
    var candidates = store.find('candidates', function (c) { return c.requisitionId === reqId; });
    ui.kanban({
      container: '#fb-pipeline-kanban',
      columns: STAGES.map(function (s) { return { key: s, label: STAGE_LABELS[s] }; }).concat([{ key: 'Rejected', label: 'Rejected' }]),
      cards: candidates,
      cardKey: 'status',
      renderCard: function (c) {
        return '<div class="fb-kanban__card-title">' + ui.escapeHtml(c.name) + '</div>' +
          '<div class="fb-xs fb-faint">' + ui.escapeHtml(c.source) + '</div>' +
          '<div class="fb-kanban__card-meta"><span>' + ui.escapeHtml(c.education.split(',')[0]) + '</span></div>';
      },
      onCardClick: openCandidateModal
    });
  }

  function assessmentFor(candidateId) { return store.findOne('assessments', function (t) { return t.candidateId === candidateId; }); }
  function interviewFor(candidateId) { return store.findOne('interviews', function (t) { return t.candidateId === candidateId; }); }
  function offerFor(candidateId) { return store.findOne('offers', function (t) { return t.candidateId === candidateId; }); }

  function advanceCandidate(c, nextStatus, extra) {
    store.update('candidates', c.id, Object.assign({ status: nextStatus }, extra || {}));
  }

  function openCandidateModal(c) {
    var req = store.getById('requisitions', c.requisitionId);
    var stageIdx = STAGES.indexOf(c.status);
    var assessment = assessmentFor(c.id);
    var interview = interviewFor(c.id);
    var offer = offerFor(c.id);

    var infoHtml = '' +
      '<div id="fb-cand-stepper"></div>' +
      '<div class="fb-grid fb-grid--2">' +
        '<div><div class="fb-xs fb-faint">Applying for</div><div class="fb-bold">' + ui.escapeHtml(reqTitle(req)) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Source</div><div class="fb-bold">' + ui.escapeHtml(c.source) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Email</div><div class="fb-bold">' + ui.escapeHtml(c.email) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Phone</div><div class="fb-bold">' + ui.escapeHtml(c.phone) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Education</div><div class="fb-bold">' + ui.escapeHtml(c.education) + '</div></div>' +
        '<div><div class="fb-xs fb-faint">Experience</div><div class="fb-bold">' + ui.escapeHtml(c.workHistory) + '</div></div>' +
      '</div><hr class="fb-divider" />';

    var stageHtml = '', footer = '';
    if (c.status === 'Applied') {
      stageHtml = '<p class="fb-small fb-muted">Automated screening will check this application against the role’s predefined criteria.</p>';
      footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="screen">Move to screening</button>';
    } else if (c.status === 'Screening') {
      stageHtml = '<p class="fb-small fb-muted">Manual review by the business partner before shortlisting.</p>';
      footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="shortlist">Shortlist candidate</button>';
    } else if (c.status === 'Shortlisted') {
      stageHtml = '<p class="fb-small fb-muted">Create and assign an assessment test aligned to this role.</p>';
      footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="test">Send for testing</button>';
    } else if (c.status === 'Testing') {
      stageHtml = assessment
        ? '<div class="fb-field"><label>' + ui.escapeHtml(assessment.testName) + ' — score (%)</label><input type="number" id="cm-score" min="0" max="100" value="' + (assessment.score || '') + '" /></div>'
        : '<p class="fb-small fb-muted">No assessment on file — one will be created.</p><div class="fb-field"><label>Score (%)</label><input type="number" id="cm-score" min="0" max="100" placeholder="e.g. 78" /></div>';
      footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="interview">Record score &amp; schedule interview</button>';
    } else if (c.status === 'Interviewing') {
      stageHtml = '<div class="fb-field"><label>Interview feedback</label><textarea id="cm-feedback" placeholder="Panel notes...">' + ui.escapeHtml(interview ? interview.feedback : '') + '</textarea></div>' +
        '<div class="fb-field"><label>Overall score (out of 5)</label><input type="number" id="cm-iscore" min="0" max="5" step="0.1" value="' + (interview && interview.score ? interview.score : '') + '" /></div>';
      footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="offer">Submit feedback &amp; move to offer</button>';
    } else if (c.status === 'Offer') {
      if (offer && offer.status === 'Sent') {
        stageHtml = '<div class="fb-scope-note">Offer sent for <strong>' + ui.fmtMoney(offer.salary) + '</strong>/year, proposed start ' + ui.fmtDate(offer.startDate) + '. Awaiting candidate e-signature.</div>';
        footer = '<button class="fb-btn fb-btn--danger" data-act="offer-rejected">Offer rejected</button><button class="fb-btn fb-btn--primary" data-act="offer-accepted">Offer accepted &amp; signed</button>';
      } else {
        stageHtml = '<div class="fb-field-row"><div class="fb-field"><label>Annual salary (₦)</label><input type="number" id="cm-salary" placeholder="e.g. 3800000" /></div>' +
          '<div class="fb-field"><label>Proposed start date</label><input type="date" id="cm-start" /></div></div>';
        footer = '<button class="fb-btn fb-btn--primary" data-act="send-offer">Generate &amp; send offer letter</button>';
      }
    } else if (c.status === 'Hired') {
      var emp = c.linkedEmployeeId ? store.employee(c.linkedEmployeeId) : null;
      stageHtml = '<div class="fb-scope-note">Hired' + (emp ? ' — now tracked as employee <strong>' + ui.escapeHtml(emp.staffId) + '</strong>, status <strong>' + ui.escapeHtml(emp.status) + '</strong>. See the Onboarding tab.' : '.') + '</div>';
    } else if (c.status === 'Rejected') {
      stageHtml = '<div class="fb-restricted-note">Candidate was not progressed.</div>';
    }

    var m = ui.modal({
      title: c.name, wide: true, body: infoHtml + stageHtml, footer: footer,
      onMount: function (box) {
        var stepEl = box.querySelector('#fb-cand-stepper');
        if (c.status === 'Rejected') ui.stepper(stepEl, STAGES.map(function (s) { return STAGE_LABELS[s]; }), 0, { rejectedIndex: 0 });
        else ui.stepper(stepEl, STAGES.map(function (s) { return STAGE_LABELS[s]; }), stageIdx);

        function bind(sel, fn) { var el = box.querySelector(sel); if (el) el.addEventListener('click', fn); }
        bind('[data-act="reject"]', function () { advanceCandidate(c, 'Rejected'); ui.closeModal(); ui.toast(c.name + ' has been rejected.', 'info'); refreshPipeline(); });
        bind('[data-act="screen"]', function () { advanceCandidate(c, 'Screening'); ui.closeModal(); ui.toast('Moved to screening.', 'success'); refreshPipeline(); });
        bind('[data-act="shortlist"]', function () { advanceCandidate(c, 'Shortlisted'); ui.closeModal(); ui.toast('Candidate shortlisted.', 'success'); refreshPipeline(); });
        bind('[data-act="test"]', function () {
          if (!assessment) store.insert('assessments', { candidateId: c.id, testName: 'Role Assessment Test', score: null, status: 'Scheduled', takenAt: new Date().toISOString() });
          advanceCandidate(c, 'Testing'); ui.closeModal(); ui.toast('Assessment created. Candidate notified.', 'success'); refreshPipeline();
        });
        bind('[data-act="interview"]', function () {
          var score = Number(document.getElementById('cm-score').value) || 0;
          if (assessment) store.update('assessments', assessment.id, { score: score, status: score >= 50 ? 'Passed' : 'Failed' });
          else store.insert('assessments', { candidateId: c.id, testName: 'Role Assessment Test', score: score, status: score >= 50 ? 'Passed' : 'Failed', takenAt: new Date().toISOString() });
          if (!interview) store.insert('interviews', { candidateId: c.id, requisitionId: c.requisitionId, date: new Date().toISOString(), interviewers: [store.currentUser().id], feedback: '', score: null, status: 'Scheduled' });
          advanceCandidate(c, 'Interviewing'); ui.closeModal(); ui.toast('Score recorded. Interview scheduled.', 'success'); refreshPipeline();
        });
        bind('[data-act="offer"]', function () {
          var feedback = document.getElementById('cm-feedback').value.trim();
          var iscore = Number(document.getElementById('cm-iscore').value) || null;
          if (interview) store.update('interviews', interview.id, { feedback: feedback, score: iscore, status: 'Completed' });
          else store.insert('interviews', { candidateId: c.id, requisitionId: c.requisitionId, date: new Date().toISOString(), interviewers: [store.currentUser().id], feedback: feedback, score: iscore, status: 'Completed' });
          advanceCandidate(c, 'Offer'); ui.closeModal(); ui.toast('Feedback submitted. Candidate moved to offer stage.', 'success'); refreshPipeline();
        });
        bind('[data-act="send-offer"]', function () {
          var salary = Number(document.getElementById('cm-salary').value) || 0;
          var start = document.getElementById('cm-start').value || new Date().toISOString().slice(0, 10);
          store.insert('offers', { candidateId: c.id, requisitionId: c.requisitionId, salary: salary, startDate: start, status: 'Sent', sentAt: new Date().toISOString() });
          store.notify('Offer sent — ' + c.name, ui.fmtMoney(salary) + ' offer sent for ' + reqTitle(req) + '.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeModal(); ui.toast('Offer letter generated and sent for e-signature.', 'success'); refreshPipeline();
        });
        bind('[data-act="offer-rejected"]', function () {
          store.update('offers', offer.id, { status: 'Rejected' });
          advanceCandidate(c, 'Rejected');
          store.notify('Offer declined — ' + c.name, 'Candidate declined the offer for ' + reqTitle(req) + '.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeModal(); ui.toast('Offer marked as rejected.', 'error'); refreshPipeline();
        });
        bind('[data-act="offer-accepted"]', function () { acceptOffer(c, req, offer); });
      }
    });
    return m;
  }

  function acceptOffer(candidate, req, offer) {
    store.update('offers', offer.id, { status: 'Accepted', signedAt: new Date().toISOString() });
    var nameParts = candidate.name.split(' ');
    var employee = store.insert('employees', {
      staffId: 'FBP-PENDING', firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') || nameParts[0],
      email: candidate.email, phone: candidate.phone, gender: 'Unspecified',
      departmentId: req.departmentId, unit: null, jobTitle: req.title, cadreId: req.cadreId,
      managerId: req.requestedBy, status: 'Onboarding', confirmationStatus: 'Probation',
      employmentDate: offer.startDate, location: 'Lagos HQ (Obanikoro)', photoInitials: ui.initials(candidate.name)
    });
    store.update('employees', employee.id, { staffId: 'FBP-' + employee.id.split('-')[1] });
    advanceCandidate(candidate, 'Hired', { linkedEmployeeId: employee.id });
    ['Offer letter countersigned', 'IT account & email provisioned', 'Certificate of resumption submitted', 'Welcome pack & ID card issued', 'Line manager introduction & desk setup', 'Payroll & benefits enrollment']
      .forEach(function (task, idx) {
        store.insert('onboardingTasks', { employeeId: employee.id, task: task, owner: idx === 2 ? 'New Hire' : 'HR', status: 'Not Started', dueDate: new Date().toISOString() });
      });
    store.notify('Offer accepted — ' + candidate.name, 'Onboarding checklist created for ' + reqTitle(req) + '. Track it in the Onboarding tab.', 'Recruitment', 'admin/hrbp/recruitment.html');
    store.auditLog(store.currentUser().id, 'Converted candidate to employee', 'Employee', employee.id);
    ui.closeModal();
    ui.toast(candidate.name + ' hired! Onboarding checklist created.', 'success');
    refreshPipeline();
  }

  function openNewCandidateModal() {
    var reqs = store.find('requisitions', function (r) { return r.status === 'Approved'; });
    var body = '' +
      '<div class="fb-field"><label>Requisition</label><select id="nc-req">' + reqs.map(function (r) { return '<option value="' + r.id + '">' + ui.escapeHtml(r.title) + ' — ' + ui.escapeHtml(store.departmentName(r.departmentId)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Full name</label><input type="text" id="nc-name" /></div><div class="fb-field"><label>Source</label><select id="nc-source"><option>Careers Page</option><option>LinkedIn</option><option>Referral</option><option>Recruitment Agency</option></select></div></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Email</label><input type="email" id="nc-email" /></div><div class="fb-field"><label>Phone</label><input type="text" id="nc-phone" /></div></div>' +
      '<div class="fb-field"><label>Education</label><input type="text" id="nc-edu" placeholder="e.g. B.Pharm, University of Lagos" /></div>';
    if (!reqs.length) { ui.toast('Approve a requisition first before adding candidates.', 'error'); return; }
    ui.modal({
      title: 'Add candidate (application received)', body: body,
      footer: '<button class="fb-btn fb-btn--primary" data-act="save">Save application</button>',
      onMount: function (box) {
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var name = document.getElementById('nc-name').value.trim();
          if (!name) { ui.toast('Enter the candidate’s name.', 'error'); return; }
          var c = store.insert('candidates', {
            requisitionId: document.getElementById('nc-req').value, name: name,
            email: document.getElementById('nc-email').value.trim() || 'unknown@example.com',
            phone: document.getElementById('nc-phone').value.trim() || '—',
            source: document.getElementById('nc-source').value,
            education: document.getElementById('nc-edu').value.trim() || 'Not specified',
            workHistory: 'Not yet captured', status: 'Applied'
          });
          ui.closeModal();
          ui.toast('Application received. Acknowledgement email sent to ' + name + '.', 'success');
          renderRequisitionsTable(); renderReqSelect(); renderPipeline(document.getElementById('fb-req-select').value);
        });
      }
    });
  }

  function refreshPipeline() {
    renderRequisitionsTable();
    renderReqSelect();
    var sel = document.getElementById('fb-req-select');
    if (sel.value) renderPipeline(sel.value);
    renderOnboarding();
  }

  function renderOnboarding() {
    var onboardingEmployees = store.find('employees', function (e) { return e.status === 'Onboarding'; });
    var host = document.getElementById('fb-onboarding-list');
    if (!onboardingEmployees.length) { host.innerHTML = '<div class="fb-empty"><div class="fb-empty__icon">🎉</div>No new hires currently onboarding.</div>'; return; }
    host.innerHTML = onboardingEmployees.map(function (emp) {
      var tasks = store.find('onboardingTasks', function (t) { return t.employeeId === emp.id; });
      var done = tasks.filter(function (t) { return t.status === 'Completed'; }).length;
      var pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      return '<div class="fb-card" style="margin-bottom:16px">' +
        '<div class="fb-card__head"><span>' + ui.personCell(emp.firstName + ' ' + emp.lastName, emp.jobTitle + ' · ' + store.departmentName(emp.departmentId)) + '</span>' + ui.badge('Onboarding') + '</div>' +
        '<div id="prog-' + emp.id + '"></div>' +
        '<div class="fb-xs fb-faint" style="margin:6px 0 12px">' + done + ' of ' + tasks.length + ' onboarding tasks complete</div>' +
        '<div class="fb-table-wrap"><table class="fb-table"><tbody>' + tasks.map(function (t) {
          return '<tr><td style="width:28px"><input type="checkbox" data-onb-id="' + t.id + '" ' + (t.status === 'Completed' ? 'checked' : '') + ' /></td><td class="fb-cell-primary">' + ui.escapeHtml(t.task) + '</td><td class="fb-cell-muted">' + ui.escapeHtml(t.owner) + '</td><td>' + ui.badge(t.status) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (pct === 100 ? '<div class="fb-btn-row" style="margin-top:12px"><button class="fb-btn fb-btn--primary" data-activate="' + emp.id + '">Convert to active employee</button></div>' : '') +
        '</div>';
    }).join('');
    onboardingEmployees.forEach(function (emp) {
      var tasks = store.find('onboardingTasks', function (t) { return t.employeeId === emp.id; });
      var done = tasks.filter(function (t) { return t.status === 'Completed'; }).length;
      ui.progressBar('#prog-' + emp.id, tasks.length ? (done / tasks.length) * 100 : 0);
    });
    host.querySelectorAll('[data-onb-id]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        store.update('onboardingTasks', cb.getAttribute('data-onb-id'), { status: cb.checked ? 'Completed' : 'Not Started' });
        renderOnboarding();
      });
    });
    host.querySelectorAll('[data-activate]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var empId = btn.getAttribute('data-activate');
        store.update('employees', empId, { status: 'Active' });
        var emp = store.employee(empId);
        store.notify('Welcome ' + emp.firstName + ' ' + emp.lastName + '!', 'Please join us in welcoming ' + emp.firstName + ' ' + emp.lastName + ' to the ' + store.departmentName(emp.departmentId) + ' team as ' + emp.jobTitle + '.', 'Recruitment', 'admin/hrbp/org-structure.html');
        store.auditLog(store.currentUser().id, 'Activated employee after onboarding', 'Employee', empId);
        ui.toast(emp.firstName + ' is now an active employee. Company-wide welcome sent.', 'success');
        renderOnboarding();
      });
    });
  }

  FB.events.on('shell:ready', function () {
    store = FB.store; ui = FB.ui;
    ui.wireTabs('#fb-page-root', function (key) { if (key === 'pipeline') renderPipeline(document.getElementById('fb-req-select').value); if (key === 'onboarding') renderOnboarding(); });

    renderRequisitionsTable();
    renderReqSelect();
    document.getElementById('fb-req-select').addEventListener('change', function (e) { renderPipeline(e.target.value); });

    document.getElementById('fb-btn-new-req').addEventListener('click', openNewRequisitionModal);
    document.getElementById('fb-btn-new-candidate').addEventListener('click', openNewCandidateModal);

    var focus = new URLSearchParams(location.search).get('focus');
    if (focus) {
      var req = store.getById('requisitions', focus);
      if (req) openRequisitionModal(req);
    }
  });
})();
