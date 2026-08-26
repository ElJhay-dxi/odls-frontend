export interface SafetyDocumentType {
  id: string;
  code: string;
  name: string;
  description?: string;
  applicableClassifications?: string;
  isActive: boolean;
  createdOn: string;
  createdByName: string;
}

export interface SaveSafetyDocumentTypeForm {
  name: string;
  description: string;
  applicableClassifications: string[];
  isActive: boolean;
}

export interface SaveSafetyDocumentTypeDto {
  name: string;
  description: string | null;
  applicableClassifications: string | null;
  isActive: boolean;
}