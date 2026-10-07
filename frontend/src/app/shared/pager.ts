import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-pager',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <div class="pager">
        <span class="num">{{ from() }}–{{ to() }} sur {{ total() }}</span>
        <div class="row-actions">
          <button type="button" class="btn btn-sm" [disabled]="page() === 0" (click)="pageChange.emit(page() - 1)">
            <app-icon name="chevron-left" [size]="14" /> Précédent
          </button>
          <button type="button" class="btn btn-sm" [disabled]="page() >= pages() - 1" (click)="pageChange.emit(page() + 1)">
            Suivant <app-icon name="chevron-right" [size]="14" />
          </button>
        </div>
      </div>
    }
  `,
})
export class Pager {
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  protected readonly from = computed(() => this.page() * this.size() + 1);
  protected readonly to = computed(() => Math.min(this.total(), (this.page() + 1) * this.size()));
}
