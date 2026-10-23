/**
 * The eight primary destinations (brief, "Application structure"). Planned
 * destinations show scope only, with no inputs or numbers, until their data
 * and methods are verified (docs/DECISIONS.md D-010).
 */
export interface Destination {
  number: number
  path: string
  title: string
  status: 'available' | 'planned'
  summary: string
  /** Planned iteration (docs/ROADMAP.md). */
  iteration: string
  /** Scope summary for planned destinations. */
  plannedScope: string[]
  /** Items that must be resolved before values can be shown. */
  prerequisites: string[]
}

export const DESTINATIONS: Destination[] = [
  {
    number: 1,
    path: '/fasteners',
    title: 'Fasteners & Hole Preparation',
    status: 'planned',
    iteration: '2',
    summary: 'Unified inch and metric thread data, clearance and tap drills, socket and button heads, counterbores, CAD chamfers, and helical-insert preparation.',
    plannedScope: [
      'UNC/UNF and metric coarse/fine threads with identifiable standard families and editions',
      'Close, normal/free, and loose clearance holes in each source’s terminology. Hole limits are stored separately from suggested drills',
      'Cut-tap and roll/form-tap predrills as separate processes, each with its material, engagement, and tool basis',
      'SHCS and button-head dimensions with limits, plus flush or recessed counterbores',
      'CAD thread-entry chamfer: opening = 1.10 × screw OD (editable preset), 90° included default, separate cut-tap and form-tap bores, bore override',
      'Helical inserts / STI: manufacturer data shown alongside the user’s 120° / 1-pitch countersink preset. Missing data reads “not specified”',
      'Thread selection carries over between fastener, machining-thread, and insert views',
    ],
    prerequisites: [
      'Licensing decision for ASME/ISO tabulated values (open question Q-001)',
      'Helical-insert manufacturer priority (Q-002)',
    ],
  },
  {
    number: 2,
    path: '/threads',
    title: 'Machining Threads & Tolerances',
    status: 'planned',
    iteration: '3',
    summary: 'Finished-thread limits (pitch, major, minor diameter) by class, with tap H/D-limit band charts.',
    plannedScope: [
      'Finished-thread lookup: family, size, pitch, internal/external, class (1A–3A, 1B–3B, 6H, 6g, …)',
      'Basic/min/max pitch diameter, tolerance width, major/minor limits, length of engagement',
      'Annotated thread-profile diagram',
      'Tap H-limit and metric D-limit bands drawn against the actual selected thread’s tolerance band',
      'Absolute vs. deviation display in in, mm, or µm',
      'Clear separation of finished-thread, tap-manufacturing, and gage limits. No unconditional “H3 ⇒ 2B” mappings',
    ],
    prerequisites: ['Licensing decision for ASME B1.1 / ISO 965 values (Q-001)'],
  },
  {
    number: 3,
    path: '/fits',
    title: 'Shaft & Hole Fits',
    status: 'planned',
    iteration: '4',
    summary: 'ASME B4.1 and ISO 286 fit lookup, plus a custom mating-hole solver from shaft limits and a required clearance range.',
    plannedScope: [
      'Hole-basis and shaft-basis standard fits with limits, bands, signed clearance range, and classification',
      'Custom solver: hole_min = shaft_max + C_min, hole_max = shaft_min + C_max, with infeasible and zero-width handling',
      'Size-interval boundaries and conservative rounding respected',
      'Nearest standard options, without labeling a custom tolerance as a standard fit',
    ],
    prerequisites: ['Licensing decision for ISO 286 / ASME B4.1 tables (Q-001)'],
  },
  {
    number: 4,
    path: '/materials',
    title: 'Materials',
    status: 'planned',
    iteration: '8 (data sourcing may start earlier)',
    summary: 'General, principally room-temperature material reference: hardness, Tg/melting, density, modulus, strength, CTE, conductivity.',
    plannedScope: [
      'All 52 requested catalog entries (brief §4), with exact grade and condition variants',
      'Hardness with an explicit scale and statistic type. Sorting happens within comparable scale groups only',
      'Independent Tg and melting fields, alloy solidus–liquidus ranges, and explicit “not applicable / not reported / decomposes” states',
      'HDT, Vicat, decomposition, and service limits kept separate from Tg/Tm',
      'Source, verification status, and product form in row details. Missing values are never shown as zero',
      'A capability flag links a material to verified calculator models without implying cryogenic coverage',
    ],
    prerequisites: ['Source each property for the exact grade and condition before showing values'],
  },
  {
    number: 5,
    path: '/thermal',
    title: 'Thermal Expansion & Contraction',
    status: 'available',
    iteration: '1',
    summary: 'Length change between two temperatures using a NIST temperature-dependent model or a constant-CTE estimate.',
    plannedScope: [],
    prerequisites: [],
  },
  {
    number: 6,
    path: '/heat-flow',
    title: 'Conductive Heat Flow',
    status: 'planned',
    iteration: '5',
    summary: 'Steady 1-D conduction Q = (A/L)·∫k(T)dT through rods, bars, tubes, and wire.',
    plannedScope: [
      'Geometry: direct area, rectangle, round, tube OD/ID, AWG conductor area (stranded override), parallel count',
      'Integrated conductivity from sourced k(T) models, including copper RRR distinctions',
      'Heat flow and effective conductance, kept distinct from material conductivity',
    ],
    prerequisites: ['Verified NIST thermal-conductivity models and benchmarks'],
  },
  {
    number: 7,
    path: '/torque',
    title: 'Bolt Torque & Preload',
    status: 'planned',
    iteration: '5',
    summary: 'Torque ↔ preload with an explicit empirical nut factor K, ranges, and stress-area tensile stress.',
    plannedScope: [
      'T = K·F·d in both directions. K is an empirical nut factor, not a friction coefficient',
      'Torque and K ranges propagated to a preload range. Prevailing torque handled separately',
      'Tensile stress on sourced stress area vs. a selected proof/yield basis. No universal “safe” torque',
    ],
    prerequisites: ['Sourced stress areas and nut-factor ranges (e.g., NASA RP-1228)'],
  },
  {
    number: 8,
    path: '/pin-slot',
    title: 'Pin & Slot GD&T Guide',
    status: 'planned',
    iteration: '6–7',
    summary: 'Forward analysis of a two-pin / hole-and-slot locator: feasibility, angular and translational error, and visual tolerance zones.',
    plannedScope: [
      'Two dowel pins fixed in Part A. Part B has one round hole and one slot aligned with the pin-center line',
      'Assembly feasibility, kept separate from guaranteed alignment accuracy',
      'Interactive top view with exaggerated zones and scale indicator, plus a section view for press depth and engagement',
      'Contribution breakdown: clearance, feature location, temperature',
      'Inverse allocation and press-fit guidance only after hand-checked benchmarks pass',
    ],
    prerequisites: ['Hand-checked GD&T benchmark cases', 'Sourced press-fit rules within stated scope'],
  },
]

export function findDestination(path: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.path === path)
}
