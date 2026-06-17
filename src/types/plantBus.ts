export interface PlantBus {
  id: string;
  plantName: string;
  plantCode: string;
  busCode: string;
  busName: string;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface BusVoltageReadingRow {
  busCode: string;
  busName: string;
  voltage: string | number;
}

export interface HourlyBusVoltage {
  id: string;
  plantName: string;
  plantCode: string;
  logDate: string;
  logHour: number;
  remarks?: string;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
  busReadings: BusVoltageReadingRow[];
}