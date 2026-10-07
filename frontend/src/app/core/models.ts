// API shapes, mirroring the Spring Boot DTO records.

export type Role = 'ADMIN' | 'MANAGER' | 'SALES' | 'ACCOUNTANT' | 'QUALITY' | 'WAREHOUSE';
export type QuoteStatus = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE' | 'FACTURE';
export type InvoiceStatus = 'BROUILLON' | 'EMISE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE' | 'ANNULEE';
export type PaymentMethod = 'ESPECES' | 'CHEQUE' | 'VIREMENT' | 'TRAITE' | 'CARTE';
export type ComplaintType = 'QUALITE' | 'LIVRAISON' | 'FACTURATION' | 'AUTRE';
export type ComplaintPriority = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'CRITIQUE';
export type ComplaintStatus = 'OUVERTE' | 'EN_COURS' | 'RESOLUE' | 'CLOTUREE';
export type StockMovementType = 'ENTREE' | 'SORTIE' | 'AJUSTEMENT';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Ref {
  id: number;
  label: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Settings {
  companyName: string;
  legalForm: string | null;
  matriculeFiscal: string | null;
  registreCommerce: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  bankName: string | null;
  rib: string | null;
  currency: string;
  defaultVatRate: number;
  fiscalStamp: number;
  fodecEnabled: boolean;
  fodecRate: number;
  paymentTermsDays: number;
  quoteValidityDays: number;
  invoiceFooter: string | null;
  quoteFooter: string | null;
  /** The database holds the fictional demo dataset. */
  demo: boolean;
}

export interface Category {
  id: number;
  code: string;
  name: string;
  description: string | null;
  productCount: number;
}

export interface Product {
  id: number;
  reference: string;
  name: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  material: string | null;
  unit: string;
  unitPrice: number;
  costPrice: number;
  marginPct: number;
  vatRate: number;
  stockQuantity: number;
  minStock: number;
  lowStock: boolean;
  active: boolean;
}

export interface StockMovement {
  id: number;
  productId: number;
  productReference: string;
  productName: string;
  unit: string;
  type: StockMovementType;
  quantity: number;
  stockAfter: number;
  reason: string | null;
  documentRef: string | null;
  movementDate: string;
  createdBy: string | null;
}

export interface Client {
  id: number;
  code: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  matriculeFiscal: string | null;
  sector: string | null;
  paymentTermsDays: number;
  vatExempt: boolean;
  notes: string | null;
  active: boolean;
}

export interface ClientStats {
  revenueYtd: number;
  revenueTotal: number;
  openBalance: number;
  overdueBalance: number;
  invoiceCount: number;
  quoteCount: number;
  openComplaintCount: number;
  averagePaymentDays: number | null;
}

export interface ClientDetail {
  client: Client;
  stats: ClientStats;
}

export interface Party {
  id: number;
  code: string;
  companyName: string;
  contactName: string | null;
  address: string | null;
  city: string | null;
  matriculeFiscal: string | null;
  phone: string | null;
  email: string | null;
  vatExempt: boolean;
}

export interface LineRequest {
  productId: number | null;
  reference: string | null;
  description: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number | null;
}

export interface Line extends LineRequest {
  id: number;
  position: number;
  totalHt: number;
}

export interface VatLine {
  rate: number;
  base: number;
  amount: number;
}

export interface Totals {
  totalHt: number;
  totalDiscount: number;
  fodecRate: number;
  totalFodec: number;
  totalVat: number;
  fiscalStamp: number;
  totalTtc: number;
  vatBreakdown: VatLine[];
}

export interface QuoteSummary {
  id: number;
  number: string;
  client: Ref;
  issueDate: string;
  validUntil: string;
  status: QuoteStatus;
  subject: string | null;
  totalHt: number;
  totalTtc: number;
  convertedInvoiceId: number | null;
}

export interface QuoteDetail {
  id: number;
  number: string;
  client: Party;
  issueDate: string;
  validUntil: string;
  status: QuoteStatus;
  subject: string | null;
  notes: string | null;
  lines: Line[];
  totals: Totals;
  convertedInvoiceId: number | null;
  convertedInvoiceNumber: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRequest {
  clientId: number;
  issueDate: string | null;
  validUntil?: string | null;
  dueDate?: string | null;
  subject: string | null;
  notes: string | null;
  lines: LineRequest[];
}

export interface InvoiceSummary {
  id: number;
  number: string | null;
  client: Ref;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  overdue: boolean;
  daysOverdue: number;
  subject: string | null;
  totalTtc: number;
  amountPaid: number;
  balanceDue: number;
}

export interface Payment {
  id: number;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdBy: string | null;
}

export interface InvoiceDetail {
  id: number;
  number: string | null;
  client: Party;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  overdue: boolean;
  daysOverdue: number;
  subject: string | null;
  notes: string | null;
  lines: Line[];
  totals: Totals;
  amountPaid: number;
  balanceDue: number;
  payments: Payment[];
  quoteId: number | null;
  quoteNumber: string | null;
  issuedAt: string | null;
  cancelledAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ComplaintSummary {
  id: number;
  number: string;
  client: Ref;
  subject: string;
  type: ComplaintType;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignee: Ref | null;
  openedAt: string;
  ageDays: number;
  invoiceNumber: string | null;
  productReference: string | null;
}

export interface ComplaintEvent {
  id: number;
  author: string;
  message: string | null;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus | null;
  createdAt: string;
}

export interface ComplaintDetail {
  id: number;
  number: string;
  client: Ref;
  subject: string;
  description: string;
  type: ComplaintType;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignee: Ref | null;
  invoiceId: number | null;
  invoiceNumber: string | null;
  productId: number | null;
  productReference: string | null;
  productName: string | null;
  resolution: string | null;
  estimatedCost: number | null;
  openedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  ageDays: number;
  createdBy: string | null;
  events: ComplaintEvent[];
}

export interface ComplaintRequest {
  clientId: number;
  invoiceId: number | null;
  productId: number | null;
  subject: string;
  description: string;
  type: ComplaintType;
  priority: ComplaintPriority;
  assigneeId: number | null;
  estimatedCost: number | null;
}

export interface Kpis {
  revenueMonth: number;
  revenuePrevMonth: number;
  revenuePrevMonthToDate: number;
  revenueYtd: number;
  revenuePrevYtd: number;
  collectedMonth: number;
  receivables: number;
  overdueAmount: number;
  overdueCount: number;
  pendingQuotesAmount: number;
  pendingQuotesCount: number;
  conversionRate: number;
  openComplaints: number;
  criticalComplaints: number;
  lowStockCount: number;
  draftInvoices: number;
}

export interface AgingBucket {
  key: string;
  label: string;
  heat: number;
  amount: number;
  count: number;
}

export interface MonthPoint {
  month: string;
  invoiced: number;
  collected: number;
  quoted: number;
  margin: number;
  complaints: number;
}

export interface Home {
  kpis: Kpis;
  aging: AgingBucket[];
  monthly: MonthPoint[];
  overdueInvoices: InvoiceSummary[];
  pendingQuotes: QuoteSummary[];
  urgentComplaints: ComplaintSummary[];
  lowStock: Product[];
}

export interface Analytics {
  months: number;
  totals: {
    invoiced: number;
    collected: number;
    margin: number;
    marginRate: number;
    invoiceCount: number;
    averageInvoice: number;
    dso: number | null;
    averagePaymentDays: number | null;
    complaints: number;
    complaintsPer100Invoices: number;
    nonQualityCost: number;
    stockValue: number;
  };
  monthly: MonthPoint[];
  topClients: { id: number; name: string; city: string; revenue: number; share: number; invoices: number; openBalance: number }[];
  topProducts: { id: number; reference: string; name: string; quantity: number; unit: string; revenue: number; margin: number }[];
  revenueByCategory: { name: string; revenue: number; share: number }[];
  quoteFunnel: {
    created: number; sent: number; accepted: number; refused: number; expired: number; invoiced: number;
    conversionRate: number; quotedAmount: number; wonAmount: number;
  };
  complaintsByType: { type: ComplaintType; count: number; open: number; averageResolutionDays: number | null }[];
  paymentMethods: { method: PaymentMethod; amount: number; count: number }[];
}

export interface ApiError {
  message: string;
  errors: { field: string; message: string }[];
}
