package tn.novafer.erp.service;

import org.springframework.stereotype.Component;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.domain.CommercialDocument;
import tn.novafer.erp.domain.DocumentLine;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Tunisian document arithmetic.
 * <pre>
 *   line HT      = qty × unit price × (1 − discount%)
 *   FODEC        = Σ HT × FODEC%                     (1% on manufactured goods, when enabled)
 *   TVA per rate = (HT of the rate + its FODEC) × rate
 *   TTC          = HT + FODEC + TVA (+ timbre fiscal on factures)
 * </pre>
 * Every stored amount is rounded half-up to the millime.
 */
@Component
public class DocumentCalculator {

    public record VatLine(BigDecimal rate, BigDecimal base, BigDecimal amount) {
    }

    public static BigDecimal lineTotal(BigDecimal quantity, BigDecimal unitPrice, BigDecimal discountPct) {
        BigDecimal gross = quantity.multiply(unitPrice);
        BigDecimal net = gross.subtract(Money.percent(gross, Money.nz(discountPct)));
        return Money.round(net);
    }

    /** Recomputes line totals and document totals in place. Returns the TTC before any fiscal stamp. */
    public BigDecimal apply(CommercialDocument document, BigDecimal fodecRate) {
        BigDecimal ht = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;
        for (DocumentLine line : document.getLines()) {
            BigDecimal lineHt = lineTotal(line.getQuantity(), line.getUnitPrice(), line.getDiscountPct());
            line.setTotalHt(lineHt);
            ht = ht.add(lineHt);
            discount = discount.add(Money.round(line.getQuantity().multiply(line.getUnitPrice())).subtract(lineHt));
        }
        BigDecimal rate = Money.nz(fodecRate);
        BigDecimal fodec = Money.round(Money.percent(ht, rate));
        BigDecimal vat = vatBreakdown(document.getLines(), rate).stream()
                .map(VatLine::amount).reduce(BigDecimal.ZERO, BigDecimal::add);

        document.setTotalHt(Money.round(ht));
        document.setTotalDiscount(Money.round(discount.max(BigDecimal.ZERO)));
        document.setFodecRate(rate);
        document.setTotalFodec(fodec);
        document.setTotalVat(Money.round(vat));
        BigDecimal ttc = Money.round(ht.add(fodec).add(vat));
        document.setTotalTtc(ttc);
        return ttc;
    }

    /** One row per VAT rate, as printed in the tax summary of a document. */
    public List<VatLine> vatBreakdown(List<? extends DocumentLine> lines, BigDecimal fodecRate) {
        Map<BigDecimal, BigDecimal> baseByRate = new TreeMap<>();
        for (DocumentLine line : lines) {
            BigDecimal lineHt = line.getTotalHt() != null ? line.getTotalHt()
                    : lineTotal(line.getQuantity(), line.getUnitPrice(), line.getDiscountPct());
            baseByRate.merge(line.getVatRate().stripTrailingZeros(), lineHt, BigDecimal::add);
        }
        List<VatLine> result = new ArrayList<>();
        baseByRate.forEach((rate, ht) -> {
            BigDecimal base = Money.round(ht.add(Money.percent(ht, Money.nz(fodecRate))));
            result.add(new VatLine(rate.setScale(2), base, Money.round(Money.percent(base, rate))));
        });
        return result;
    }
}
