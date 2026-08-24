/* ==========================================================================
   Page logic: Recruitment & Selection (admin/hrbp/recruitment.html)
   Flagship module — requisition approval, candidate pipeline, assessments,
   interviews, offers, and the onboarding handoff into the Employee record.
   Detail/creation use the large drawer (not a small modal) so the approval
   workflow, full candidate profile, and rich creation forms all have room.
   ========================================================================== */
(function () {
  'use strict';
  var store, ui;
  var STAGES = ['Applied', 'Screening', 'Shortlisted', 'Testing', 'Interviewing', 'Offer', 'Hired'];
  var STAGE_LABELS = { Applied: 'Applied', Screening: 'Screening', Shortlisted: 'Shortlisted', Testing: 'Testing', Interviewing: 'Interviewing', Offer: 'Offer Sent', Hired: 'Hired' };
  var REQ_STAGES = ['Submitted', 'HRBP Review', 'Head of HR Approval'];
  var JD_LIBRARY = {
    'Medical Sales Representative': 'Promote and sell the assigned product portfolio to healthcare professionals and pharmacies within the territory; achieve monthly sales targets; maintain call-cycle compliance and CRM records; support product launches and CME events.',
    'QC Analyst': 'Perform routine and non-routine analytical testing of raw materials, in-process and finished products per approved SOPs and pharmacopoeia methods; maintain GLP/GMP documentation; support investigations and stability studies.',
    'Production Officer': 'Operate and monitor manufacturing equipment per batch manufacturing records; ensure GMP compliance on the shop floor; complete in-process checks and documentation; support changeovers and line clearance.',
    'ERP Analyst': 'Support configuration, testing and rollout of ERP/HRIS modules; gather requirements from business units; troubleshoot user issues; maintain system documentation and access controls.'
  };

  function reqTitle(r) { return r ? r.title : 'Unknown role'; }
  function jdFor(r) { return r.jobDescription || JD_LIBRARY[r.title] || ''; }

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
        { key: 'status', label: 'Status', render: function (r) { return r.status === 'Pending Approval' && r.pendingStage ? ui.badge(r.status) + ' <span class="fb-xs fb-faint">(' + ui.escapeHtml(r.pendingStage) + ')</span>' : ui.badge(r.status); } },
        { key: 'createdAt', label: 'Created', render: function (r) { return ui.fmtDate(r.createdAt); } }
      ],
      onRowClick: openRequisitionDrawer,
      emptyMessage: 'No requisitions yet. Click "New requisition" to start one.'
    });
  }

  // ---------------- Requisition detail + approval workflow drawer ----------------
  function requisitionDisplaySteps(req) {
    var steps = (req.approvalHistory || []).slice();
    if (req.status === 'Pending Approval' && req.pendingStage) {
      var approverLabel = req.delegateApproverId ? store.employeeName(req.delegateApproverId) + ' (delegated)' : (req.pendingStage === 'HRBP Review' ? 'HR Business Partner' : 'Head, HR & Admin');
      steps.push({ stage: req.pendingStage, actor: approverLabel, action: 'Awaiting decision', status: 'current' });
      REQ_STAGES.slice(REQ_STAGES.indexOf(req.pendingStage) + 1).forEach(function (s) { steps.push({ stage: s, status: 'pending' }); });
    } else if (req.status === 'Draft') {
      REQ_STAGES.forEach(function (s) { steps.push({ stage: s, status: 'pending' }); });
    }
    return steps;
  }

  function openRequisitionDrawer(req) {
    var candidates = store.find('candidates', function (c) { return c.requisitionId === req.id; });
    var overviewHtml = '' +
      '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Department</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.departmentName(req.departmentId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Grade / Cadre</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.cadreName(req.cadreId)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Headcount</div><div class="fb-detail-item__value">' + req.headcount + '</div></div>' +
      '<div><div class="fb-detail-item__label">Requested by</div><div class="fb-detail-item__value">' + ui.escapeHtml(store.employeeName(req.requestedBy)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Date submitted</div><div class="fb-detail-item__value">' + ui.fmtDate(req.createdAt) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Approved by</div><div class="fb-detail-item__value">' + (req.approvedBy ? ui.escapeHtml(store.employeeName(req.approvedBy)) : '—') + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-form-section-title">Business justification</div><p class="fb-small">' + ui.escapeHtml(req.justification) + '</p>' +
      '<div class="fb-form-section-title">Job description</div><p class="fb-small">' + (jdFor(req) ? ui.escapeHtml(jdFor(req)) : '<span class="fb-faint">Not yet provided — HOD/HR to supply after final approval, or select from the JD library.</span>') + '</p>' +
      (req.status === 'Approved' ? '<div class="fb-scope-note">This requisition is open — candidates can now be added from the Candidates tab or the Candidate Pipeline.</div>' : '');

    var candidatesHtml = candidates.length
      ? '<div class="fb-table-wrap"><table class="fb-table"><thead><tr><th>Candidate</th><th>Source</th><th>Stage</th></tr></thead><tbody>' +
        candidates.map(function (c) { return '<tr class="is-clickable" data-open-candidate="' + c.id + '"><td>' + ui.personCell(c.name) + '</td><td class="fb-cell-muted">' + ui.escapeHtml(c.source) + '</td><td>' + ui.badge(c.status) + '</td></tr>'; }).join('') +
        '</tbody></table></div>'
      : '<div class="fb-empty">No candidates linked yet.</div>';

    var workflowHtml = '<div id="req-workflow-timeline"></div>';
    var canAct = req.status === 'Draft' || req.status === 'Pending Approval';
    if (canAct) {
      workflowHtml += '<div class="fb-form-card" style="margin-top:20px">' +
        '<div class="fb-form-card__title">Decision notes</div>' +
        '<div class="fb-field" style="margin-bottom:10px"><textarea id="req-decision-note" placeholder="Optional note to attach to this decision..."></textarea></div>';
      if (req.status === 'Pending Approval') {
        var reviewers = store.get('employees').filter(function (e) { return e.status === 'Active' && (e.cadreId === 'CAD-5' || e.cadreId === 'CAD-6' || e.cadreId === 'CAD-7'); });
        workflowHtml += '<div class="fb-field"><label>Delegate this approval to (optional)</label><div class="fb-flex"><select id="req-delegate" style="flex:1">' +
          '<option value="">— No delegation —</option>' + reviewers.map(function (e) { return '<option value="' + e.id + '" ' + (req.delegateApproverId === e.id ? 'selected' : '') + '>' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(e.jobTitle) + '</option>'; }).join('') +
          '</select><button class="fb-btn fb-btn--sm" data-act="delegate">Delegate</button></div></div>';
      }
      workflowHtml += '</div>';
    }

    var footer = '';
    if (req.status === 'Draft') footer = '<button class="fb-btn fb-btn--primary" data-act="submit">Submit for HRBP review</button>';
    else if (req.status === 'Pending Approval' && req.pendingStage === 'HRBP Review') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="endorse">Endorse &amp; forward to Head of HR</button>';
    else if (req.status === 'Pending Approval' && req.pendingStage === 'Head of HR Approval') footer = '<button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="approve">Approve requisition</button>';

    ui.drawer({
      eyebrow: 'Requisition · ' + req.id,
      title: req.title,
      subtitle: ui.badge(req.status) + (req.pendingStage ? ' <span class="fb-xs fb-faint">— with ' + ui.escapeHtml(req.pendingStage) + '</span>' : ''),
      size: 'xl',
      tabs: [{ key: 'overview', label: 'Overview' }, { key: 'workflow', label: 'Approval Workflow' }, { key: 'candidates', label: 'Candidates (' + candidates.length + ')' }],
      body: '' +
        '<section data-fb-tabpanel="overview">' + overviewHtml + '</section>' +
        '<section data-fb-tabpanel="workflow" style="display:none">' + workflowHtml + '</section>' +
        '<section data-fb-tabpanel="candidates" style="display:none">' + candidatesHtml + '</section>',
      footer: footer,
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#req-workflow-timeline'), requisitionDisplaySteps(req));
        box.querySelectorAll('[data-open-candidate]').forEach(function (row) {
          row.addEventListener('click', function () {
            var c = store.getById('candidates', row.getAttribute('data-open-candidate'));
            if (c) openCandidateDrawer(c);
          });
        });
        function note() { var el = box.querySelector('#req-decision-note'); return el ? el.value.trim() : ''; }
        function bind(sel, fn) { var el = box.querySelector(sel); if (el) el.addEventListener('click', fn); }
        bind('[data-act="delegate"]', function () {
          var val = box.querySelector('#req-delegate').value;
          store.update('requisitions', req.id, { delegateApproverId: val || null });
          if (val) { store.notify('Requisition approval delegated', reqTitle(req) + ' delegated to ' + store.employeeName(val) + '.', 'Recruitment', 'admin/hrbp/recruitment.html'); ui.toast('Delegated to ' + store.employeeName(val) + '.', 'success'); }
          else ui.toast('Delegation cleared.', 'info');
          renderRequisitionsTable();
        });
        bind('[data-act="submit"]', function () {
          store.recordApproval('requisitions', req.id, { stage: 'Submitted', action: 'Submitted requisition', comment: note() || req.justification, patch: { status: 'Pending Approval', pendingStage: 'HRBP Review' } });
          store.notify('Requisition pending approval', req.title + ' submitted by ' + store.employeeName(req.requestedBy) + ' needs HRBP review.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeDrawer(); ui.toast('Requisition submitted for HRBP review.', 'success'); renderRequisitionsTable();
        });
        bind('[data-act="endorse"]', function () {
          store.recordApproval('requisitions', req.id, { stage: 'HRBP Review', actorId: req.delegateApproverId || undefined, action: 'Endorsed', comment: note() || 'Reviewed against approved headcount plan — endorsed.', patch: { pendingStage: 'Head of HR Approval', delegateApproverId: null } });
          store.notify('Requisition awaiting final approval', req.title + ' endorsed by HRBP — now with Head of HR & Admin.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeDrawer(); ui.toast('Endorsed and forwarded to Head of HR.', 'success'); renderRequisitionsTable();
        });
        bind('[data-act="approve"]', function () {
          store.recordApproval('requisitions', req.id, { stage: 'Head of HR Approval', actorId: req.delegateApproverId || undefined, action: 'Approved', comment: note() || 'Approved. Headcount confirmed against budget.', patch: { status: 'Approved', pendingStage: null, delegateApproverId: null, approvedBy: store.currentUser().id } });
          store.notify('Requisition approved', req.title + ' is now open for candidates.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeDrawer(); ui.toast('Requisition approved. It is now open for candidates.', 'success'); renderRequisitionsTable(); renderReqSelect();
        });
        bind('[data-act="reject"]', function () {
          var stage = req.pendingStage || 'Submitted';
          store.recordApproval('requisitions', req.id, { stage: stage, actorId: req.delegateApproverId || undefined, action: 'Rejected', comment: note() || 'Not approved at this time.', status: 'rejected', patch: { status: 'Rejected', pendingStage: null, delegateApproverId: null } });
          ui.closeDrawer(); ui.toast('Requisition rejected.', 'error'); renderRequisitionsTable();
        });
      }
    });
  }

  function openNewRequisitionModal() {
    var depts = store.get('departments');
    var cadres = store.get('cadres');
    var jdTitles = Object.keys(JD_LIBRARY);
    var reviewers = store.get('employees').filter(function (e) { return e.status === 'Active' && (e.cadreId === 'CAD-5' || e.cadreId === 'CAD-6' || e.cadreId === 'CAD-7'); });
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">📋 Role details</div>' +
      '<div class="fb-field"><label>Job title</label><input type="text" id="nr-title" placeholder="e.g. Production Officer" list="jd-titles" /><datalist id="jd-titles">' + jdTitles.map(function (t) { return '<option value="' + ui.escapeHtml(t) + '">'; }).join('') + '</datalist></div>' +
      '<div class="fb-field-row">' +
      '<div class="fb-field"><label>Department</label><select id="nr-dept">' + depts.map(function (d) { return '<option value="' + d.id + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Grade / Cadre</label><select id="nr-cadre">' + cadres.map(function (c) { return '<option value="' + c.id + '">' + ui.escapeHtml(c.name) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div class="fb-field"><label>Headcount</label><input type="number" id="nr-headcount" min="1" value="1" /></div></div>' +

      '<div class="fb-form-card"><div class="fb-form-card__title">📝 Job description</div>' +
      '<div class="fb-field"><label>Select from JD library (optional)</label><select id="nr-jd-select"><option value="">— Write manually below —</option>' + jdTitles.map(function (t) { return '<option value="' + ui.escapeHtml(t) + '">' + ui.escapeHtml(t) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field"><label>Job description text</label><textarea id="nr-jd" placeholder="Key responsibilities, requirements..."></textarea><div class="fb-hint">Can also be supplied by the HOD or HR after final approval.</div></div></div>' +

      '<div class="fb-form-card"><div class="fb-form-card__title">✅ Approval routing</div>' +
      '<div class="fb-field"><label>Business justification</label><textarea id="nr-justification" placeholder="Why is this role needed? Budget line, attrition backfill, new initiative, etc."></textarea></div>' +
      '<div class="fb-field"><label>Delegate approver (optional)</label><select id="nr-delegate"><option value="">— Standard HRBP → Head of HR routing —</option>' + reviewers.map(function (e) { return '<option value="' + e.id + '">' + ui.escapeHtml(e.firstName + ' ' + e.lastName) + ' — ' + ui.escapeHtml(e.jobTitle) + '</option>'; }).join('') + '</select><div class="fb-hint">Route this requisition\'s approval to a specific delegate instead of the default reviewer.</div></div></div>';

    ui.drawer({
      title: 'New requisition', subtitle: 'Routes through HRBP review, then Head of HR & Admin for final approval.',
      body: body,
      footer: '<button class="fb-btn" data-act="draft">Save as draft</button><button class="fb-btn fb-btn--primary" data-act="submit">Save &amp; submit for approval</button>',
      onMount: function (box) {
        box.querySelector('#nr-jd-select').addEventListener('change', function (e) {
          if (e.target.value) { box.querySelector('#nr-jd').value = JD_LIBRARY[e.target.value]; box.querySelector('#nr-title').value = e.target.value; }
        });
        box.querySelector('#nr-title').addEventListener('input', function (e) {
          if (JD_LIBRARY[e.target.value] && !box.querySelector('#nr-jd').value.trim()) {
            box.querySelector('#nr-jd').value = JD_LIBRARY[e.target.value];
            box.querySelector('#nr-jd-select').value = e.target.value;
          }
        });
        function collect() {
          return {
            title: document.getElementById('nr-title').value.trim(), departmentId: document.getElementById('nr-dept').value, cadreId: document.getElementById('nr-cadre').value,
            headcount: Number(document.getElementById('nr-headcount').value) || 1,
            jobDescription: document.getElementById('nr-jd').value.trim(),
            justification: document.getElementById('nr-justification').value.trim() || 'No justification provided.',
            delegateApproverId: document.getElementById('nr-delegate').value || null
          };
        }
        function bind(sel, fn) { box.querySelector(sel).addEventListener('click', fn); }
        bind('[data-act="draft"]', function () {
          var f = collect();
          if (!f.title) { ui.toast('Enter a job title first.', 'error'); return; }
          store.insert('requisitions', Object.assign(f, { status: 'Draft', pendingStage: null, requestedBy: store.currentUser().id, approvedBy: null, approvalHistory: [] }));
          ui.closeDrawer(); ui.toast('Requisition saved as draft.', 'success'); renderRequisitionsTable();
        });
        bind('[data-act="submit"]', function () {
          var f = collect();
          if (!f.title) { ui.toast('Enter a job title first.', 'error'); return; }
          var req = store.insert('requisitions', Object.assign(f, { status: 'Pending Approval', pendingStage: 'HRBP Review', requestedBy: store.currentUser().id, approvedBy: null, approvalHistory: [] }));
          store.recordApproval('requisitions', req.id, { stage: 'Submitted', action: 'Submitted requisition', comment: f.justification });
          store.notify('Requisition pending approval', f.title + ' submitted by ' + store.employeeName(req.requestedBy) + ' needs HRBP review.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeDrawer(); ui.toast('Requisition submitted for HRBP review.', 'success'); renderRequisitionsTable();
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
      onCardClick: openCandidateDrawer
    });
  }

  function assessmentFor(candidateId) { return store.findOne('assessments', function (t) { return t.candidateId === candidateId; }); }
  function interviewFor(candidateId) { return store.findOne('interviews', function (t) { return t.candidateId === candidateId; }); }
  function offerFor(candidateId) { return store.findOne('offers', function (t) { return t.candidateId === candidateId; }); }

  function advanceCandidate(c, nextStatus, extra) {
    store.update('candidates', c.id, Object.assign({ status: nextStatus }, extra || {}));
  }
  function logCandidateStep(c, stage, action, comment, status) {
    store.recordApproval('candidates', c.id, { stage: stage, action: action, comment: comment || '', status: status || 'done' });
  }

  function candidateDisplaySteps(c) {
    var steps = (store.getById('candidates', c.id) || c).approvalHistory ? (store.getById('candidates', c.id) || c).approvalHistory.slice() : [];
    if (c.status !== 'Rejected' && c.status !== 'Hired') {
      var idx = STAGES.indexOf(c.status);
      steps.push({ stage: STAGE_LABELS[c.status], status: 'current', action: 'In progress' });
      STAGES.slice(idx + 1).forEach(function (s) { steps.push({ stage: STAGE_LABELS[s], status: 'pending' }); });
    }
    return steps;
  }

  function openCandidateDrawer(c) {
    c = store.getById('candidates', c.id) || c; // always work off the freshest record
    var req = store.getById('requisitions', c.requisitionId);
    var assessment = assessmentFor(c.id);
    var interview = interviewFor(c.id);
    var offer = offerFor(c.id);
    var guarantor = store.findOne('guarantorChecks', function (g) { return g.employeeId === c.linkedEmployeeId; });

    var profileHtml = '<div class="fb-detail-grid">' +
      '<div><div class="fb-detail-item__label">Applying for</div><div class="fb-detail-item__value">' + ui.escapeHtml(reqTitle(req)) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Source</div><div class="fb-detail-item__value">' + ui.escapeHtml(c.source) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Email</div><div class="fb-detail-item__value">' + ui.escapeHtml(c.email) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Phone</div><div class="fb-detail-item__value">' + ui.escapeHtml(c.phone) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Education</div><div class="fb-detail-item__value">' + ui.escapeHtml(c.education) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Experience</div><div class="fb-detail-item__value">' + ui.escapeHtml(c.workHistory) + '</div></div>' +
      '<div><div class="fb-detail-item__label">Applied</div><div class="fb-detail-item__value">' + ui.fmtDate(c.appliedAt) + '</div></div>' +
      '</div><hr class="fb-divider" />' +
      '<div class="fb-form-section-title">Attachments</div>' +
      '<div class="fb-attachment"><span class="fb-attachment__icon">📄</span> ' + ui.escapeHtml(c.name.split(' ')[0]) + '_CV.pdf</div>' +
      '<div class="fb-attachment"><span class="fb-attachment__icon">📄</span> Cover_Letter.pdf</div>' +
      (c.status === 'Hired' ? '<div class="fb-scope-note">Hired — now tracked as employee <strong>' + (c.linkedEmployeeId ? ui.escapeHtml(store.employee(c.linkedEmployeeId).staffId) : '') + '</strong>. See the Onboarding tab.</div>' : '');

    var pipelineHtml = '<div id="cand-workflow-timeline"></div>';
    var actionHtml = '';
    if (c.status === 'Applied') actionHtml = '<div class="fb-btn-row"><button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="screen">Move to screening</button></div>';
    else if (c.status === 'Screening') actionHtml = '<div class="fb-btn-row"><button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="shortlist">Shortlist candidate</button></div>';
    else if (c.status === 'Shortlisted') actionHtml = '<div class="fb-btn-row"><button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="test">Send for testing</button></div>';
    else if (c.status === 'Testing') {
      actionHtml = '<div class="fb-form-card"><div class="fb-form-card__title">Assessment</div>' +
        '<div class="fb-field"><label>' + ui.escapeHtml(assessment ? assessment.testName : 'Role Assessment Test') + ' — score (%)</label><input type="number" id="cm-score" min="0" max="100" value="' + (assessment && assessment.score !== null ? assessment.score : '') + '" /></div></div>' +
        '<div class="fb-btn-row"><button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="interview">Record score &amp; schedule interview</button></div>';
    } else if (c.status === 'Interviewing') {
      actionHtml = '<div class="fb-form-card"><div class="fb-form-card__title">Interview feedback</div>' +
        '<div class="fb-field"><label>Panel notes</label><textarea id="cm-feedback">' + ui.escapeHtml(interview ? interview.feedback : '') + '</textarea></div>' +
        '<div class="fb-field"><label>Overall score (out of 5)</label><input type="number" id="cm-iscore" min="0" max="5" step="0.1" value="' + (interview && interview.score ? interview.score : '') + '" /></div></div>' +
        '<div class="fb-btn-row"><button class="fb-btn fb-btn--danger" data-act="reject">Reject</button><button class="fb-btn fb-btn--primary" data-act="offer">Submit feedback &amp; move to offer</button></div>';
    } else if (c.status === 'Offer') {
      if (offer && offer.status === 'Sent') {
        actionHtml = '<div class="fb-scope-note">Offer sent for <strong>' + ui.fmtMoney(offer.salary) + '</strong>/year, proposed start ' + ui.fmtDate(offer.startDate) + '. Awaiting candidate e-signature.</div>' +
          '<div class="fb-btn-row"><button class="fb-btn fb-btn--danger" data-act="offer-rejected">Offer rejected</button><button class="fb-btn fb-btn--primary" data-act="offer-accepted">Offer accepted &amp; signed</button></div>';
      } else {
        actionHtml = '<div class="fb-form-card"><div class="fb-form-card__title">Offer details</div>' +
          '<div class="fb-field-row"><div class="fb-field"><label>Annual salary (₦)</label><input type="number" id="cm-salary" placeholder="e.g. 3800000" /></div>' +
          '<div class="fb-field"><label>Proposed start date</label><input type="date" id="cm-start" /></div></div></div>' +
          '<div class="fb-btn-row"><button class="fb-btn fb-btn--primary" data-act="send-offer">Generate &amp; send offer letter</button></div>';
      }
    }
    pipelineHtml += actionHtml ? '<div style="margin-top:20px">' + actionHtml + '</div>' : '';

    var docsHtml = '<div class="fb-form-section-title">Document checklist</div>' +
      ['Means of identification', 'Academic certificates', 'Professional certifications', 'Reference letters'].map(function (d) { return '<div class="fb-checkbox"><input type="checkbox" checked disabled /><label>' + d + '</label></div>'; }).join('') +
      '<hr class="fb-divider" />' +
      '<div class="fb-form-section-title">Guarantor verification</div>' +
      (guarantor
        ? '<div class="fb-detail-grid"><div><div class="fb-detail-item__label">Guarantor 1</div><div class="fb-detail-item__value">' + ui.escapeHtml(guarantor.guarantor1Name) + '</div></div><div><div class="fb-detail-item__label">Guarantor 2</div><div class="fb-detail-item__value">' + ui.escapeHtml(guarantor.guarantor2Name) + '</div></div></div><div style="margin-top:10px">' + ui.badge(guarantor.status) + '</div>'
        : '<p class="fb-small fb-faint">Guarantor check is initiated after offer acceptance. See Guarantor Verification module.</p>');

    ui.drawer({
      eyebrow: 'Candidate · ' + reqTitle(req),
      title: c.name,
      subtitle: ui.badge(c.status),
      size: 'xl',
      tabs: [{ key: 'profile', label: 'Profile' }, { key: 'pipeline', label: 'Pipeline & Assessment' }, { key: 'docs', label: 'Documents & Guarantor' }],
      body: '' +
        '<section data-fb-tabpanel="profile">' + profileHtml + '</section>' +
        '<section data-fb-tabpanel="pipeline" style="display:none">' + pipelineHtml + '</section>' +
        '<section data-fb-tabpanel="docs" style="display:none">' + docsHtml + '</section>',
      onMount: function (box) {
        ui.workflowTimeline(box.querySelector('#cand-workflow-timeline'), candidateDisplaySteps(c));
        function bind(sel, fn) { var el = box.querySelector(sel); if (el) el.addEventListener('click', fn); }
        bind('[data-act="reject"]', function () { advanceCandidate(c, 'Rejected'); logCandidateStep(c, STAGE_LABELS[c.status] || c.status, 'Not progressed', 'Candidate rejected at this stage.', 'rejected'); ui.closeDrawer(); ui.toast(c.name + ' has been rejected.', 'info'); refreshPipeline(); });
        bind('[data-act="screen"]', function () { advanceCandidate(c, 'Screening'); logCandidateStep(c, 'Screening', 'Moved to screening'); ui.closeDrawer(); ui.toast('Moved to screening.', 'success'); refreshPipeline(); });
        bind('[data-act="shortlist"]', function () { advanceCandidate(c, 'Shortlisted'); logCandidateStep(c, 'Shortlisted', 'Shortlisted', 'Manually reviewed and shortlisted.'); ui.closeDrawer(); ui.toast('Candidate shortlisted.', 'success'); refreshPipeline(); });
        bind('[data-act="test"]', function () {
          if (!assessment) store.insert('assessments', { candidateId: c.id, testName: 'Role Assessment Test', score: null, status: 'Scheduled', takenAt: new Date().toISOString() });
          advanceCandidate(c, 'Testing'); logCandidateStep(c, 'Testing', 'Sent for assessment', 'Assessment test assigned.');
          ui.closeDrawer(); ui.toast('Assessment created. Candidate notified.', 'success'); refreshPipeline();
        });
        bind('[data-act="interview"]', function () {
          var score = Number(document.getElementById('cm-score').value) || 0;
          if (assessment) store.update('assessments', assessment.id, { score: score, status: score >= 50 ? 'Passed' : 'Failed' });
          else store.insert('assessments', { candidateId: c.id, testName: 'Role Assessment Test', score: score, status: score >= 50 ? 'Passed' : 'Failed', takenAt: new Date().toISOString() });
          if (!interview) store.insert('interviews', { candidateId: c.id, requisitionId: c.requisitionId, date: new Date().toISOString(), interviewers: [store.currentUser().id], feedback: '', score: null, status: 'Scheduled' });
          advanceCandidate(c, 'Interviewing'); logCandidateStep(c, 'Testing', 'Scored ' + score + '%', score >= 50 ? 'Passed assessment — interview scheduled.' : 'Below pass mark but progressed for panel review.');
          ui.closeDrawer(); ui.toast('Score recorded. Interview scheduled.', 'success'); refreshPipeline();
        });
        bind('[data-act="offer"]', function () {
          var feedback = document.getElementById('cm-feedback').value.trim();
          var iscore = Number(document.getElementById('cm-iscore').value) || null;
          if (interview) store.update('interviews', interview.id, { feedback: feedback, score: iscore, status: 'Completed' });
          else store.insert('interviews', { candidateId: c.id, requisitionId: c.requisitionId, date: new Date().toISOString(), interviewers: [store.currentUser().id], feedback: feedback, score: iscore, status: 'Completed' });
          advanceCandidate(c, 'Offer'); logCandidateStep(c, 'Interviewing', 'Interview scored ' + (iscore || '—') + '/5', feedback || 'Panel feedback recorded.');
          ui.closeDrawer(); ui.toast('Feedback submitted. Candidate moved to offer stage.', 'success'); refreshPipeline();
        });
        bind('[data-act="send-offer"]', function () {
          var salary = Number(document.getElementById('cm-salary').value) || 0;
          var start = document.getElementById('cm-start').value || new Date().toISOString().slice(0, 10);
          store.insert('offers', { candidateId: c.id, requisitionId: c.requisitionId, salary: salary, startDate: start, status: 'Sent', sentAt: new Date().toISOString() });
          logCandidateStep(c, 'Offer', 'Offer sent', ui.fmtMoney(salary) + '/year, proposed start ' + ui.fmtDate(start) + '.');
          store.notify('Offer sent — ' + c.name, ui.fmtMoney(salary) + ' offer sent for ' + reqTitle(req) + '.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeDrawer(); ui.toast('Offer letter generated and sent for e-signature.', 'success'); refreshPipeline();
        });
        bind('[data-act="offer-rejected"]', function () {
          store.update('offers', offer.id, { status: 'Rejected' });
          advanceCandidate(c, 'Rejected');
          logCandidateStep(c, 'Offer', 'Offer declined', 'Candidate declined the offer.', 'rejected');
          store.notify('Offer declined — ' + c.name, 'Candidate declined the offer for ' + reqTitle(req) + '.', 'Recruitment', 'admin/hrbp/recruitment.html');
          ui.closeDrawer(); ui.toast('Offer marked as rejected.', 'error'); refreshPipeline();
        });
        bind('[data-act="offer-accepted"]', function () { acceptOffer(c, req, offer); });
      }
    });
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
    logCandidateStep(candidate, 'Offer', 'Offer accepted & signed', 'Candidate converted to employee record ' + employee.staffId + '.');
    ['Offer letter countersigned', 'IT account & email provisioned', 'Certificate of resumption submitted', 'Welcome pack & ID card issued', 'Line manager introduction & desk setup', 'Payroll & benefits enrollment']
      .forEach(function (task, idx) {
        store.insert('onboardingTasks', { employeeId: employee.id, task: task, owner: idx === 2 ? 'New Hire' : 'HR', status: idx < 2 ? 'Completed' : 'Not Started', dueDate: new Date().toISOString() });
      });
    store.notify('Offer accepted — ' + candidate.name, 'Onboarding checklist created for ' + reqTitle(req) + '. Track it in the Onboarding tab.', 'Recruitment', 'admin/hrbp/recruitment.html');
    store.auditLog(store.currentUser().id, 'Converted candidate to employee', 'Employee', employee.id);
    ui.closeDrawer();
    ui.toast(candidate.name + ' hired! Onboarding checklist created.', 'success');
    refreshPipeline();
  }

  function openNewCandidateModal() {
    var reqs = store.find('requisitions', function (r) { return r.status === 'Approved'; });
    if (!reqs.length) { ui.toast('Approve a requisition first before adding candidates.', 'error'); return; }
    var body = '' +
      '<div class="fb-form-card"><div class="fb-form-card__title">👤 Candidate details</div>' +
      '<div class="fb-field"><label>Requisition</label><select id="nc-req">' + reqs.map(function (r) { return '<option value="' + r.id + '">' + ui.escapeHtml(r.title) + ' — ' + ui.escapeHtml(store.departmentName(r.departmentId)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Full name</label><input type="text" id="nc-name" /></div><div class="fb-field"><label>Source</label><select id="nc-source"><option>Careers Page</option><option>LinkedIn</option><option>Referral</option><option>Recruitment Agency</option></select></div></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Email</label><input type="email" id="nc-email" /></div><div class="fb-field"><label>Phone</label><input type="text" id="nc-phone" /></div></div>' +
      '<div class="fb-field-row"><div class="fb-field"><label>Education</label><input type="text" id="nc-edu" placeholder="e.g. B.Pharm, University of Lagos" /></div><div class="fb-field"><label>Years of experience</label><input type="text" id="nc-exp" placeholder="e.g. 4 years relevant experience" /></div></div></div>' +
      '<div class="fb-form-card"><div class="fb-form-card__title">📎 Application materials</div>' +
      '<div class="fb-field"><label>Notes / cover letter summary</label><textarea id="nc-notes" placeholder="Anything notable from the application..."></textarea></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="nc-cv" checked /><label for="nc-cv">CV attached</label></div>' +
      '<div class="fb-checkbox"><input type="checkbox" id="nc-cover" checked /><label for="nc-cover">Cover letter attached</label></div></div>';
    ui.drawer({
      title: 'Add candidate', subtitle: 'Records an application received against an approved requisition.', body: body,
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
            workHistory: document.getElementById('nc-exp').value.trim() || 'Not yet captured', status: 'Applied', appliedAt: new Date().toISOString().slice(0, 10), approvalHistory: []
          });
          logCandidateStep(c, 'Applied', 'Application received via ' + c.source, document.getElementById('nc-notes').value.trim() || 'Automated screening queued against role criteria.');
          ui.closeDrawer();
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
      if (req) openRequisitionDrawer(req);
    }
  });
})();
