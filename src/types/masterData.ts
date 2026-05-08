// ─── Base audit fields shared by all models ───────────────────────────────────
export interface AuditFields {
  id: string;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

// ─── Plant Classification ──────────────────────────────────────────────────────
export interface PlantClassification extends AuditFields {
  classificationCode: number;
  classificationType: string; // thermal, hydro, solar, wind
}

export interface PlantClassificationForm {
  classificationCode: number;
  classificationType: string;
}

// ─── Generation Type ───────────────────────────────────────────────────────────
export interface GenerationType extends AuditFields {
  typeCode: number;
  typeName: string; // simple, combine, hydro, solar, wind
  classificationCode: number;
}

export interface GenerationTypeForm {
  typeCode: number;
  typeName: string;
  classificationCode: number;
}

// ─── Power Plant ───────────────────────────────────────────────────────────────
export interface PowerPlant extends AuditFields {
  plantName: string;
  plantCode: string;
  classificationCode: number;
  classificationType: string;
  generationTypeCode: number;
  generationTypeName: string;
  plantOwner: string;
  numberOfUnits: number;
  installedCapacity: number;
  standardMeasuringUnit: number;
  commissioningDate: string;
  locationCode: number;
  locationName: string;
}

export interface PowerPlantForm {
  plantName: string;
  plantCode: string;
  classificationCode: number;
  classificationType: string;
  generationTypeCode: number;
  generationTypeName: string;
  plantOwner: string;
  numberOfUnits: number;
  installedCapacity: number;
  standardMeasuringUnit: number;
  commissioningDate: string;
  locationCode: number;
  locationName: string;
}

// ─── Plant Unit ────────────────────────────────────────────────────────────────
export interface PlantUnit extends AuditFields {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  installedCapacity: number;
  fuelConfiguration: string; // Single, Dual
  fuelType: string;          // Gas, LCO, DFO
}

export interface PlantUnitForm {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  installedCapacity: number;
  fuelConfiguration: string;
  fuelType: string;
}

// ─── Plant Unit System ─────────────────────────────────────────────────────────
export interface PlantUnitSystem extends AuditFields {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
}

export interface PlantUnitSystemForm {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
}

// ─── Plant Unit SubSystem ──────────────────────────────────────────────────────
export interface PlantUnitSubSystem extends AuditFields {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
}

export interface PlantUnitSubSystemForm {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
}

// ─── Plant Unit Equipment ──────────────────────────────────────────────────────
export interface PlantUnitEquipment extends AuditFields {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

export interface PlantUnitEquipmentForm {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

// ─── Balance of Plant ──────────────────────────────────────────────────────────
export interface BalanceOfPlant extends AuditFields {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
}

export interface BalanceOfPlantForm {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
}

// ─── BOP System ────────────────────────────────────────────────────────────────
export interface BopSystem extends AuditFields {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
}

export interface BopSystemForm {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
}

// ─── BOP SubSystem ─────────────────────────────────────────────────────────────
export interface BopSubSystem extends AuditFields {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
}

export interface BopSubSystemForm {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
}

// ─── BOP SubSystem Equipment ───────────────────────────────────────────────────
export interface BopEquipment extends AuditFields {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
  subsystemName: string;
  subsystemCode: string;
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

export interface BopEquipmentForm {
  plantName: string;
  plantCode: string;
  bopName: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
  subsystemName: string;
  subsystemCode: string;
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

// ─── Plant Location ────────────────────────────────────────────────────────────
export interface PlantLocation extends AuditFields {
  locationCode: number;
  locationName: string;
}

// ─── API Response wrapper ──────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}