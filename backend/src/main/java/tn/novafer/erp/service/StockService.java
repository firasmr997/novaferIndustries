package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.Product;
import tn.novafer.erp.domain.StockMovement;
import tn.novafer.erp.domain.StockMovementType;
import tn.novafer.erp.repository.ProductRepository;
import tn.novafer.erp.repository.StockMovementRepository;
import tn.novafer.erp.security.CurrentUser;
import tn.novafer.erp.web.dto.CatalogueDtos.StockMovementDto;
import tn.novafer.erp.web.dto.CatalogueDtos.StockMovementRequest;

import java.math.BigDecimal;

/** Every stock change goes through here so the product quantity and its ledger never disagree. */
@Service
@RequiredArgsConstructor
public class StockService {

    private final StockMovementRepository movementRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public PageResponse<StockMovementDto> movements(Long productId, StockMovementType type, Pageable pageable) {
        return PageResponse.from(movementRepository.search(productId, type, pageable), StockMovementDto::of);
    }

    @Transactional
    public StockMovementDto record(StockMovementRequest r) {
        Product product = productRepository.findById(r.productId())
                .orElseThrow(() -> ApiException.notFound("Produit"));
        BigDecimal quantity = Money.round(r.quantity());
        String reason = r.reason();
        if (r.type() == StockMovementType.AJUSTEMENT) {
            // The request carries the counted stock; the ledger records the difference.
            quantity = quantity.subtract(product.getStockQuantity());
            if (reason == null || reason.isBlank()) {
                reason = "Inventaire";
            }
        } else if (quantity.signum() == 0) {
            throw ApiException.badRequest("La quantité doit être positive");
        } else if (r.type() == StockMovementType.SORTIE) {
            quantity = quantity.negate();
        }
        return StockMovementDto.of(move(product, r.type(), quantity, reason, r.documentRef()));
    }

    /** Applies a signed quantity. A delivery may take stock below zero: it is flagged, not blocked. */
    @Transactional
    public StockMovement move(Product product, StockMovementType type, BigDecimal signedQuantity, String reason,
                              String documentRef) {
        BigDecimal after = Money.round(product.getStockQuantity().add(signedQuantity));
        product.setStockQuantity(after);
        StockMovement m = new StockMovement();
        m.setProduct(product);
        m.setType(type);
        m.setQuantity(Money.round(signedQuantity));
        m.setStockAfter(after);
        m.setReason(reason);
        m.setDocumentRef(documentRef);
        m.setCreatedBy(CurrentUser.name());
        return movementRepository.save(m);
    }
}
