import axiosInstance from '../axiosInstance';
import type { ThermalSectionEquipmentRow, SaveThermalSectionEquipmentRowItem, ThermalSectionTextEntry } from '../../types/thermalStationLog';

const BASE = '/thermalstationlogs';

export const thermalStationLogSectionsApi = {

  // Equipment grid sections
  // sectionKey: 'rectifiers_ups' | 'compressors_dryers' | 'hrsg'

  getEquipmentRows: (logId: string, sectionKey: string) =>
    axiosInstance.get<ThermalSectionEquipmentRow[]>(
      `${BASE}/${logId}/sections/${sectionKey}/equipment`
    ),

  saveAllEquipmentRows: (
    logId: string,
    sectionKey: string,
    items: SaveThermalSectionEquipmentRowItem[]
  ) =>
    axiosInstance.post<ThermalSectionEquipmentRow[]>(
      `${BASE}/${logId}/sections/${sectionKey}/equipment/save-all`,
      { sectionKey, items }
    ),

  // Free text sections
  // sectionKey: 'cems' | 'air_pulse_system' | 'fuel_treatment_plant' |
  //             'oily_water_system' | 'chemical_lagoon_system'

  getTextEntry: (logId: string, sectionKey: string) =>
    axiosInstance.get<ThermalSectionTextEntry>(
      `${BASE}/${logId}/sections/${sectionKey}/text`
    ),

  saveTextEntry: (logId: string, sectionKey: string, content: string) =>
    axiosInstance.post<ThermalSectionTextEntry>(
      `${BASE}/${logId}/sections/${sectionKey}/text`,
      { sectionKey, content }
    ),
};
