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
  classificationType: string;
}

// ─── Generation Type ───────────────────────────────────────────────────────────
export interface GenerationType extends AuditFields {
  typeCode: number;
  typeName: string;
  classificationCode: number;
  classificationType: string;
}

export interface GenerationTypeForm {
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
  generationTypeCode: number;
  plantOwner: string;
  numberOfUnits: number;
  installedCapacity: number;
  standardMeasuringUnit: number;
  commissioningDate: string;
  locationCode: number;
}

// ─── Plant Unit ────────────────────────────────────────────────────────────────
export interface PlantUnit extends AuditFields {
  plantName: string;
  plantCode: string;
  unitName: string;
  unitCode: string;
  installedCapacity: number;
  fuelConfiguration: string;
  fuelType: string;
}

export interface PlantUnitForm {
  plantCode: string;
  unitName: string;
  unitCode: string;
  installedCapacity: number;
  fuelConfiguration: string;
  fuelType: string;
}

export interface UpdatePlantUnitForm {
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
  plantCode: string;
  unitCode: string;
  systemName: string;
  systemCode: string;
}

export interface UpdatePlantUnitSystemForm {
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
  plantCode: string;
  unitCode: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
}

export interface UpdatePlantUnitSubSystemForm {
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
  plantCode: string;
  unitCode: string;
  systemCode: string;
  subSystemCode: string;
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

export interface UpdatePlantUnitEquipmentForm {
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
  plantCode: string;
  bopName: string;
  bopCode: string;
}

export interface UpdateBalanceOfPlantForm {
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
  plantCode: string;
  bopCode: string;
  systemName: string;
  systemCode: string;
}

export interface UpdateBopSystemForm {
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
  plantCode: string;
  bopCode: string;
  systemCode: string;
  subSystemName: string;
  subSystemCode: string;
}

export interface UpdateBopSubSystemForm {
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
  plantCode: string;
  bopCode: string;
  systemCode: string;
  subsystemCode: string;
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

export interface UpdateBopEquipmentForm {
  equipmentName: string;
  equipmentCode: string;
  multiplier: number;
}

// ─── Plant Location ────────────────────────────────────────────────────────────
export interface PlantLocation extends AuditFields {
  locationCode: number;
  locationName: string;
}

export interface PlantLocationForm {
  locationName: string;
}

// ─── API Response wrapper ──────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}