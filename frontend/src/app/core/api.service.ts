import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Analytics, Category, Client, ClientDetail, ComplaintDetail, ComplaintRequest, ComplaintStatus, ComplaintSummary,
  DocumentRequest, Home, InvoiceDetail, InvoiceSummary, Page, PaymentMethod, Product, QuoteDetail, QuoteSummary,
  Ref, Settings, StockMovement, StockMovementType, User,
} from './models';

type Params = Record<string, string | number | boolean | null | undefined>;

function params(values: Params): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
  }
  return p;
}

/** Typed access to every REST endpoint of the Novafer API. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  // Dashboard
  home = () => this.http.get<Home>('/api/dashboard');
  analytics = (months: number) => this.http.get<Analytics>('/api/analytics', { params: params({ months }) });

  // Settings and team
  settings = () => this.http.get<Settings>('/api/settings');
  saveSettings = (s: Settings) => this.http.put<Settings>('/api/settings', s);
  team = () => this.http.get<Ref[]>('/api/team');
  me = () => this.http.get<User>('/api/auth/me');
  changePassword = (currentPassword: string, newPassword: string) =>
    this.http.post<void>('/api/auth/password', { currentPassword, newPassword });

  // Users
  users = () => this.http.get<User[]>('/api/users');
  createUser = (u: Partial<User> & { password?: string }) => this.http.post<User>('/api/users', u);
  updateUser = (id: number, u: Partial<User> & { password?: string }) => this.http.put<User>(`/api/users/${id}`, u);

  // Catalogue
  categories = () => this.http.get<Category[]>('/api/categories');
  saveCategory = (c: Partial<Category>, id?: number) =>
    id ? this.http.put<Category>(`/api/categories/${id}`, c) : this.http.post<Category>('/api/categories', c);
  deleteCategory = (id: number) => this.http.delete<void>(`/api/categories/${id}`);
  products = (p: Params) => this.http.get<Page<Product>>('/api/products', { params: params(p) });
  product = (id: number) => this.http.get<Product>(`/api/products/${id}`);
  saveProduct = (body: object, id?: number) =>
    id ? this.http.put<Product>(`/api/products/${id}`, body) : this.http.post<Product>('/api/products', body);
  archiveProduct = (id: number) => this.http.delete<void>(`/api/products/${id}`);

  // Stock
  movements = (p: Params) => this.http.get<Page<StockMovement>>('/api/stock/movements', { params: params(p) });
  recordMovement = (body: { productId: number; type: StockMovementType; quantity: number; reason: string | null; documentRef: string | null }) =>
    this.http.post<StockMovement>('/api/stock/movements', body);

  // Clients
  clients = (p: Params) => this.http.get<Page<Client>>('/api/clients', { params: params(p) });
  client = (id: number) => this.http.get<ClientDetail>(`/api/clients/${id}`);
  saveClient = (body: Partial<Client>, id?: number) =>
    id ? this.http.put<Client>(`/api/clients/${id}`, body) : this.http.post<Client>('/api/clients', body);
  archiveClient = (id: number) => this.http.delete<void>(`/api/clients/${id}`);

  // Devis
  quotes = (p: Params) => this.http.get<Page<QuoteSummary>>('/api/quotes', { params: params(p) });
  quote = (id: number) => this.http.get<QuoteDetail>(`/api/quotes/${id}`);
  saveQuote = (body: DocumentRequest, id?: number) =>
    id ? this.http.put<QuoteDetail>(`/api/quotes/${id}`, body) : this.http.post<QuoteDetail>('/api/quotes', body);
  quoteAction = (id: number, action: 'SEND' | 'ACCEPT' | 'REFUSE' | 'REOPEN') =>
    this.http.post<QuoteDetail>(`/api/quotes/${id}/status`, { action });
  duplicateQuote = (id: number) => this.http.post<QuoteDetail>(`/api/quotes/${id}/duplicate`, {});
  convertQuote = (id: number) => this.http.post<InvoiceDetail>(`/api/quotes/${id}/convert`, {});
  deleteQuote = (id: number) => this.http.delete<void>(`/api/quotes/${id}`);

  // Factures
  invoices = (p: Params) => this.http.get<Page<InvoiceSummary>>('/api/invoices', { params: params(p) });
  invoice = (id: number) => this.http.get<InvoiceDetail>(`/api/invoices/${id}`);
  saveInvoice = (body: DocumentRequest, id?: number) =>
    id ? this.http.put<InvoiceDetail>(`/api/invoices/${id}`, body) : this.http.post<InvoiceDetail>('/api/invoices', body);
  issueInvoice = (id: number) => this.http.post<InvoiceDetail>(`/api/invoices/${id}/issue`, {});
  cancelInvoice = (id: number, reason: string) => this.http.post<InvoiceDetail>(`/api/invoices/${id}/cancel`, { reason });
  deleteInvoice = (id: number) => this.http.delete<void>(`/api/invoices/${id}`);
  addPayment = (id: number, body: { paymentDate: string; amount: number; method: PaymentMethod; reference: string | null; notes: string | null }) =>
    this.http.post<InvoiceDetail>(`/api/invoices/${id}/payments`, body);
  deletePayment = (id: number, paymentId: number) =>
    this.http.delete<InvoiceDetail>(`/api/invoices/${id}/payments/${paymentId}`);

  // Réclamations
  complaints = (p: Params) => this.http.get<Page<ComplaintSummary>>('/api/complaints', { params: params(p) });
  complaint = (id: number) => this.http.get<ComplaintDetail>(`/api/complaints/${id}`);
  saveComplaint = (body: ComplaintRequest, id?: number): Observable<ComplaintDetail> =>
    id ? this.http.put<ComplaintDetail>(`/api/complaints/${id}`, body) : this.http.post<ComplaintDetail>('/api/complaints', body);
  complaintStatus = (id: number, status: ComplaintStatus, comment: string | null, resolution: string | null) =>
    this.http.post<ComplaintDetail>(`/api/complaints/${id}/status`, { status, comment, resolution });
  complaintComment = (id: number, message: string) =>
    this.http.post<ComplaintDetail>(`/api/complaints/${id}/comments`, { message });
}
