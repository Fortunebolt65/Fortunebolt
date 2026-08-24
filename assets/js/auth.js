/* ==========================================================================
   Fortunebolt HR Platform — mock session / role model.
   Phase 1 ships a single logged-in persona (HR Admin) with full visibility
   across every module, so the whole system can be pressure-tested end to
   end. The ROLES catalogue below is the seed for Phase 2 POV switching —
   it exists now so the data model doesn't need to be reshaped later.
   ========================================================================== */
(function (global) {
  'use strict';

  const ROLES = [
    { id: 'hr-admin', label: 'HR Admin', description: 'Full visibility & operating rights across every HR module. Phase 1 persona.' },
    { id: 'employee', label: 'Employee (Self-Service)', description: 'Own profile, leave, welfare, training history, surveys.', phase: 2 },
    { id: 'line-manager', label: 'Line Manager / HOD', description: 'Team roster, requisitions, appraisal input, leave & TNA approvals.', phase: 2 },
    { id: 'hrbp', label: 'HRBP Officer', description: 'Recruitment, employee relations, disciplinary, exit — scoped to assigned departments.', phase: 2 },
    { id: 'ld-specialist', label: 'L&D Specialist', description: 'Performance/PIP, talent management, LMS, curriculum & budget.', phase: 2 },
    { id: 'clinic-nurse', label: 'Clinic Nurse', description: 'Health & Wellness unit only.', phase: 2 },
    { id: 'finance-approver', label: 'Finance Approver', description: 'Welfare & medical bill payment approvals, final settlement sign-off.', phase: 2 },
    { id: 'recruiter', label: 'Recruiter / Hiring Manager', description: 'Own open requisitions & candidate pipeline.', phase: 2 }
  ];

  function currentSession() {
    const employee = global.FB.store.currentUser();
    return {
      employee,
      roleId: 'hr-admin',
      role: ROLES[0],
      displayName: employee ? `${employee.firstName} ${employee.lastName}` : 'HR Admin',
      title: employee ? employee.jobTitle : 'HR Administrator'
    };
  }

  global.FB = global.FB || {};
  global.FB.auth = { ROLES, currentSession };
})(window);
