/** Part C of the Hot Work Certificate (TC-SF-SAF-010) — the precautions checklist. */
export interface ChecklistGroup {
  title: string;
  items: { key: string; label: string }[];
}

export const HOT_WORK_CHECKLIST: ChecklistGroup[] = [
  {
    title: 'General',
    items: [
      { key: 'gen_sprinkler', label: 'Available sprinkler protection in service' },
      { key: 'gen_equipment', label: 'Hot Work equipment inspected to certify it is in proper working order and Fire Safe condition' },
      { key: 'gen_detection', label: 'Fire detection isolated only in the zone of work' },
      { key: 'gen_wheel_grade', label: 'Correct grade of grinding wheel / disc used' },
      { key: 'gen_wheel_check', label: 'Wheel / disc checked before each use for condition and adequacy of fastening' },
    ],
  },
  {
    title: 'Required within 11 metres (35 ft) of the Work Area',
    items: [
      { key: 'near_floors_swept', label: 'Floors swept clean of all combustibles' },
      { key: 'near_floors_wet', label: 'Combustible floors wet down or covered with damp sand, metal or other non-combustible shields' },
      { key: 'near_elements_covered', label: 'Combustible elements of construction covered with fire resistant covers' },
      { key: 'near_materials_removed', label: 'All ordinary combustible materials removed' },
      { key: 'near_covers_suspended', label: 'Fire resistant covers suspended beneath the Hot Work Area' },
      { key: 'near_explosive', label: 'Explosive atmospheres eliminated' },
    ],
  },
  {
    title: 'Work on Walls & Ceilings',
    items: [
      { key: 'wall_opposite', label: 'Combustibles moved away from the opposite side of the wall' },
      { key: 'wall_insulation', label: 'Exposed combustible ceiling and wall insulation covered or removed' },
    ],
  },
  {
    title: 'Work on Enclosed Equipment',
    items: [
      { key: 'enc_cleaned', label: 'Equipment cleaned of all combustibles' },
      { key: 'enc_purged', label: 'Equipment purged of flammable vapours' },
    ],
  },
  {
    title: 'Fire Watch & Work Area Monitoring',
    items: [
      { key: 'fw_trained', label: 'Fire Watch trained in use of equipment and in raising / sounding the alarm' },
      { key: 'fw_operator_30', label: 'If Fire Watch NOT assigned — maintained by the Hot Work Operator for 30 minutes minimum' },
      { key: 'fw_assigned_30', label: 'If Fire Watch assigned — maintained for 30 minutes minimum' },
    ],
  },
];

export const CHECKLIST_TOTAL = HOT_WORK_CHECKLIST.reduce((n, g) => n + g.items.length, 0);

export const splitChecklist = (v?: string | null): Set<string> =>
  new Set((v ?? '').split(',').map((s) => s.trim()).filter(Boolean));

export const joinChecklist = (s: Set<string>): string | null => (s.size ? Array.from(s).join(',') : null);

/** Hot Work Part A "Section / Unit" starter list (learned values are added automatically). */
export const SECTION_DEFAULTS = ['GT1', 'GT2', 'STG', 'HRSG 1', 'HRSG 2', 'Water Treatment Plant', 'Fuel Handling', 'Workshop'];

/** Common locations for Gas Free Certificates (learned values are added automatically). */
export const GAS_LOCATION_DEFAULTS = ['HRSG 1', 'HRSG 2', 'Fuel Oil Tank', 'Clarifier', 'Neutralizing Sump', 'Cooling Water Basin'];
