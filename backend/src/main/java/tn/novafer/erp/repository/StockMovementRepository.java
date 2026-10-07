package tn.novafer.erp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.novafer.erp.domain.StockMovement;
import tn.novafer.erp.domain.StockMovementType;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    @EntityGraph(attributePaths = "product")
    @Query("""
            select m from StockMovement m
            where (:productId is null or m.product.id = :productId)
              and (:type is null or m.type = :type)
            """)
    Page<StockMovement> search(@Param("productId") Long productId, @Param("type") StockMovementType type,
                               Pageable pageable);
}
