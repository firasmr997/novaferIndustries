package tn.novafer.erp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.novafer.erp.domain.Invoice;
import tn.novafer.erp.domain.InvoiceStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @EntityGraph(attributePaths = "client")
    @Query("""
            select i from Invoice i
            where (lower(coalesce(i.number, '')) like lower(concat('%', :q, '%'))
                   or lower(i.client.companyName) like lower(concat('%', :q, '%'))
                   or lower(coalesce(i.subject, '')) like lower(concat('%', :q, '%')))
              and (:status is null or i.status = :status)
              and (:clientId is null or i.client.id = :clientId)
              and (:overdueOnly = false
                   or (i.status in (tn.novafer.erp.domain.InvoiceStatus.EMISE, tn.novafer.erp.domain.InvoiceStatus.PARTIELLEMENT_PAYEE)
                       and i.dueDate < :today))
            """)
    Page<Invoice> search(@Param("q") String q, @Param("status") InvoiceStatus status,
                         @Param("clientId") Long clientId, @Param("overdueOnly") boolean overdueOnly,
                         @Param("today") LocalDate today, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "lines", "lines.product"})
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findDetailed(@Param("id") Long id);

    @EntityGraph(attributePaths = "client")
    @Query("""
            select i from Invoice i
            where i.status in (tn.novafer.erp.domain.InvoiceStatus.EMISE, tn.novafer.erp.domain.InvoiceStatus.PARTIELLEMENT_PAYEE)
            order by i.dueDate asc
            """)
    List<Invoice> findOpenOrderByDueDate(Pageable pageable);

    @EntityGraph(attributePaths = "client")
    List<Invoice> findByClientIdAndStatusNotOrderByIssueDateDesc(Long clientId, InvoiceStatus status);
}
