import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/http';
import { Shell } from './layout/shell';

const editor = () => import('./features/documents/document-editor').then((m) => m.DocumentEditor);
const complaintForm = () => import('./features/complaints/complaint-form').then((m) => m.ComplaintForm);

export const routes: Routes = [
  { path: 'connexion', title: 'Connexion · Novafer', loadComponent: () => import('./features/login/login').then((m) => m.Login) },
  {
    path: 'imprimer/:kind/:id',
    canActivate: [authGuard],
    title: 'Impression · Novafer',
    loadComponent: () => import('./features/documents/print').then((m) => m.PrintDocument),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', title: 'Tableau de bord · Novafer', loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'analyses', title: 'Analyses · Novafer', loadComponent: () => import('./features/analytics/analytics').then((m) => m.Analytics) },

      { path: 'devis', title: 'Devis · Novafer', loadComponent: () => import('./features/quotes/quote-list').then((m) => m.QuoteList) },
      { path: 'devis/nouveau', title: 'Nouveau devis · Novafer', loadComponent: editor, data: { kind: 'quote' } },
      { path: 'devis/:id', title: 'Devis · Novafer', loadComponent: () => import('./features/quotes/quote-detail').then((m) => m.QuoteDetailPage) },
      { path: 'devis/:id/modifier', title: 'Modifier le devis · Novafer', loadComponent: editor, data: { kind: 'quote' } },

      { path: 'factures', title: 'Factures · Novafer', loadComponent: () => import('./features/invoices/invoice-list').then((m) => m.InvoiceList) },
      { path: 'factures/nouvelle', title: 'Nouvelle facture · Novafer', loadComponent: editor, data: { kind: 'invoice' } },
      { path: 'factures/:id', title: 'Facture · Novafer', loadComponent: () => import('./features/invoices/invoice-detail').then((m) => m.InvoiceDetailPage) },
      { path: 'factures/:id/modifier', title: 'Modifier la facture · Novafer', loadComponent: editor, data: { kind: 'invoice' } },

      { path: 'reclamations', title: 'Réclamations · Novafer', loadComponent: () => import('./features/complaints/complaint-list').then((m) => m.ComplaintList) },
      { path: 'reclamations/nouvelle', title: 'Nouvelle réclamation · Novafer', loadComponent: complaintForm },
      { path: 'reclamations/:id', title: 'Réclamation · Novafer', loadComponent: () => import('./features/complaints/complaint-detail').then((m) => m.ComplaintDetailPage) },
      { path: 'reclamations/:id/modifier', title: 'Modifier la réclamation · Novafer', loadComponent: complaintForm },

      { path: 'clients', title: 'Clients · Novafer', loadComponent: () => import('./features/clients/client-list').then((m) => m.ClientList) },
      { path: 'clients/:id', title: 'Client · Novafer', loadComponent: () => import('./features/clients/client-detail').then((m) => m.ClientDetailPage) },

      { path: 'produits', title: 'Produits · Novafer', loadComponent: () => import('./features/products/product-list').then((m) => m.ProductList) },
      { path: 'stock', title: 'Stock · Novafer', loadComponent: () => import('./features/stock/stock').then((m) => m.StockPage) },

      { path: 'parametres', title: 'Paramètres · Novafer', loadComponent: () => import('./features/settings/settings').then((m) => m.SettingsPage) },
      { path: 'utilisateurs', title: 'Utilisateurs · Novafer', canActivate: [adminGuard], loadComponent: () => import('./features/settings/users').then((m) => m.UsersPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
