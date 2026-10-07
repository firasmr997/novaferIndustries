import {
  ComplaintPriority, ComplaintStatus, ComplaintType, InvoiceStatus, PaymentMethod, QuoteStatus, Role,
  StockMovementType,
} from './models';

/** French interface labels for every enum the API returns. */

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Direction',
  SALES: 'Commercial',
  ACCOUNTANT: 'Comptabilité',
  QUALITY: 'Qualité',
  WAREHOUSE: 'Magasin',
};

export const QUOTE_STATUS: Record<QuoteStatus, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoyé',
  ACCEPTE: 'Accepté',
  REFUSE: 'Refusé',
  EXPIRE: 'Expiré',
  FACTURE: 'Facturé',
};

export const INVOICE_STATUS: Record<InvoiceStatus, string> = {
  BROUILLON: 'Brouillon',
  EMISE: 'Émise',
  PARTIELLEMENT_PAYEE: 'Partiellement payée',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  VIREMENT: 'Virement',
  CHEQUE: 'Chèque',
  TRAITE: 'Traite',
  ESPECES: 'Espèces',
  CARTE: 'Carte',
};

export const COMPLAINT_TYPE: Record<ComplaintType, string> = {
  QUALITE: 'Qualité',
  LIVRAISON: 'Livraison',
  FACTURATION: 'Facturation',
  AUTRE: 'Autre',
};

export const COMPLAINT_PRIORITY: Record<ComplaintPriority, string> = {
  BASSE: 'Basse',
  MOYENNE: 'Moyenne',
  HAUTE: 'Haute',
  CRITIQUE: 'Critique',
};

export const COMPLAINT_STATUS: Record<ComplaintStatus, string> = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  RESOLUE: 'Résolue',
  CLOTUREE: 'Clôturée',
};

export const MOVEMENT_TYPE: Record<StockMovementType, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie',
  AJUSTEMENT: 'Ajustement',
};

export const VAT_RATES = [19, 13, 7, 0];

export const UNITS = ['pièce', 'boîte', 'kg', 'm', 'm²', 'feuille', 'barre', 'rouleau', 'lot', 'heure'];

export function entries<K extends string>(labels: Record<K, string>): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}
