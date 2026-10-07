/** French spelling of amounts, as written on Tunisian invoices: "… dinars et 250 millimes". */

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
  'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? TENS[t] : u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${UNITS[n - 60]}`;
  if (n === 80) return 'quatre-vingts';
  return `quatre-vingt-${UNITS[n - 80]}`;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return belowHundred(rest);
  const hundred = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 ? 's' : ''}`;
  return rest === 0 ? hundred : `${hundred} ${belowHundred(rest)}`;
}

export function integerToFrench(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'zéro';
  const parts: string[] = [];
  const scales: [number, string, string][] = [[1e9, 'milliard', 'milliards'], [1e6, 'million', 'millions']];
  for (const [size, one, many] of scales) {
    const count = Math.floor(n / size);
    if (count) {
      parts.push(`${belowThousand(count)} ${count > 1 ? many : one}`);
      n %= size;
    }
  }
  const thousands = Math.floor(n / 1000);
  if (thousands) {
    // "mille" is invariable, and "cents" / "vingts" lose their plural s before it.
    parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands).replace(/(cent|vingt)s$/, '$1')} mille`);
    n %= 1000;
  }
  if (n) parts.push(belowThousand(n));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const millimes = Math.round(amount * 1000);
  const dinars = Math.floor(millimes / 1000);
  const rest = millimes % 1000;
  const d = `${integerToFrench(dinars)} dinar${dinars > 1 ? 's' : ''}`;
  const text = rest ? `${d} et ${rest} millime${rest > 1 ? 's' : ''}` : d;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
