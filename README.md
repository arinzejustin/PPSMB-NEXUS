

### The Developer Prompt (Plain Text)

Act as a Senior Frontend Engineer specializing in Nuxt 3, Tailwind CSS, and Shadcn/UI. Your task is to build the user interface for a revolutionary "Offline Information Management System (OIMS)" based on the provided project proposal for the Post Primary School Management Board (PPSMB).

### OBJECTIVE

Build a high-fidelity, responsive, and professional UI that adheres to the "Offline-First" architectural theme. The application must be optimized for administrative efficiency, data integrity, and high-resolution document management.

### TECH STACK

* Framework: Nuxt 3 (Vue.js)
* Styling: Tailwind CSS
* UI Components: Shadcn/UI (Radix Vue)
* Icons: Lucide-Vue-Next
* MODULE INSTALLATION: You are authorized to install any necessary npm/nuve modules required for specialized UI features. This includes, but is not limited to:

Charting/Data Viz: (e.g., @pulse-editor/ui-charts, Chart.js, or Tremor-style components) for executive dashboards.

Date Handling: (e.g., date-fns or dayjs) for tracking certification expirations and correspondence timelines.

Forms/Validation: (e.g., VeeValidate or Zod).

### SCOPE OF WORK

1. ANALYZE STRUCTURE: First, loop through my existing project directories to understand the current folder structure, naming conventions, and shared components.
2. UI ONLY: Focus strictly on the UI/UX and layout. Do not implement complex backend logic, API calls, or synchronization engines. Use mock data where necessary.
3. EXCLUSIONS: Skip the Login and Settings pages as they are already completed.
4. STUDENT PORTAL: Create the directory and a placeholder/wireframe for the "Student Records Management" section, but do not build out the functional pages yet.
5. CORE PAGES TO BUILD:
* Dashboard (Leadership View): Executive dashboards with key performance indicators, resource distribution maps, and trend analytics.
* Teacher Management: Comprehensive digital profiles, assignment/transfer workflows, and certification tracking.
* Mail & Correspondence: Digital mail processing, routing workflows, and searchable archive system.
* Document Scanning: Interface for high-resolution batch scanning and OCR status monitoring.
* Reporting Engine: Library of pre-built reports and a custom report parameter builder.



### DESIGN REQUIREMENTS

* Visual Style: Professional, trustworthy, and enterprise-grade. Use a clean color palette suitable for a government/educational board.
* Navigation: A robust sidebar navigation capable of handling deep nesting for various departments (HR, Zonal Admin, etc.).
* Offline Status Indicators: Include UI elements that show "Local Database Status" and "Last Synchronized" timestamps prominently.
* Components: Use Shadcn/UI for Tables (with sorting/filtering), Data Cards, Dialogs for transfers, and Steppers for workflows.

### DOCUMENTATION REQUIREMENT (MANDATORY)

For every page or major module created, you must generate a walkthrough Markdown file.

* Location: Create a folder named `doc/ui`.
* Naming: Name each file based on the page (e.g., `TeacherManagement.md`).
* Content: Describe the page's purpose, the user flow (how a user interacts with the elements), the UI components used, and the intended logic flow (how it should eventually handle data).

### INITIAL ACTION

Please begin by scanning my directory structure. Once understood, proceed with building the Dashboard as the first page, followed by the documentation file in `doc/ui/Dashboard.md`.

---

### Implementation Guide (How to use this)

Since you asked for a walkthrough on how the documentation should be structured, here is an example of what the AI should generate for you in the `doc/ui/` folder:

#### Example: `doc/ui/TeacherManagement.md`

```markdown
# Teacher Management UI Walkthrough

## Page Purpose
Provides HR and Zonal Administrators with a central hub to manage the lifecycle of 5,000+ teachers.

## User Flow
1. **Overview**: User sees a data table of all teachers with filtering by Zone and Qualification.
2. **Profile View**: Clicking a teacher opens a slide-over (Shadcn Sheet) containing biometrics, employment history, and certifications.
3. **Transfer Request**: User selects "Initiate Transfer," which opens a multi-step modal to choose a destination school and attach supporting documents.

## Components Used
- `DataTable`: For the searchable teacher registry.
- `Badge`: For certification status (Active/Expiring).
- `Tabs`: To separate Personal Info, Professional Development, and Performance Analytics.

## Intended Logic Flow
- Local edits are saved to IndexedDB/LocalState.
- A "Pending Sync" icon appears next to modified records until the bi-weekly sync window is active.

```

