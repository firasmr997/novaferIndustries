import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input } from '@angular/core';
import {
  AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Boxes, Building2, Check, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, CircleAlert, ClipboardList, Copy, Download, FilePlus2, FileText, Filter, Inbox,
  LayoutDashboard, LogOut, Menu, MessageSquareWarning, MoreHorizontal, Package, Pencil, Plus, Printer, Receipt,
  RotateCcw, Search, Send, Settings, ShieldCheck, Trash2, TrendingUp, Undo2, UserCog, Users, Wallet, Warehouse, X,
  XCircle, type IconNode,
} from 'lucide';

/** The icon set used across the app (Lucide, 1.6 stroke). Only registered icons are bundled. */
const ICONS: Record<string, IconNode> = {
  'alert-triangle': AlertTriangle,
  'arrow-down-right': ArrowDownRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'bar-chart': BarChart3,
  boxes: Boxes,
  building: Building2,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-alert': CircleAlert,
  clipboard: ClipboardList,
  copy: Copy,
  download: Download,
  'file-plus': FilePlus2,
  'file-text': FileText,
  filter: Filter,
  inbox: Inbox,
  dashboard: LayoutDashboard,
  logout: LogOut,
  menu: Menu,
  complaint: MessageSquareWarning,
  more: MoreHorizontal,
  package: Package,
  pencil: Pencil,
  plus: Plus,
  printer: Printer,
  receipt: Receipt,
  undo: RotateCcw,
  search: Search,
  send: Send,
  settings: Settings,
  shield: ShieldCheck,
  trash: Trash2,
  trending: TrendingUp,
  revert: Undo2,
  'user-cog': UserCog,
  users: Users,
  wallet: Wallet,
  warehouse: Warehouse,
  x: X,
  'x-circle': XCircle,
};

const SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  selector: 'app-icon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex:none;line-height:0' },
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(16);
  readonly stroke = input(1.6);

  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    effect(() => {
      const node = ICONS[this.name()];
      const el = this.host.nativeElement as HTMLElement;
      el.replaceChildren();
      if (!node) return;
      const svg = document.createElementNS(SVG_NS, 'svg');
      const size = String(this.size());
      for (const [k, v] of Object.entries({
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': String(this.stroke()), 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      })) {
        svg.setAttribute(k, v);
      }
      for (const [tag, attrs] of node) {
        const child = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) child.setAttribute(k, String(v));
        svg.appendChild(child);
      }
      el.appendChild(svg);
    });
  }
}
