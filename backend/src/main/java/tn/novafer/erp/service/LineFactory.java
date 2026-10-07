package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.DocumentLine;
import tn.novafer.erp.domain.Product;
import tn.novafer.erp.repository.ProductRepository;
import tn.novafer.erp.web.dto.CommonDtos.LineRequest;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

/** Turns line requests into document lines, filling blanks from the catalogue. */
@Component
@RequiredArgsConstructor
public class LineFactory {

    private final ProductRepository productRepository;

    public <L extends DocumentLine> List<L> build(List<LineRequest> requests, Client client, Supplier<L> newLine) {
        List<L> lines = new ArrayList<>();
        int position = 1;
        for (LineRequest r : requests) {
            L line = newLine.get();
            Product product = r.productId() == null ? null : productRepository.findById(r.productId())
                    .orElseThrow(() -> ApiException.notFound("Produit"));
            line.setPosition(position++);
            line.setProduct(product);
            line.setReference(blank(r.reference()) && product != null ? product.getReference() : r.reference());
            line.setDescription(r.description().trim());
            line.setUnit(blank(r.unit()) ? (product != null ? product.getUnit() : "pièce") : r.unit().trim());
            line.setQuantity(Money.round(r.quantity()));
            line.setUnitPrice(Money.round(r.unitPrice()));
            line.setDiscountPct(r.discountPct() == null ? BigDecimal.ZERO.setScale(2) : r.discountPct().setScale(2));
            BigDecimal vat = r.vatRate() != null ? r.vatRate()
                    : product != null ? product.getVatRate() : new BigDecimal("19");
            // A client in VAT suspension (e.g. totally exporting) is invoiced at 0%.
            line.setVatRate(client.isVatExempt() ? BigDecimal.ZERO.setScale(2) : SettingsService.requireVatRate(vat));
            lines.add(line);
        }
        return lines;
    }

    /** Copies lines between documents (devis → facture, duplication). */
    public static <L extends DocumentLine> L copy(DocumentLine source, Supplier<L> newLine) {
        L line = newLine.get();
        line.setPosition(source.getPosition());
        line.setProduct(source.getProduct());
        line.setReference(source.getReference());
        line.setDescription(source.getDescription());
        line.setUnit(source.getUnit());
        line.setQuantity(source.getQuantity());
        line.setUnitPrice(source.getUnitPrice());
        line.setDiscountPct(source.getDiscountPct());
        line.setVatRate(source.getVatRate());
        line.setTotalHt(source.getTotalHt());
        return line;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
