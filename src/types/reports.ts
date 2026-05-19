export interface ReportTemplate {
  reportTemplateId: number;
  buildingId: number;
  name: string;
  description?: string;
  dataSource: string;
  columnsJson: string;
  filtersJson?: string;
  chartsJson?: string;
  defaultDateRange: string;
  sortColumn?: string;
  sortDescending: boolean;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  isSystem: boolean;
  scheduleCount: number;
}

export interface ReportColumn {
  id: string;
  field: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "status";
  width?: number;
  align?: "left" | "center" | "right";
  format?: string;
  visible: boolean;
  sortable: boolean;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
}

export interface ReportFilter {
  id: string;
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "between";
  value: unknown;
  enabled: boolean;
}

export interface ReportChart {
  id: string;
  type: "line" | "bar" | "donut" | "stacked-bar";
  title: string;
  xField: string;
  yField: string;
  groupBy?: string;
  colorScheme?: string;
  showLegend: boolean;
  position: "top" | "bottom" | "inline";
}

export interface ReportField {
  field: string;
  label: string;
  type: string;
  sortable: boolean;
  defaultFormat?: string;
}

export interface ReportDataRow {
  [key: string]: unknown;
}

export interface ReportData {
  rows: ReportDataRow[];
  aggregations: Record<string, unknown>;
  totalRows: number;
  executionMs: number;
}

export interface ReportSchedule {
  reportScheduleId: number;
  reportTemplateId: number;
  templateName: string;
  cron: string;
  cronDescription: string;
  enabled: boolean;
  exportFormat: string;
  dateRangeOverride?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  recipientIds: number[];
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  dataSource: string;
  columnsJson: string;
  filtersJson?: string;
  chartsJson?: string;
  defaultDateRange: string;
  sortColumn?: string;
  sortDescending: boolean;
}

export interface ExecuteReportDto {
  reportTemplateId: number;
  dateFrom?: string;
  dateTo?: string;
  filtersOverride?: string;
}

export type DataSourceType = "WorkOrders" | "Inventory" | "Technicians" | "Compliance";

export const DATA_SOURCES: { value: DataSourceType; label: string; description: string }[] = [
  { value: "WorkOrders", label: "Work Orders", description: "Filter changes, due dates, technician assignments" },
  { value: "Inventory", label: "Inventory", description: "Stock levels, min levels, reorder recommendations" },
  { value: "Technicians", label: "Technicians", description: "Performance metrics, completion rates" },
  { value: "Compliance", label: "Compliance", description: "Building-level compliance percentages" },
];

export const DATE_RANGES = [
  { value: "Last7Days", label: "Last 7 Days" },
  { value: "Last30Days", label: "Last 30 Days" },
  { value: "Last90Days", label: "Last 90 Days" },
  { value: "LastYear", label: "Last Year" },
  { value: "Custom", label: "Custom" },
];
