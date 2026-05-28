export interface HourlyExchangeGeneration {
  id: string;
  logDate: string;
  logHour: number;
  cieMW?: number;
  sonabelMW?: number;
  tTagMW?: number;
  bTagMW?: number;
  cgtMW?: number;
  caiMW?: number;
  cebMW?: number;
  createdOn: string;
  createdByName: string;
  createdByEmail: string;
}

export interface ExchangeGenerationForm {
  logDate: string;
  logHour: number | string;
  cieMW: number | string;
  sonabelMW: number | string;
  tTagMW: number | string;
  bTagMW: number | string;
  cgtMW: number | string;
  caiMW: number | string;
  cebMW: number | string;
}