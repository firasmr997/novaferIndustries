import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { COMPLAINT_PRIORITY, COMPLAINT_STATUS, INVOICE_STATUS, QUOTE_STATUS } from '../core/labels';

type Kind = 'quote' | 'invoice' | 'complaint' | 'priority';
type Tone = 'info' | 'success' | 'warning' | 'danger' | 'ember' | 'neutral' | 'muted';

const TONES: Record<Kind, Record<string, Tone>> = {
  quote: { BROUILLON: 'muted', ENVOYE: 'info', ACCEPTE: 'success', REFUSE: 'danger', EXPIRE: 'neutral', FACTURE: 'success' },
  invoice: { BROUILLON: 'muted', EMISE: 'neutral', PARTIELLEMENT_PAYEE: 'warning', PAYEE: 'success', ANNULEE: 'neutral' },
  complaint: { OUVERTE: 'danger', EN_COURS: 'warning', RESOLUE: 'success', CLOTUREE: 'neutral' },
  priority: { BASSE: 'neutral', MOYENNE: 'info', HAUTE: 'ember', CRITIQUE: 'danger' },
};

const LABELS: Record<Kind, Record<string, string>> = {
  quote: QUOTE_STATUS,
  invoice: INVOICE_STATUS,
  complaint: COMPLAINT_STATUS,
  priority: COMPLAINT_PRIORITY,
};

/** Status pill. An open facture past its due date reads "En retard" whatever its stored status. */
@Component({
  selector: 'app-status',
  template: `<span class="badge tone-{{ tone() }}">{{ text() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly kind = input.required<Kind>();
  readonly value = input.required<string>();
  readonly overdue = input(false);

  protected readonly tone = computed<Tone>(() =>
    this.overdue() ? 'danger' : (TONES[this.kind()][this.value()] ?? 'neutral'));
  protected readonly text = computed(() =>
    this.overdue() ? 'En retard' : (LABELS[this.kind()][this.value()] ?? this.value()));
}
