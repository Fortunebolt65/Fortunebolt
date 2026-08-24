/* ==========================================================================
   Fortunebolt Pharmaceuticals Plc — seed dataset
   Pure data generation. No DOM, no localStorage — assets/js/store.js decides
   when to load this. Deterministic (seeded PRNG) so a "Reset demo data"
   action always reproduces the same starting world.
   ========================================================================== */
(function (global) {
  'use strict';

  // ---- seeded PRNG (mulberry32) so regenerated data is stable ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260824);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const pickN = (arr, n) => { const c = arr.slice(); const out = []; while (out.length < n && c.length) { out.push(c.splice(Math.floor(rand() * c.length), 1)[0]); } return out; };
  const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const bool = (p) => rand() < (p === undefined ? 0.5 : p);
  const pad = (n, w) => String(n).padStart(w, '0');
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const daysFromNow = (n) => daysAgo(-n);

  const FIRST_NAMES = ['Adaeze','Chinedu','Ifeoma','Emeka','Ngozi','Uche','Chiamaka','Obinna','Chukwuemeka','Amarachi',
    'Oluwaseun','Adebayo','Folake','Babatunde','Temitope','Yetunde','Ayodele','Damilola','Kehinde','Taiwo',
    'Fatima','Aminu','Zainab','Ibrahim','Hauwa','Musa','Halima','Yusuf','Abubakar','Maryam',
    'Efe','Kesiena','Ohis','Osaze','Iredia','Osayande','Blessing','Precious','Emmanuel','Grace',
    'Edidiong','Uduak','Anietie','Idorenyin','Ifiok','Aniekan','Mfon','Ekaette','Etim','Nseobong',
    'Chidinma','Nkechi','Ikenna','Chibuzor','Adaugo','Somtochukwu','Chinelo','Kelechi','Nnamdi','Ijeoma'];
  const LAST_NAMES = ['Okafor','Eze','Nwosu','Okonkwo','Chukwu','Obi','Nwachukwu','Onuoha','Uche','Ibe',
    'Adeyemi','Ogundipe','Bakare','Okunola','Adewale','Ogunleye','Fashola','Ajayi','Balogun','Afolabi',
    'Mohammed','Bello','Sani','Garba','Suleiman','Aliyu','Yakubu','Usman','Danladi','Lawal',
    'Etuk','Udoh','Akpan','Essien','Umoh','Bassey','Ekong','Inyang','Udo','Okon',
    'Fidelis','Nnamdi','Uzoma','Nwankwo','Agu','Iheanacho','Madu','Anyanwu','Emeka','Duru'];
  const usedEmails = new Set();
  function fullName() { return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; }
  function emailFor(first, last, seq) {
    let base = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
    let email = `${base}@fortunebolt-pharma.com`;
    if (usedEmails.has(email)) email = `${base}${seq}@fortunebolt-pharma.com`;
    usedEmails.add(email);
    return email;
  }
  function phoneFor() { return `080${int(1, 9)}${int(1000000, 9999999)}`; }

  const DEPARTMENTS = [
    { id: 'DPT-HRA', name: 'HR & Admin', short: 'HR & Admin' },
    { id: 'DPT-MFG', name: 'Manufacturing', short: 'Manufacturing' },
    { id: 'DPT-QAQ', name: 'Quality Assurance & Control', short: 'QA/QC' },
    { id: 'DPT-RND', name: 'Research & Development', short: 'R&D' },
    { id: 'DPT-REG', name: 'Regulatory Affairs', short: 'Regulatory' },
    { id: 'DPT-SCL', name: 'Supply Chain & Logistics', short: 'Supply Chain' },
    { id: 'DPT-SNM', name: 'Sales & Marketing', short: 'Sales & Marketing' },
    { id: 'DPT-BDV', name: 'Business Development', short: 'Biz Dev' },
    { id: 'DPT-FIN', name: 'Finance', short: 'Finance' },
    { id: 'DPT-ITS', name: 'Information Technology', short: 'IT' },
    { id: 'DPT-EXE', name: 'Executive Office', short: 'Executive' }
  ];

  const HR_UNITS = [
    { id: 'UNIT-HRBP', name: 'HR Business Partnering', inScope: true },
    { id: 'UNIT-LD', name: 'Learning & Development', inScope: true },
    { id: 'UNIT-HW', name: 'Health & Wellness (Clinic)', inScope: true },
    { id: 'UNIT-RB', name: 'Rewards & Benefits', inScope: false },
    { id: 'UNIT-ADM', name: 'Admin (Facilities)', inScope: false }
  ];

  const CADRES = [
    { id: 'CAD-1', name: 'Officer', level: 1 },
    { id: 'CAD-2', name: 'Senior Officer', level: 2 },
    { id: 'CAD-3', name: 'Assistant Manager', level: 3 },
    { id: 'CAD-4', name: 'Manager', level: 4 },
    { id: 'CAD-5', name: 'Senior Manager', level: 5 },
    { id: 'CAD-6', name: 'Head of Department', level: 6 },
    { id: 'CAD-7', name: 'Executive Director', level: 7 }
  ];

  const JOB_TITLES = {
    'DPT-HRA': ['HR Business Partner', 'L&D Officer', 'Talent Acquisition Specialist', 'Clinic Nurse', 'Occupational Health Officer', 'HR Analyst', 'Payroll & Benefits Officer', 'HR Manager'],
    'DPT-MFG': ['Production Officer', 'Line Supervisor', 'Machine Operator', 'Manufacturing Manager', 'Process Engineer', 'Production Planner'],
    'DPT-QAQ': ['QC Analyst', 'QA Officer', 'Validation Officer', 'QA/QC Manager', 'Microbiologist'],
    'DPT-RND': ['Formulation Scientist', 'R&D Officer', 'Analytical Chemist', 'R&D Manager'],
    'DPT-REG': ['Regulatory Affairs Officer', 'Pharmacovigilance Officer', 'Regulatory Affairs Manager'],
    'DPT-SCL': ['Warehouse Officer', 'Logistics Coordinator', 'Procurement Officer', 'Supply Chain Manager', 'Inventory Analyst'],
    'DPT-SNM': ['Medical Sales Representative', 'Territory Manager', 'Brand Manager', 'Sales & Marketing Manager', 'Key Account Executive'],
    'DPT-BDV': ['Business Development Officer', 'Product Development Analyst', 'Business Development Manager'],
    'DPT-FIN': ['Financial Accountant', 'Treasury Officer', 'Finance Manager', 'Internal Auditor', 'Credit Control Officer'],
    'DPT-ITS': ['IT Support Officer', 'Systems Administrator', 'ERP Analyst', 'IT Manager'],
    'DPT-EXE': ['Executive Assistant', 'Company Secretary', 'Managing Director']
  };

  const LOCATIONS = ['Lagos HQ (Obanikoro)', 'Lagos Manufacturing Plant', 'Port Harcourt Depot', 'Abuja Regional Office', 'Kano Regional Office'];

  let seq = { emp: 0, req: 0, cand: 0, test: 0, intv: 0, off: 0, onb: 0, apr: 0, car: 0, tna: 0, tpl: 0, crs: 0, enr: 0, evl: 0, dsc: 0, exi: 0, wel: 0, sur: 0, med: 0, bil: 0, vac: 0, drg: 0, sck: 0, notif: 0, audit: 0, lve: 0, esr: 0, gtv: 0, sch: 0 };
  function nid(prefix, kind) { seq[kind] += 1; return `${prefix}-${pad(seq[kind], 4)}`; }

  function buildSeed() {
    const now = new Date().toISOString();

    // ---------------- Employees ----------------
    const employees = [];
    function makeEmployee(overrides) {
      const first = overrides.firstName || pick(FIRST_NAMES);
      const last = overrides.lastName || pick(LAST_NAMES);
      const id = overrides.id || nid('EMP', 'emp');
      const dept = overrides.departmentId || pick(DEPARTMENTS).id;
      const cadre = overrides.cadreId || pick(CADRES.slice(0, 5)).id;
      const emp = Object.assign({
        id,
        staffId: `FBP-${id.split('-')[1]}`,
        firstName: first,
        lastName: last,
        email: emailFor(first, last, seq.emp),
        phone: phoneFor(),
        gender: bool() ? 'Female' : 'Male',
        departmentId: dept,
        unit: dept === 'DPT-HRA' ? pick(['UNIT-HRBP', 'UNIT-LD', 'UNIT-HW', 'UNIT-RB', 'UNIT-ADM']) : null,
        jobTitle: pick(JOB_TITLES[dept]),
        cadreId: cadre,
        managerId: null,
        status: 'Active',
        confirmationStatus: 'Confirmed',
        employmentDate: daysAgo(int(120, 2200)),
        location: pick(LOCATIONS),
        photoInitials: (first[0] + last[0]).toUpperCase()
      }, overrides);
      employees.push(emp);
      return emp;
    }

    // Leadership / named anchors used across storylines
    const md = makeEmployee({ firstName: 'Folasade', lastName: 'Adeyemi', departmentId: 'DPT-EXE', cadreId: 'CAD-7', jobTitle: 'Managing Director', employmentDate: daysAgo(3000) });
    const hrHead = makeEmployee({ firstName: 'Alli', lastName: 'Adejoke', departmentId: 'DPT-HRA', unit: 'UNIT-HRBP', cadreId: 'CAD-6', jobTitle: 'Head, HR & Admin', managerId: md.id, employmentDate: daysAgo(2400) });
    const admin = makeEmployee({ firstName: 'Edidiong', lastName: 'Udoh', departmentId: 'DPT-HRA', unit: 'UNIT-HRBP', cadreId: 'CAD-5', jobTitle: 'HR Business Partner (System Admin)', managerId: hrHead.id, employmentDate: daysAgo(1500) });
    const ldLead = makeEmployee({ firstName: 'Chiamaka', lastName: 'Nwosu', departmentId: 'DPT-HRA', unit: 'UNIT-LD', cadreId: 'CAD-5', jobTitle: 'L&D Manager', managerId: hrHead.id, employmentDate: daysAgo(1700) });
    const clinicLead = makeEmployee({ firstName: 'Ekaette', lastName: 'Bassey', departmentId: 'DPT-HRA', unit: 'UNIT-HW', cadreId: 'CAD-4', jobTitle: 'Clinic Nurse', managerId: hrHead.id, employmentDate: daysAgo(1300) });
    const hrbp2 = makeEmployee({ firstName: 'Damilola', lastName: 'Fashola', departmentId: 'DPT-HRA', unit: 'UNIT-HRBP', cadreId: 'CAD-3', jobTitle: 'HR Business Partner', managerId: hrHead.id, employmentDate: daysAgo(900) });

    // Department heads for approval chains
    const deptHeads = {};
    DEPARTMENTS.forEach((d) => {
      if (d.id === 'DPT-HRA' || d.id === 'DPT-EXE') return;
      deptHeads[d.id] = makeEmployee({ departmentId: d.id, cadreId: 'CAD-6', jobTitle: `${d.short} HOD`, managerId: md.id, employmentDate: daysAgo(int(1200, 2600)) });
    });

    // Bulk rank & file employees
    for (let i = 0; i < 46; i++) {
      const dept = pick(DEPARTMENTS.filter((d) => d.id !== 'DPT-EXE').map((d) => d.id));
      makeEmployee({ departmentId: dept, managerId: dept === 'DPT-HRA' ? hrHead.id : (deptHeads[dept] ? deptHeads[dept].id : md.id) });
    }

    // Onboarding-in-progress employee (fed by Recruitment flagship flow, see below)
    const newHire = makeEmployee({
      firstName: 'Ifeoma', lastName: 'Chukwu', departmentId: 'DPT-SNM', cadreId: 'CAD-2',
      jobTitle: 'Medical Sales Representative', managerId: deptHeads['DPT-SNM'].id,
      status: 'Onboarding', confirmationStatus: 'Probation', employmentDate: daysAgo(4)
    });

    // Employee on PIP (fed by Performance flagship flow)
    const pipEmployee = makeEmployee({
      firstName: 'Chukwuemeka', lastName: 'Nnamdi', departmentId: 'DPT-MFG', cadreId: 'CAD-2',
      jobTitle: 'Production Officer', managerId: deptHeads['DPT-MFG'].id, status: 'On PIP', employmentDate: daysAgo(760)
    });

    // Employee under disciplinary action
    const discEmployee = makeEmployee({
      firstName: 'Babatunde', lastName: 'Okunola', departmentId: 'DPT-SCL', cadreId: 'CAD-1',
      jobTitle: 'Warehouse Officer', managerId: deptHeads['DPT-SCL'].id, status: 'Active', employmentDate: daysAgo(540)
    });

    // Employee exiting
    const exitEmployee = makeEmployee({
      firstName: 'Yetunde', lastName: 'Balogun', departmentId: 'DPT-FIN', cadreId: 'CAD-3',
      jobTitle: 'Financial Accountant', managerId: deptHeads['DPT-FIN'].id, status: 'Exiting', employmentDate: daysAgo(1100)
    });

    // Employee in acting capacity (Performance confirmation storyline)
    const actingEmployee = makeEmployee({
      firstName: 'Nseobong', lastName: 'Etuk', departmentId: 'DPT-QAQ', cadreId: 'CAD-3',
      jobTitle: 'Acting QA/QC Manager', managerId: deptHeads['DPT-QAQ'].id, status: 'Active', employmentDate: daysAgo(980)
    });

    // ---------------- Requisitions, candidates, pipeline (Recruitment flagship) ----------------
    const requisitions = [];
    const candidates = [];
    const assessments = [];
    const interviews = [];
    const offers = [];
    const onboardingTasks = [];

    const nameOf = (e) => (e ? `${e.firstName} ${e.lastName}` : 'System');
    // Requisition approval chain: Submitted -> HRBP Review -> Head of HR Approval -> Approved (or Rejected at either review)
    function requisitionHistory(status, requester, createdAt, opts) {
      opts = opts || {};
      const steps = [{ stage: 'Submitted', actor: nameOf(requester), actorRole: requester ? requester.jobTitle : '', action: 'Submitted requisition', comment: opts.justification || '', timestamp: createdAt, status: 'done' }];
      if (status === 'Draft') return steps.slice(0, 0); // draft has no submission event yet
      if (status === 'Pending Approval' && opts.pendingStage === 'HRBP Review') return steps;
      const hrbpDate = new Date(new Date(createdAt).getTime() + 2 * 86400000).toISOString().slice(0, 10);
      steps.push({ stage: 'HRBP Review', actor: nameOf(hrbp2), actorRole: hrbp2.jobTitle, action: status === 'Rejected' && opts.rejectedAt === 'HRBP Review' ? 'Rejected' : 'Endorsed', comment: opts.hrbpComment || 'Reviewed against approved headcount plan — endorsed.', timestamp: hrbpDate, status: status === 'Rejected' && opts.rejectedAt === 'HRBP Review' ? 'rejected' : 'done' });
      if (status === 'Rejected' && opts.rejectedAt === 'HRBP Review') return steps;
      if (status === 'Pending Approval' && opts.pendingStage === 'Head of HR Approval') return steps;
      const hodDate = new Date(new Date(createdAt).getTime() + 4 * 86400000).toISOString().slice(0, 10);
      steps.push({ stage: 'Head of HR Approval', actor: nameOf(hrHead), actorRole: hrHead.jobTitle, action: status === 'Rejected' ? 'Rejected' : 'Approved', comment: opts.hrComment || (status === 'Rejected' ? 'Declined — headcount not available this cycle.' : 'Approved. Headcount confirmed against FY26 budget.'), timestamp: hodDate, status: status === 'Rejected' ? 'rejected' : 'done' });
      return steps;
    }
    function makeRequisition(o) {
      const requester = o.requestedByEmp || deptHeads['DPT-MFG'];
      const r = Object.assign({
        id: nid('REQ', 'req'), title: 'Officer', departmentId: 'DPT-MFG', cadreId: 'CAD-1', headcount: 1,
        justification: 'Backfill for approved headcount.', status: 'Approved', pendingStage: null, delegateApproverId: null,
        requestedBy: deptHeads['DPT-MFG'].id, approvedBy: hrHead.id, createdAt: daysAgo(30), approvalHistory: []
      }, o);
      if (!o.approvalHistory) r.approvalHistory = requisitionHistory(r.status, requester, r.createdAt, { justification: r.justification, pendingStage: r.pendingStage });
      delete r.requestedByEmp;
      requisitions.push(r);
      return r;
    }
    const CANDIDATE_STAGE_SEQUENCE = ['Applied', 'Screening', 'Shortlisted', 'Testing', 'Interviewing', 'Offer', 'Hired'];
    const CANDIDATE_STAGE_NOTES = {
      Applied: ['Application received via', 'Automated screening queued against role criteria.'],
      Screening: ['Passed automated screening', 'Meets minimum education & experience criteria — forwarded for BP review.'],
      Shortlisted: ['Shortlisted', 'Manually reviewed and shortlisted by the business partner.'],
      Testing: ['Sent for assessment', 'Role-specific assessment test assigned.'],
      Interviewing: ['Interview scheduled', 'Panel interview scheduled with hiring manager and HRBP.'],
      Offer: ['Moved to offer stage', 'Interview feedback positive — proceeding to offer.'],
      Hired: ['Offer accepted', 'Candidate signed offer letter and converted to employee record.']
    };
    function candidateHistory(status, appliedAt, source) {
      if (status === 'Rejected') {
        return chainAt([
          ['Applied', null, 0, CANDIDATE_STAGE_NOTES.Applied[0] + ' ' + source, CANDIDATE_STAGE_NOTES.Applied[1]],
          ['Screening', hrbp2, 1, 'Not progressed', 'Did not meet minimum criteria for this role.', 'rejected']
        ], appliedAt);
      }
      const upTo = CANDIDATE_STAGE_SEQUENCE.indexOf(status);
      const steps = CANDIDATE_STAGE_SEQUENCE.slice(0, upTo + 1).map((stage, i) => {
        const notes = CANDIDATE_STAGE_NOTES[stage];
        const actor = stage === 'Applied' ? null : hrbp2;
        const action = i === 0 ? notes[0] + ' ' + source : notes[0];
        return [stage, actor, i, action, notes[1]];
      });
      return chainAt(steps, appliedAt);
    }
    function makeCandidate(o) {
      const first = pick(FIRST_NAMES), last = pick(LAST_NAMES);
      const c = Object.assign({
        id: nid('CAN', 'cand'), name: `${first} ${last}`, email: emailFor(first, last, seq.cand + 900),
        phone: phoneFor(), source: pick(['Careers Page', 'LinkedIn', 'Referral', 'Recruitment Agency']),
        education: pick(['B.Pharm, University of Lagos', 'B.Sc Microbiology, UNN', 'HND Business Admin, YabaTech', 'B.Sc Chemistry, OAU', 'MBA, Lagos Business School']),
        workHistory: `${int(1, 8)} years relevant experience`, status: 'Applied', appliedAt: daysAgo(int(2, 25))
      }, o);
      if (!o.approvalHistory) c.approvalHistory = candidateHistory(c.status, c.appliedAt, c.source);
      candidates.push(c);
      return c;
    }

    // Flagship requisition #1 — full pipeline to hire, feeds the Onboarding module & new employee above
    const req1 = makeRequisition({ title: 'Medical Sales Representative', departmentId: 'DPT-SNM', cadreId: 'CAD-2', headcount: 2, justification: 'Territory expansion into North-Central region.', requestedBy: deptHeads['DPT-SNM'].id, requestedByEmp: deptHeads['DPT-SNM'], approvedBy: hrHead.id, createdAt: daysAgo(38), status: 'Approved' });
    const c1 = makeCandidate({ name: 'Ifeoma Chukwu', email: newHire.email, status: 'Hired', requisitionId: req1.id, appliedAt: daysAgo(32), source: 'Careers Page' });
    c1.linkedEmployeeId = newHire.id;
    assessments.push({ id: nid('TST', 'test'), candidateId: c1.id, testName: 'Sales Aptitude & Product Knowledge Test', score: 84, status: 'Passed', takenAt: daysAgo(24) });
    interviews.push({ id: nid('INT', 'intv'), candidateId: c1.id, requisitionId: req1.id, date: daysAgo(18), interviewers: [deptHeads['DPT-SNM'].id, hrbp2.id], feedback: 'Strong communicator, solid product knowledge, good culture fit.', score: 4.4, status: 'Completed' });
    offers.push({ id: nid('OFR', 'off'), candidateId: c1.id, requisitionId: req1.id, salary: 380000, startDate: daysAgo(4), status: 'Accepted', sentAt: daysAgo(10), signedAt: daysAgo(7) });
    ['Offer letter countersigned', 'IT account & email provisioned', 'Certificate of resumption submitted', 'Welcome pack & ID card issued', 'Line manager introduction & desk setup', 'Payroll & benefits enrollment'].forEach((task, idx) => {
      onboardingTasks.push({ id: nid('ONB', 'onb'), employeeId: newHire.id, task, owner: idx === 2 ? 'New Hire' : 'HR', status: idx < 2 ? 'Completed' : (idx === 2 ? 'Pending' : 'Not Started'), dueDate: daysFromNow(idx) });
    });
    // second candidate for req1, still mid-pipeline
    const c1b = makeCandidate({ requisitionId: req1.id, status: 'Interviewing' });
    interviews.push({ id: nid('INT', 'intv'), candidateId: c1b.id, requisitionId: req1.id, date: daysFromNow(3), interviewers: [deptHeads['DPT-SNM'].id], feedback: '', score: null, status: 'Scheduled' });

    // Requisition #2 — mid pipeline (screening/shortlist/testing) across QA/QC
    const req2 = makeRequisition({ title: 'QC Analyst', departmentId: 'DPT-QAQ', cadreId: 'CAD-1', headcount: 1, justification: 'New line validation workload.', requestedBy: deptHeads['DPT-QAQ'].id, requestedByEmp: deptHeads['DPT-QAQ'], status: 'Approved', createdAt: daysAgo(20) });
    makeCandidate({ requisitionId: req2.id, status: 'Shortlisted' });
    const q2c = makeCandidate({ requisitionId: req2.id, status: 'Testing' });
    assessments.push({ id: nid('TST', 'test'), candidateId: q2c.id, testName: 'QC Technical Assessment', score: null, status: 'Scheduled', takenAt: daysFromNow(2) });
    makeCandidate({ requisitionId: req2.id, status: 'Applied' });
    makeCandidate({ requisitionId: req2.id, status: 'Rejected' });

    // Requisition #3 — pending approval (tests the requisition workflow itself)
    const req3 = makeRequisition({ title: 'ERP Analyst', departmentId: 'DPT-ITS', cadreId: 'CAD-2', headcount: 1, justification: 'Support ongoing HR digitization rollout.', requestedBy: deptHeads['DPT-ITS'].id, requestedByEmp: deptHeads['DPT-ITS'], status: 'Pending Approval', pendingStage: 'HRBP Review', createdAt: daysAgo(3), approvedBy: null });

    // Requisition #4 — draft
    const req4 = makeRequisition({ title: 'Production Officer', departmentId: 'DPT-MFG', cadreId: 'CAD-1', headcount: 3, justification: 'New shift line for antimalarial batch scale-up.', requestedBy: deptHeads['DPT-MFG'].id, requestedByEmp: deptHeads['DPT-MFG'], status: 'Draft', createdAt: daysAgo(1), approvedBy: null });

    // A handful of extra light candidates on req2 for volume in list views
    for (let i = 0; i < 3; i++) makeCandidate({ requisitionId: req2.id, status: pick(['Applied', 'Screening']) });

    // ---------------- Performance appraisals (Perf/PIP + Interim/Confirmation) ----------------
    const appraisals = [];
    function makeAppraisal(o) {
      const a = Object.assign({ id: nid('APR', 'apr'), type: 'Annual', period: '2026 H1', score: null, status: 'Draft', reviewerId: null, resultNotes: '', createdAt: daysAgo(10) }, o);
      if (!a.approvalHistory) {
        const reviewer = a.reviewerId ? employee_ref(a.reviewerId) : null;
        const steps = [];
        if (a.status !== 'Draft') steps.push(['Submitted for Review', reviewer, 0, 'Submitted', a.resultNotes || `${a.type} appraisal submitted.`, 'done']);
        if (a.status === 'Approved' || a.status === 'Closed') steps.push(['Reviewed', reviewer, 2, 'Approved', a.score !== null ? `Scored ${a.score}%. ${a.resultNotes || ''}`.trim() : (a.resultNotes || 'Approved.')]);
        if (a.status === 'Closed') steps.push(['Closed', hrHead, 4, 'Closed', 'Outcome recorded to employee profile.']);
        a.approvalHistory = chainAt(steps, a.createdAt);
      }
      appraisals.push(a);
      return a;
    }
    // Flagship PIP storyline: annual appraisal scored <70 -> auto PIP
    makeAppraisal({
      employeeId: pipEmployee.id, type: 'Annual', period: '2026 H1', score: 58, status: 'Approved', reviewerId: deptHeads['DPT-MFG'].id,
      resultNotes: 'Missed 3 of 5 production quality KPIs. PIP auto-generated.', createdAt: daysAgo(45),
      approvalHistory: chain(
        ['Submitted for Review', deptHeads['DPT-MFG'], 45, 'Submitted', 'Annual appraisal submitted for 2026 H1 cycle.'],
        ['Scored', deptHeads['DPT-MFG'], 43, 'Scored 58%', 'Missed 3 of 5 production quality KPIs.'],
        ['Threshold Check', null, 43, 'PIP auto-generated', 'Score below the 70% threshold — a 60-day Performance Improvement Plan was generated automatically and L&D notified.']
      )
    });
    makeAppraisal({
      employeeId: pipEmployee.id, type: 'PIP', period: '60-day Improvement Plan', score: null, status: 'Pending Approval', reviewerId: deptHeads['DPT-MFG'].id,
      resultNotes: 'Weekly quality-checkpoint targets set with line supervisor; L&D notified for coaching support.', createdAt: daysAgo(40),
      approvalHistory: chain(['PIP Drafted', deptHeads['DPT-MFG'], 40, 'Drafted improvement plan', 'Weekly quality-checkpoint targets set with line supervisor.'])
    });
    // Interim / confirmation storyline
    makeAppraisal({ employeeId: newHire.id, type: 'Interim', period: '3-month interim review', score: null, status: 'Draft', reviewerId: deptHeads['DPT-SNM'].id, createdAt: daysAgo(1) });
    makeAppraisal({
      employeeId: actingEmployee.id, type: 'Acting Confirmation', period: 'Acting QA/QC Manager — 3 months', score: 88, status: 'Approved', reviewerId: hrHead.id,
      resultNotes: 'Recommended for substantive confirmation into role.', createdAt: daysAgo(12),
      approvalHistory: chain(
        ['Submitted for Review', deptHeads['DPT-QAQ'], 12, 'Submitted', 'Acting-role confirmation evaluation submitted after 3 months.'],
        ['Reviewed', hrHead, 9, 'Approved — 88%', 'Strong performance across all acting-role KPIs. Recommended for substantive confirmation.']
      )
    });
    // Pre-confirmation (9-month mark) storyline — a small batch at various stages
    pickN(employees.filter((e) => e.status === 'Active'), 3).forEach((e) => {
      makeAppraisal({ employeeId: e.id, type: 'Pre-confirmation', period: '9-month confirmation review', score: int(62, 95), status: pick(['Draft', 'Pending Approval', 'Approved']), reviewerId: e.managerId || hrHead.id, createdAt: daysAgo(int(2, 30)) });
    });
    // A bank of general annual appraisals across staff for HR Analytics realism
    const sample = pickN(employees.filter((e) => !['On PIP'].includes(e.status)), 22);
    sample.forEach((e) => {
      makeAppraisal({ employeeId: e.id, type: 'Annual', period: '2025 FY', score: int(58, 97), status: 'Approved', reviewerId: e.managerId || hrHead.id, createdAt: daysAgo(int(60, 300)) });
    });

    // ---------------- Talent management ----------------
    const careerPlans = pickN(employees.filter((e) => e.status === 'Active'), 10).map((e) => ({
      id: nid('CAR', 'car'), employeeId: e.id,
      desiredRole: pick(['Team Lead', 'Regional Manager', 'Specialist Track', 'HOD Successor', 'Cross-functional Rotation']),
      area: pick(DEPARTMENTS).short, timing: pick(['6-12 months', '1-2 years', '2-3 years']),
      status: pick(['Active', 'Under Review', 'Achieved'])
    }));

    // ---------------- Training needs / plan / LMS ----------------
    const trainingNeeds = [];
    const trainingPlans = [];
    const LMS_SYNCED_AT = daysAgo(0);
    const courses = [
      { id: nid('CRS', 'crs'), externalId: 'FLC-10231', title: 'CGMP Fundamentals Refresher', category: 'Compliance', format: 'Video', durationHrs: 3, points: 50 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10247', title: 'Pharmacovigilance Essentials', category: 'Regulatory', format: 'E-Learning', durationHrs: 4, points: 60 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10309', title: 'Advanced Selling Skills for MSRs', category: 'Sales', format: 'Webinar', durationHrs: 2, points: 30 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10118', title: 'Leadership Foundations', category: 'Leadership', format: 'Book + Workshop', durationHrs: 6, points: 80 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10355', title: 'Root Cause Analysis & CAPA', category: 'Quality', format: 'E-Learning', durationHrs: 3, points: 45 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10402', title: 'Data Analysis with Excel for HR', category: 'Digital Skills', format: 'Video', durationHrs: 5, points: 55 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10089', title: 'Workplace Safety & First Aid', category: 'HSE', format: 'In-person', durationHrs: 4, points: 40 },
      { id: nid('CRS', 'crs'), externalId: 'FLC-10276', title: 'Product Knowledge: Cardiovascular Portfolio', category: 'Product', format: 'SCORM Package', durationHrs: 2, points: 30 }
    ].map((c) => Object.assign(c, { source: 'Fortunebolt Learning Cloud', syncedAt: LMS_SYNCED_AT }));
    const enrollments = [];
    const evaluations = [];
    pickN(employees.filter((e) => e.status !== 'Exiting'), 24).forEach((e) => {
      const needStatus = pick(['Pending HOD Review', 'Approved', 'Rejected']);
      const needCreatedAt = daysAgo(int(5, 90));
      const hod = e.managerId ? employee_ref(e.managerId) : hrHead;
      const needHistorySteps = [['Need Identified', e, 0, 'Logged training need', 'Identified via performance appraisal skill-gap review.', 'done']];
      if (needStatus !== 'Pending HOD Review') needHistorySteps.push(['HOD Review', hod, 2, needStatus === 'Rejected' ? 'Rejected' : 'Approved', needStatus === 'Rejected' ? 'Not aligned with current departmental priorities.' : 'Approved — promoted to Training Plan and LMS enrollment.', needStatus === 'Rejected' ? 'rejected' : 'done']);
      const need = { id: nid('TNA', 'tna'), employeeId: e.id, need: pick(courses).title, justification: 'Identified via performance appraisal skill-gap review.', status: needStatus, hodId: e.managerId, createdAt: needCreatedAt, approvalHistory: chainAt(needHistorySteps, needCreatedAt) };
      trainingNeeds.push(need);
      if (need.status === 'Approved' && bool(0.8)) {
        const course = pick(courses);
        const enr = { id: nid('ENR', 'enr'), employeeId: e.id, courseId: course.id, status: pick(['Enrolled', 'In Progress', 'Completed']), progress: 0, score: null, completedAt: null };
        if (enr.status === 'In Progress') enr.progress = int(20, 80);
        if (enr.status === 'Completed') { enr.progress = 100; enr.score = int(65, 99); enr.completedAt = daysAgo(int(1, 40)); }
        enrollments.push(enr);
        if (enr.status === 'Completed') {
          evaluations.push({ id: nid('EVL', 'evl'), employeeId: e.id, enrollmentId: enr.id, type: 'Pre-Evaluation', status: 'Completed', createdAt: enr.completedAt });
          evaluations.push({ id: nid('EVL', 'evl'), employeeId: e.id, enrollmentId: enr.id, type: 'Training Evaluation', status: 'Completed', createdAt: enr.completedAt });
          evaluations.push({ id: nid('EVL', 'evl'), employeeId: e.id, enrollmentId: enr.id, type: 'Post-Learning Evaluation', status: bool(0.5) ? 'Completed' : 'Pending (due 3 months post-training)', createdAt: enr.completedAt });
        }
      }
    });
    trainingPlans.push({ id: nid('TPL', 'tpl'), month: 'August 2026', status: 'Active', itemIds: trainingNeeds.filter((n) => n.status === 'Approved').slice(0, 8).map((n) => n.id) });

    // ---------------- Curriculum design & training schedules ----------------
    const VENUES = ['HQ Training Hall A', 'HQ Training Hall B', 'Manufacturing Plant Auditorium', 'Virtual — MS Teams', 'Lagos Continental Hotel'];
    const trainingSchedules = pickN(courses, 6).map((c) => ({
      id: nid('SCH', 'sch'), courseId: c.id, facilitator: pick(['Internal L&D Team', 'External Consultant — KPMG Academy', 'External Consultant — CIPM', 'Departmental SME']),
      venue: pick(VENUES), date: daysFromNow(int(-10, 45)), capacity: int(15, 40),
      status: pick(['Planned', 'Confirmed', 'Completed'])
    }));

    // ---------------- Training budget ----------------
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const trainingBudget = {
      id: 'BUD-2026', year: 2026, totalBudget: 42000000,
      byMonth: MONTHS.map((m) => ({ month: m, allocated: 5250000, spent: int(2500000, 6200000) }))
    };

    // ---------------- Disciplinary (flagship) ----------------
    function chain(...steps) {
      return steps.map(([stage, actorEmp, dayOffset, action, comment, status]) => ({
        stage, actor: nameOf(actorEmp), actorRole: actorEmp ? actorEmp.jobTitle : '',
        action, comment: comment || '', timestamp: daysAgo(dayOffset), status: status || 'done'
      }));
    }
    const disciplinaryCases = [
      {
        id: nid('DSC', 'dsc'), employeeId: discEmployee.id, type: 'Query', initiatedBy: deptHeads['DPT-SCL'].id,
        reason: 'Repeated late clock-in (4 occurrences in 30 days) without prior notice.',
        recommendation: 'Written warning.', counterRecommendation: '', status: 'Pending HR Review',
        payrollDeductionFlag: false, createdAt: daysAgo(6),
        approvalHistory: chain(['Query Raised', deptHeads['DPT-SCL'], 6, 'Initiated query', 'Repeated late clock-in (4 occurrences in 30 days) without prior notice. Recommend written warning.'])
      },
      {
        id: nid('DSC', 'dsc'), employeeId: pickN(employees.filter((e) => e.status === 'Active' && e.id !== discEmployee.id), 1)[0].id,
        type: 'Warning', initiatedBy: hrbp2.id, reason: 'Breach of SOP during stock reconciliation.',
        recommendation: 'First written warning, retraining on SOP.', counterRecommendation: 'Agreed with recommendation.',
        status: 'Closed', payrollDeductionFlag: false, createdAt: daysAgo(75),
        approvalHistory: chain(
          ['Warning Raised', hrbp2, 75, 'Initiated warning', 'Breach of SOP during stock reconciliation. Recommend first written warning, retraining on SOP.'],
          ['HR Review', admin, 72, 'Case closed', 'Agreed with recommendation. Retraining scheduled with line supervisor.']
        )
      }
    ];

    // ---------------- Exit management (flagship) ----------------
    const exitCases = [{
      id: nid('EXI', 'exi'), employeeId: exitEmployee.id, type: 'Resignation',
      noticeDate: daysAgo(14), lastWorkingDate: daysFromNow(16), resignationDocSubmitted: true,
      clearanceStatus: 'In Progress', exitQuestionnaireStatus: 'Not Started', handoverStatus: 'In Progress',
      assetChecklist: [
        { item: 'Company laptop', returned: false }, { item: 'ID card', returned: false },
        { item: 'Access fob', returned: false }, { item: 'Fuel card', returned: true }
      ],
      finalSettlementStatus: 'Not Started', status: 'In Progress', restrictedAccess: true, createdAt: daysAgo(14),
      approvalHistory: chain(
        ['Notice Received', exitEmployee, 14, 'Resignation submitted', 'Signed resignation letter uploaded. Last working day proposed 30 days from notice.'],
        ['Clearance Initiated', hrbp2, 13, 'Clearance & handover started', 'Handover checklist issued to employee and line manager.']
      )
    }];

    // ---------------- Employee relations: welfare + surveys ----------------
    const WELFARE_CHAIN_STAGES = ['Pending HRBP Review', 'Pending Finance Approval', 'Approved', 'Paid', 'Rejected'];
    function welfareHistory(status, emp, createdAt, benefitType) {
      const steps = [['Request Submitted', emp, 0, 'Submitted welfare request', `Requesting ${benefitType.toLowerCase()}.`, 'done']];
      if (status === 'Pending HRBP Review') return chainAt(steps, createdAt);
      steps.push(['HRBP Review', hrbp2, -3, status === 'Rejected' ? 'Rejected' : 'Endorsed', status === 'Rejected' ? 'Does not meet policy criteria for this benefit.' : 'Reviewed and endorsed for Finance approval.', status === 'Rejected' ? 'rejected' : 'done']);
      if (status === 'Rejected' || status === 'Pending Finance Approval') return chainAt(steps, createdAt);
      steps.push(['Finance Approval', admin, -6, 'Approved', 'Budget confirmed — approved for payment.']);
      if (status === 'Approved') return chainAt(steps, createdAt);
      steps.push(['Payment Processed', admin, -9, 'Paid', 'Payment disbursed to employee account.']);
      return chainAt(steps, createdAt);
    }
    // Anchors each step's date relative to the record's own createdAt (not "now") so history reads chronologically.
    function chainAt(steps, createdAt) {
      const base = new Date(createdAt).getTime();
      return steps.map(([stage, actorEmp, idx, action, comment, status], i) => ({
        stage, actor: nameOf(actorEmp), actorRole: actorEmp ? actorEmp.jobTitle : '',
        action, comment: comment || '', timestamp: new Date(base + i * 2 * 86400000).toISOString().slice(0, 10), status: status || 'done'
      }));
    }
    const welfareRequests = pickN(employees.filter((e) => e.status === 'Active'), 8).map((e, idx) => {
      const status = WELFARE_CHAIN_STAGES[idx % 5];
      const benefitType = pick(['Bereavement Support', 'Childbirth Allowance', 'Wedding Gift', 'Educational Grant', 'Emergency Welfare']);
      const createdAt = daysAgo(int(10, 60));
      return {
        id: nid('WEL', 'wel'), employeeId: e.id, benefitType, amount: int(20, 150) * 1000, evidenceUploaded: bool(0.8),
        status, createdAt, approvalHistory: welfareHistory(status, e, createdAt, benefitType)
      };
    });
    const surveys = [
      { id: nid('SUR', 'sur'), title: 'Q2 2026 Employee Engagement Pulse', status: 'Closed', deployedTo: DEPARTMENTS.map((d) => d.id), responseCount: 214, targetCount: 260 },
      { id: nid('SUR', 'sur'), title: 'Post-Onboarding Experience Survey', status: 'Open', deployedTo: ['DPT-SNM', 'DPT-QAQ'], responseCount: 6, targetCount: 14 }
    ];

    // ESS: leave requests (annual/casual — distinct from Clinic-managed sick leave)
    const leaveRequests = pickN(employees.filter((e) => e.status === 'Active'), 10).map((e, idx) => {
      const start = daysAgo(int(-25, 30));
      return {
        id: nid('LVE', 'lve'), employeeId: e.id, leaveType: pick(['Annual Leave', 'Casual Leave', 'Compassionate Leave', 'Study Leave']),
        startDate: start, endDate: start, days: int(1, 14),
        status: ['Pending Line Manager Approval', 'Approved', 'Approved', 'Rejected', 'Approved'][idx % 5],
        createdAt: daysAgo(int(1, 35))
      };
    });

    // ESS: profile/document change requests + life-event notifications, both routed to HR for approval
    const essRequests = [];
    pickN(employees.filter((e) => e.status === 'Active'), 6).forEach((e) => {
      essRequests.push({
        id: nid('ESR', 'esr'), employeeId: e.id, type: 'Document Update',
        detail: pick(['Updated NYSC certificate', 'Change of residential address', 'New next-of-kin details', 'Updated professional certification', 'Change of bank account details']),
        status: pick(['Pending HR Approval', 'Approved', 'Approved']), createdAt: daysAgo(int(1, 40))
      });
    });
    pickN(employees.filter((e) => e.status === 'Active'), 4).forEach((e) => {
      essRequests.push({
        id: nid('ESR', 'esr'), employeeId: e.id, type: 'Life Event',
        detail: pick(['Childbirth — requesting maternity/paternity leave setup', 'Recent wedding — update marital status & dependents', 'Bereavement in immediate family', 'Change in emergency contact after relocation']),
        status: pick(['Acknowledged', 'Pending HR Follow-up']), createdAt: daysAgo(int(1, 25))
      });
    });

    // Guarantor & reference verification (post-offer, pre-onboarding checklist item from Recruitment)
    const guarantorChecks = [newHire, ...pickN(employees.filter((e) => e.status === 'Active' && e.employmentDate > daysAgo(400)), 4)].map((e) => ({
      id: nid('GTV', 'gtv'), employeeId: e.id,
      guarantor1Name: fullName(), guarantor1Relationship: pick(['Uncle', 'Former Employer', 'Pastor/Religious Leader', 'Family Friend']),
      guarantor2Name: fullName(), guarantor2Relationship: pick(['Aunt', 'Former Colleague', 'Community Leader', 'Family Friend']),
      status: pick(['Pending Contact', 'Contacted — Awaiting Response', 'Verified', 'Verified', 'Flagged for Review']),
      notes: '', createdAt: e.employmentDate
    }));

    // ---------------- Health & Wellness ----------------
    const medicalRecords = pickN(employees, 20).map((e) => ({
      id: nid('MED', 'med'), employeeId: e.id, healthStatus: pick(['Fit', 'Fit with monitoring', 'Under review']),
      bloodGroup: pick(['O+', 'O-', 'A+', 'A-', 'B+', 'AB+']), genotype: pick(['AA', 'AS', 'AC']),
      lastMedicalCheck: daysAgo(int(10, 300)),
      documents: pickN(['Pre-employment medical report', 'Food handlers certificate', 'Fitness certificate', 'Health week screening result'], int(1, 3))
    }));
    function billHistory(status, emp, createdAt, provider) {
      const steps = [['Bill Submitted', emp, 0, 'Submitted for verification', `${provider} invoice uploaded.`, 'done']];
      if (status === 'Submitted') return chainAt(steps, createdAt);
      steps.push(['Verification', clinicLead, 3, 'Verified', 'Invoice checked against treatment record — genuine.']);
      if (status === 'Verified') return chainAt(steps, createdAt);
      steps.push(['Approval', hrHead, 6, 'Approved', 'Approved for payment against staff medical benefit.']);
      if (status === 'Approved' || status === 'Outstanding') return chainAt(steps, createdAt);
      steps.push(['Payment', admin, 9, 'Paid', 'Payment disbursed to provider.']);
      return chainAt(steps, createdAt);
    }
    const medicalBills = pickN(employees.filter((e) => e.status !== 'Exiting'), 9).map((e, idx) => {
      const amount = int(8, 90) * 1000;
      const status = ['Submitted', 'Verified', 'Approved', 'Paid', 'Outstanding'][idx % 5];
      const provider = pick(['Reddington Hospital', 'St. Nicholas Hospital', 'Lagoon Hospitals', 'First Cardiology Consultants', 'Fidson Staff Clinic']);
      const createdAt = daysAgo(int(15, 80));
      return { id: nid('BIL', 'bil'), employeeId: e.id, provider, amount, status, outstandingBalance: status === 'Outstanding' ? amount : 0, createdAt, approvalHistory: billHistory(status, e, createdAt, provider) };
    });
    const vaccinationSchedules = pickN(employees, 12).map((e) => ({
      id: nid('VAC', 'vac'), employeeId: e.id, vaccine: pick(['Hepatitis B Booster', 'Yellow Fever', 'Tetanus Toxoid', 'Annual Flu Shot', 'COVID-19 Booster']),
      dueDate: daysFromNow(int(-20, 60)), status: pick(['Scheduled', 'Completed', 'Overdue'])
    }));
    const drugRequisitions = [
      { id: nid('DRG', 'drg'), requestedBy: clinicLead.id, drugs: 'Paracetamol 500mg, ORS sachets, Artemether-Lumefantrine, Wound dressing kits', status: 'Pending Approval', createdAt: daysAgo(2),
        approvalHistory: chain(['Requisition Submitted', clinicLead, 2, 'Submitted requisition', 'Essential medicines restock — clinic running low.']) },
      { id: nid('DRG', 'drg'), requestedBy: clinicLead.id, drugs: 'Amoxicillin 500mg, Antihistamines, First aid consumables', status: 'Approved', createdAt: daysAgo(18),
        approvalHistory: chain(['Requisition Submitted', clinicLead, 18, 'Submitted requisition', 'Monthly restock.'], ['Procurement Approval', admin, 16, 'Approved', 'Approved for purchase — within budget.']) },
      { id: nid('DRG', 'drg'), requestedBy: clinicLead.id, drugs: 'IV fluids, Diclofenac injection', status: 'Procured', createdAt: daysAgo(40),
        approvalHistory: chain(['Requisition Submitted', clinicLead, 40, 'Submitted requisition', 'Emergency stock.'], ['Procurement Approval', admin, 38, 'Approved', 'Approved for purchase.'], ['Fulfilled', admin, 33, 'Procured', 'Stock delivered to clinic.']) }
    ];
    function sickLeaveHistory(status, emp, createdAt) {
      const steps = [['Request Submitted', emp, 0, 'Applied for sick leave', 'Medical report attached.', 'done']];
      if (status === 'Pending Supervisor Review') return chainAt(steps, createdAt);
      const supervisor = emp.managerId ? employee_ref(emp.managerId) : hrHead;
      steps.push(['Supervisor Review', supervisor, 1, status === 'Rejected' ? 'Rejected' : 'Endorsed', status === 'Rejected' ? 'Insufficient documentation provided.' : 'Endorsed, forwarded to Clinic.', status === 'Rejected' ? 'rejected' : 'done']);
      if (status === 'Rejected' || status === 'Pending Clinic Review') return chainAt(steps, createdAt);
      steps.push(['Clinic Review', clinicLead, 2, 'Approved', 'Medical report reviewed and accepted. Recorded to employee profile.']);
      return chainAt(steps, createdAt);
    }
    function employee_ref(id) { return employees.find((e) => e.id === id); }
    const sickLeaveRequests = pickN(employees.filter((e) => e.status === 'Active'), 6).map((e, idx) => {
      const status = ['Pending Supervisor Review', 'Pending Clinic Review', 'Approved', 'Approved', 'Rejected'][idx % 5];
      const createdAt = daysAgo(int(5, 20));
      return {
        id: nid('SCK', 'sck'), employeeId: e.id, startDate: createdAt, endDate: daysAgo(int(1, 20) - int(1, 6)),
        reason: pick(['Malaria treatment', 'Minor surgery recovery', 'Typhoid treatment', 'Flu/viral infection', 'Dental procedure']),
        medicalReportAttached: bool(0.85), status, createdAt, approvalHistory: sickLeaveHistory(status, e, createdAt)
      };
    });

    // ---------------- Notifications (simulated email/SMS feed) ----------------
    const notifications = [
      { id: nid('NOT', 'notif'), title: 'PIP auto-generated for Chukwuemeka Nnamdi', body: 'Annual appraisal scored 58% (below 70% threshold). L&D has been notified for coaching support.', module: 'Performance', link: 'admin/ld/performance-pip.html', read: false, createdAt: daysAgo(40) },
      { id: nid('NOT', 'notif'), title: 'Offer accepted — Ifeoma Chukwu', body: 'Candidate accepted the Medical Sales Representative offer. Onboarding checklist created.', module: 'Recruitment', link: 'admin/hrbp/recruitment.html', read: false, createdAt: daysAgo(7) },
      { id: nid('NOT', 'notif'), title: 'Requisition ERP Analyst pending your approval', body: 'IT HOD submitted a new requisition for ERP Analyst (Grade: Senior Officer).', module: 'Recruitment', link: 'admin/hrbp/recruitment.html', read: true, createdAt: daysAgo(3) },
      { id: nid('NOT', 'notif'), title: 'Resignation received — Yetunde Balogun', body: 'Financial Accountant submitted resignation. Last working day in 16 days. Clearance in progress.', module: 'Exit Management', link: 'admin/hrbp/exit-management.html', read: true, createdAt: daysAgo(14) },
      { id: nid('NOT', 'notif'), title: 'Disciplinary query pending HR review', body: 'Warehouse Officer Babatunde Okunola — repeated late clock-in. Awaiting HR counter-recommendation.', module: 'Disciplinary', link: 'admin/hrbp/disciplinary.html', read: true, createdAt: daysAgo(6) },
      { id: nid('NOT', 'notif'), title: 'Drug requisition awaiting approval', body: 'Clinic submitted a drug requisition for essential medicines restock.', module: 'Health & Wellness', link: 'admin/health/drug-requisition.html', read: true, createdAt: daysAgo(2) },
      { id: nid('NOT', 'notif'), title: 'Acting Confirmation recommended — Nseobong Etuk', body: 'Acting QA/QC Manager scored 88% on acting-confirmation evaluation. Recommended for substantive confirmation.', module: 'Performance', link: 'admin/hrbp/performance-confirmation.html', read: true, createdAt: daysAgo(12) }
    ];

    const auditLog = [
      { id: nid('AUD', 'audit'), actor: admin.id, action: 'Approved requisition', entity: 'Requisition', entityId: req1.id, timestamp: daysAgo(38) },
      { id: nid('AUD', 'audit'), actor: admin.id, action: 'Converted candidate to employee', entity: 'Employee', entityId: newHire.id, timestamp: daysAgo(4) }
    ];

    return {
      _meta: { seedVersion: 8, generatedAt: now, company: 'Fortunebolt Pharmaceuticals Plc' },
      currentUserId: admin.id,
      departments: DEPARTMENTS, hrUnits: HR_UNITS, cadres: CADRES,
      employees, requisitions, candidates, assessments, interviews, offers, onboardingTasks,
      appraisals, careerPlans, trainingNeeds, trainingPlans, courses, enrollments, evaluations,
      trainingSchedules, trainingBudget,
      lmsSync: { provider: 'Fortunebolt Learning Cloud', lastSyncedAt: LMS_SYNCED_AT, courseCount: courses.length },
      disciplinaryCases, exitCases, welfareRequests, surveys, leaveRequests, essRequests, guarantorChecks,
      medicalRecords, medicalBills, vaccinationSchedules, drugRequisitions, sickLeaveRequests,
      notifications, auditLog
    };
  }

  global.FB_SEED_BUILDER = buildSeed;
})(window);
