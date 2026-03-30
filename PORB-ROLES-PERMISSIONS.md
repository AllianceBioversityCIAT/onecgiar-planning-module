# PORB Roles & Permissions — Review Document

> Review this document and confirm before implementation in the PORB module.

---

## Available Roles

| Role | Scope | Description |
|------|-------|-------------|
| **Leader** | All centers | Primary program lead, full access |
| **Coordinator** | All centers | Program coordinator, full access |
| **Financial Focal Point** | All centers | Finance lead, full access |
| **Co-leader** | All centers | Co-lead, full access |
| **Contributor** | Assigned centers only | Can only edit centers they are assigned to |
| **Admin** (system) | Everything | System admin, bypasses all checks |

> Contributors must have at least one organization assigned when added to a team.

---

## Submission Status Lock

| Status | Effect |
|--------|--------|
| **Draft** | All edits allowed per role |
| **Pending** | ALL edits disabled for everyone (read-only) |
| **Approved** | ALL edits disabled for everyone (read-only) |

---

## Section-Level Edit Permissions

All budget sections follow the same rule — there is NO per-section differentiation currently.

| Section | Leader | Coordinator | Financial Focal Point | Co-leader | Contributor | Admin |
|---------|:------:|:-----------:|:---------------------:|:---------:|:-----------:|:-----:|
| HLO (Pool Funding) | Edit all | Edit all | Edit all | Edit all | Edit assigned centers | Edit all |
| Partners | Edit all | Edit all | Edit all | Edit all | Edit assigned centers | Edit all |
| W3 / Bilateral | Edit all | Edit all | Edit all | Edit all | Edit assigned centers | Edit all |
| MELIA | Edit all | Edit all | Edit all | Edit all | Edit assigned centers | Edit all |
| Anaplan | Edit all | Edit all | Edit all | Edit all | Edit assigned centers | Edit all |
| Cross-Cutting | Edit all | Edit all | Edit all | Edit all | Edit assigned centers | Edit all |

---

## Action Permissions

| Action | Leader | Coordinator | Financial Focal Point | Co-leader | Contributor | Admin |
|--------|:------:|:-----------:|:---------------------:|:---------:|:-----------:|:-----:|
| **Submit PORB** | Yes | Yes | Yes | Yes | No | Yes |
| **Cancel Submission** | If submitter | If submitter | If submitter | If submitter | If submitter | Yes |
| **Mark Center Complete** | Any center | Any center | Any center | Any center | Assigned only | Any center |
| **Export Excel** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Export All (ZIP)** | Yes | Yes | Yes | Yes | Yes | Yes |
| **View History** | Yes | Yes | Yes | Yes | Yes | Yes |
| **View Submitted Versions** | Yes | Yes | Yes | Yes | Yes | Yes |

---

## Team Members Management

| Action | Leader | Coordinator | Financial Focal Point | Co-leader | Contributor | Admin |
|--------|:------:|:-----------:|:---------------------:|:---------:|:-----------:|:-----:|
| **View team list** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Add new member** | Yes | Yes | Yes | Yes | No | Yes |
| **Edit/delete members** | All except Leaders | All except Leaders | All except Leaders | All except Leaders | No | All roles |

---

## Access Control

| Scenario | Behavior |
|----------|----------|
| User has no role in this initiative | Redirected to `/denied` |
| User is Contributor with no assigned orgs | Should not happen (blocked at team member creation) |
| Contributor switches to unassigned center | Sees data read-only, inputs disabled |

---

## Current PORB Implementation Status

The PORB module **already implements** the following:
- `canSubmit` getter — checks role for submit permission
- `buildCanEditMap()` — builds per-center edit permission based on role + organizations
- `canEditForSelectedCenter` — passed to all section components
- Mark Complete — checks `canEditForSelectedCenter`
- Cancel Submission — backend checks submitter or admin
- No role at all → redirect to `/denied`

**What's NOT yet differentiated:**
- Currently all sections use the same `canEdit` flag — no section-specific permissions
- No distinction between "can edit budget" vs "can edit assumptions" vs "can edit other fields"

---

## Confirmed Decisions

- No per-section permission differences — all sections follow the same center-level access
- Contributors **cannot** submit
- Contributors can edit **all sections** within their assigned centers
- No Viewer role needed
- No role changes needed
- Current PORB implementation already matches these rules — **no code changes required**
