import client from "./api";
import type { ReportRecipient, ProcurementOutlook } from "../types";
import type {
  ReportTemplate,
  ReportField,
  ReportData,
  CreateTemplateDto,
  ExecuteReportDto,
  ReportSchedule,
} from "../types/reports";

export const reportTemplatesApi = {
  getTemplates: (buildingId: number) =>
    client.get<ReportTemplate[]>(`/reporttemplates?buildingId=${buildingId}`),

  getTemplate: (id: number) =>
    client.get<ReportTemplate>(`/reporttemplates/${id}`),

  createTemplate: (buildingId: number, data: CreateTemplateDto) =>
    client.post<ReportTemplate>(`/reporttemplates?buildingId=${buildingId}`, data),

  updateTemplate: (id: number, data: Partial<CreateTemplateDto>) =>
    client.put(`/reporttemplates/${id}`, data),

  deleteTemplate: (id: number) =>
    client.delete(`/reporttemplates/${id}`),

  cloneTemplate: (id: number, newName?: string) =>
    client.post<ReportTemplate>(
      `/reporttemplates/${id}/clone${newName ? `?newName=${encodeURIComponent(newName)}` : ""}`
    ),

  getFields: (dataSource: string) =>
    client.get<ReportField[]>(`/reporttemplates/fields/${dataSource}`),

  executeReport: (data: ExecuteReportDto) =>
    client.post<ReportData>("/reporttemplates/execute", data),

  previewReport: (id: number, dateFrom?: Date, dateTo?: Date) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append("dateFrom", dateFrom.toISOString());
    if (dateTo) params.append("dateTo", dateTo.toISOString());
    return client.get<ReportData>(`/reporttemplates/preview/${id}?${params}`);
  },

  exportPdf: (data: ExecuteReportDto) =>
    client.post("/reporttemplates/export/pdf", data, { responseType: "blob" }),

  exportExcel: (data: ExecuteReportDto) =>
    client.post("/reporttemplates/export/excel", data, { responseType: "blob" }),

  emailReport: (data: ExecuteReportDto & { recipientIds: number[]; exportFormat: string }) =>
    client.post<{ sent: number; rows: number }>("/reporttemplates/email", data),
};

export const reportSchedulesApi = {
  getSchedules: (buildingId: number) =>
    client.get<ReportSchedule[]>(`/reportschedules?buildingId=${buildingId}`),

  createSchedule: (data: {
    reportTemplateId: number;
    cron: string;
    enabled: boolean;
    exportFormat: string;
    dateRangeOverride?: string;
    recipientIds: number[];
  }) => client.post<ReportSchedule>("/reportschedules", data),

  updateSchedule: (
    id: number,
    data: Partial<{
      cron: string;
      enabled: boolean;
      exportFormat: string;
      dateRangeOverride: string;
      recipientIds: number[];
    }>
  ) => client.put(`/reportschedules/${id}`, data),

  deleteSchedule: (id: number) => client.delete(`/reportschedules/${id}`),

  triggerSchedule: (id: number) =>
    client.post<{ triggered: boolean; nextRun: string }>(`/reportschedules/${id}/run`),
};

// Cross-building procurement outlook (ADR-011) — SuperAdmin only on the server.
export const procurementApi = {
  getOutlook: (horizonDays: number) =>
    client.get<ProcurementOutlook>(
      `/reports/built-in/procurement-outlook?horizonDays=${horizonDays}`
    ),
};

export const recipientsApi = {
  getByBuilding: (buildingId: number) =>
    client.get<ReportRecipient[]>(`/ReportRecipients?buildingId=${buildingId}`),
  create: (data: Omit<ReportRecipient, "recipientId">) =>
    client.post<ReportRecipient>("/ReportRecipients", data),
  update: (id: number, data: Partial<ReportRecipient>) =>
    client.put<ReportRecipient>(`/ReportRecipients/${id}`, data),
  delete: (id: number) => client.delete(`/ReportRecipients/${id}`),
};
