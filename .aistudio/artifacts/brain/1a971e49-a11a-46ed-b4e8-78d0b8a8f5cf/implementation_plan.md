# Dashboard Statistics with Recharts

This update introduces a dedicated **Dashboard Statistics** section in the Dashboard view powered by **Recharts**, giving management and staff interactive visual analytics for monthly expenses by category and employee working day attendance (Full Days vs. Half Days).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design and functional choices were confirmed during Phase 1 clarification:

- **Monthly Expenses by Category Visualization**: Interactive **Recharts Donut/Pie Chart** (`PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer`) with center total/active category readout and interactive category breakdown.
- **Working Days by Employee Bar Chart**: **Stacked Bar Chart** (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`) distinguishing **Full Days (`1 Ditë`)** and **Half Days (`½ Ditë` = 0.5 days each)** alongside the combined total days per employee.
- **Role-Based Visibility**: **Management** sees all employees compared side-by-side in the Working Days bar chart; **Workers** see only their own working days bar in accordance with strict role privacy.

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the static SVG chart section with a unified **Dashboard Statistics (`Statistikat e Panelit`)** analytics section inside the Dashboard view using `recharts`. It features two coordinated visual panels:
  1. **Monthly Expenses by Category**: An interactive Recharts donut chart displaying each expense category's monthly EUR total, percentage share, custom currency tooltip, and clickable category breakdown items.
  2. **Working Days by Employee**: A Recharts stacked bar chart displaying each employee's logged working days for the current month, stacking total days from **Full Days (`1 Ditë`)** in deep forest green (`#1B4332`) and **Half Days (`½ Ditë`)** in warm amber (`#D97706`), with custom tooltips showing exact counts of full-day entries, half-day entries, and total combined days.
- **Target Audience / Persona**: La Verda landscaping management (reviewing category spend and team-wide attendance at a glance) and field workers (reviewing monthly category state and their personal attendance breakdown).
- **Key Value**: Provides responsive, interactive tooltips, clear visual distinction between full-day work and weather-shortened half-days, and role-aware employee comparisons right on the main dashboard.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Inspecting Category Spend**: Users view the **Dashboard Statistics** section on the main dashboard. Hovering or tapping any slice in the Recharts Donut Chart or clicking a category row highlights that category, displays a formatted EUR + percentage tooltip, and updates the center summary.
  2. **Inspecting Working Days by Employee**: Directly beneath (or alongside on wider screens) the category chart, users view the **Working Days by Employee** Recharts Stacked Bar Chart for the current month.
     - If logged in as **Management**, all staff members are plotted along the X-axis with stacked bars showing their Full Days contribution (`#1B4332`) and Half Days contribution (`#D97706`).
     - If logged in as a **Worker**, the chart filters to show only the logged-in worker's monthly bar and summary metrics.
     - Clicking the header link (`Shiko Kalendarin` / `View Calendar`) navigates directly to the full Working Days Calendar view.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean SaaS operational analytics matching La Verda's botanical emerald theme.
  - *Color Palette & Mood*:
    - Primary Canvas: Crisp white (`#FFFFFF`) surface containers with subtle hairline borders (`border-slate-100`).
    - Expense Categories: Fuel (`#1B4332` Forest Green), Food (`#2D6A4F` Emerald), Coffee (`#D97706` Amber), Other (`#475569` Slate).
    - Working Days Bars: Full Days in Forest Emerald (`#1B4332`), Half Days in Warm Amber (`#F59E0B`), grid lines in subtle slate (`#F1F5F9`).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` headings with strict `tabular-nums` alignment on all currency values, percentages, and day counts.
  - *Single-Elevation Depth*: Clean single-level cards separated by whitespace and subtle hairline dividers without nested card clutter.
- **Interactive Feedback & Motion**:
  - Smooth Recharts slice and bar animations (`isAnimationActive={true}`, 400ms easing).
  - Custom high-contrast floating tooltips displaying formatted EUR amounts or full/half day breakdowns (`1 Ditë`, `½ Ditë`, and `Totali`).
  - Graceful empty states when no expenses or working days have been logged yet in the current month.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Stacked Bar Metrics in Day Units (`fullDaysTotal` + `halfDaysTotal`)**
  - *Chosen Approach*: Plot the Y-axis in **total working days** where each Full Day entry adds `1.0` to the `fullDays` bar segment and each Half Day entry adds `0.5` to the `halfDays` bar segment (while the custom tooltip also shows the raw count of half-day occurrences, e.g., `2 × ½ ditë = 1.0 ditë`).
  - *Why*: Ensures the total height of each employee's stacked bar accurately equals their true payable working days for the month (e.g., `12.5 ditë`).
  - *Alternatives Considered*: Plotting raw entry counts (where two ½ days would look as tall as two full days), which would visually misrepresent total working time.
- **Decision 2: Strict Role Filtering on Employee Bar Chart**
  - *Chosen Approach*: Filter the employee dataset in the bar chart based on `currentUser.role === 'management'`. Management sees all workers; a worker sees only their own record.
  - *Why*: Aligns with the confirmed privacy model and matches how the Working Days Calendar view scopes employee data.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              App State                                  │
│         expenses: Expense[]       │       workDays: WorkDayEntry[]      │
│         currentUser: User         │       lang: 'sq' | 'en'             │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DashboardView                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               Dashboard Statistics Section (Recharts)             │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────┐  ┌────────────────────────────┐  │  │
│  │  │  Monthly Expenses by Cat.   │  │  Working Days by Employee  │  │  │
│  │  │  (Recharts PieChart/Donut)  │  │  (Recharts Stacked Bar)    │  │  │
│  │  │  • Interactive active slice │  │  • Scoped by user.role     │  │  │
│  │  │  • Custom EUR Tooltip       │  │  • Full (1.0) + Half (0.5) │  │  │
│  │  │  • Category breakdown rows  │  │  • Custom Days Tooltip     │  │  │
│  │  └─────────────────────────────┘  └────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Category Chart Data**: Aggregated from `monthExpenses` into `{ category, name, amount, percentage, color }[]`.
  - **Working Days Bar Data**: Aggregated from `monthWorkDays` and registered staff (`getStoredUsers()`), producing per-employee records:
    - `name`: Employee short display name (e.g., `Arben K.`)
    - `fullDays`: Sum of full-day entries (`days === 1 ? 1 : 0`)
    - `halfDays`: Sum of half-day values (`days === 0.5 ? 0.5 : 0`)
    - `halfDaysCount`: Number of `½` day occurrences for tooltip clarity
    - `totalDays`: `fullDays + halfDays`
- **Interactive Component & State Mapping**:
  - Hovering or clicking a slice in the Recharts `PieChart` updates `activeCategory` state, highlighting both the corresponding slice and legend row.
  - Hovering or tapping a bar in the Recharts `BarChart` opens a custom Bilingual Tooltip (`sq` / `en`) showing the employee's full name, Full Days (`1 Ditë`), Half Days (`½ Ditë`), and combined monthly total (`Totali`).
