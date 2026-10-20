// Extra hourly readings (thermal or hydro) for all plants of a type or for chosen plants.
export type ExtraFieldType = 'number' | 'text' | 'select' | 'lookup';

/** Key of the master data a "lookup" field picks from (e.g. "bearing-metals"). The list comes from the API. */
export type LookupSource = string;

/** A source a lookup field can pick from. scope "unit" = choices follow the unit on the hourly form; "plant" = the plant. */
export interface LookupSourceInfo {
  key: LookupSource;
  label: string;
  scope: 'plant' | 'unit';
}

/** One choice in a lookup dropdown. */
export interface LookupOption {
  id: string;
  name: string;
}

export type ExtraFieldLogType = 'thermal' | 'hydro';

export interface HourlyExtraFieldPlant {
  plantId?: string | null;
  plantCode: string;
  plantName: string;
}

export interface HourlyExtraField {
  id: string;
  /** Which hourly log the field is on. */
  logType: ExtraFieldLogType;
  /** True = every plant of this type, including plants added later. */
  allPlants: boolean;
  /** The plants the field applies to when allPlants is false. */
  plants: HourlyExtraFieldPlant[];
  section: string;
  label: string;
  measureUnit?: string | null;
  fieldType: ExtraFieldType;
  options: string[];
  lookupSource?: LookupSource | null;
  lookupScope?: 'plant' | 'unit' | null;
  isRequired: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  displayOrder: number;
  isActive: boolean;
  /** Hourly readings already hold a value for this field — it can only be deactivated, not deleted. */
  hasValues: boolean;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface SaveHourlyExtraFieldDto {
  logType?: ExtraFieldLogType; // create only — the log can't change afterwards
  allPlants: boolean;
  plantCodes: string[];
  section: string;
  label: string;
  measureUnit?: string | null;
  fieldType: ExtraFieldType;
  options: string[];
  lookupSource?: LookupSource | null;
  isRequired: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  displayOrder: number;
  isActive: boolean;
}

/** A value as returned on an hourly thermal reading. */
export interface HourlyExtraFieldValue {
  fieldId: string;
  label: string;
  section: string;
  measureUnit?: string | null;
  fieldType: ExtraFieldType;
  numberValue?: number | null;
  /** Text / dropdown value; for a lookup field, the picked record's name as saved. */
  textValue?: string | null;
  /** Lookup field: ID of the picked record (e.g. the bearing). */
  refId?: string | null;
}

/** A value as sent with an hourly thermal reading. */
export interface HourlyExtraFieldValueInput {
  fieldId: string;
  numberValue?: number | null;
  textValue?: string | null;
  refId?: string | null;
}
