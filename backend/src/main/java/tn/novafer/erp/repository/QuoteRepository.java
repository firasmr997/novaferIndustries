package tn.novafer.erp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.novafer.erp.domain.Quote;
import tn.novafer.erp.domain.QuoteStatus;

import java.time.LocalDate;
import java.util.Optional;

public interface QuoteRepository extends JpaRepository<Quote, Long> {

    @EntityGraph(attributePaths = "client")
    @Query("""
            select q from Quote q
            where (lower(q.number) like lower(concat('%', :q, '%'))
                   or lower(q.client.companyName) like lower(concat('%', :q, '%'))
                   or lower(coalesce(q.subject, '')) like lower(concat('%', :q, '%')))
              and (:status is null or q.status = :status)
              and (:clientId is null or q.client.id = :clientId)
            """)
    Page<Quote> search(@Param("q") String q, @Param("status") QuoteStatus status,
                       @Param("clientId") Long clientId, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "lines", "lines.product"})
    @Query("select q from Quote q where q.id = :id")
    Optional<Quote> findDetailed(@Param("id") Long id);

    /** Sent devis past their validity date become EXPIRE. */
    @Modifying
    @Query("update Quote q set q.status = tn.novafer.erp.domain.QuoteStatus.EXPIRE where q.status = tn.novafer.erp.domain.QuoteStatus.ENVOYE and q.validUntil < :today")
    int expireOutdated(@Param("today") LocalDate today);
}
