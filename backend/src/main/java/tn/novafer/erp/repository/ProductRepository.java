package tn.novafer.erp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.novafer.erp.domain.Product;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    /** {@code q} is never null (empty string matches everything). */
    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p
            where (lower(p.name) like lower(concat('%', :q, '%')) or lower(p.reference) like lower(concat('%', :q, '%')))
              and (:categoryId is null or p.category.id = :categoryId)
              and (:lowStockOnly = false or p.stockQuantity <= p.minStock)
              and (:includeInactive = true or p.active = true)
            """)
    Page<Product> search(@Param("q") String q, @Param("categoryId") Long categoryId,
                         @Param("lowStockOnly") boolean lowStockOnly,
                         @Param("includeInactive") boolean includeInactive, Pageable pageable);

    boolean existsByReferenceIgnoreCase(String reference);

    boolean existsByReferenceIgnoreCaseAndIdNot(String reference, Long id);

    long countByCategoryId(Long categoryId);

    @Query("select count(p) from Product p where p.active = true and p.stockQuantity <= p.minStock")
    long countLowStock();

    @EntityGraph(attributePaths = "category")
    @Query("select p from Product p where p.active = true and p.stockQuantity <= p.minStock order by (p.stockQuantity - p.minStock) asc")
    List<Product> findLowStock(Pageable pageable);
}
