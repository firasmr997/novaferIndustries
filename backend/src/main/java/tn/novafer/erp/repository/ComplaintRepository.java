package tn.novafer.erp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.novafer.erp.domain.Complaint;
import tn.novafer.erp.domain.ComplaintPriority;
import tn.novafer.erp.domain.ComplaintStatus;
import tn.novafer.erp.domain.ComplaintType;

import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    @EntityGraph(attributePaths = {"client", "assignee", "product", "invoice"})
    @Query("""
            select c from Complaint c
            where (lower(c.number) like lower(concat('%', :q, '%'))
                   or lower(c.subject) like lower(concat('%', :q, '%'))
                   or lower(c.client.companyName) like lower(concat('%', :q, '%')))
              and (:status is null or c.status = :status)
              and (:activeOnly = false or c.status in (tn.novafer.erp.domain.ComplaintStatus.OUVERTE, tn.novafer.erp.domain.ComplaintStatus.EN_COURS))
              and (:priority is null or c.priority = :priority)
              and (:type is null or c.type = :type)
              and (:clientId is null or c.client.id = :clientId)
            """)
    Page<Complaint> search(@Param("q") String q, @Param("status") ComplaintStatus status,
                           @Param("activeOnly") boolean activeOnly, @Param("priority") ComplaintPriority priority,
                           @Param("type") ComplaintType type, @Param("clientId") Long clientId, Pageable pageable);

    @EntityGraph(attributePaths = {"client", "assignee", "product", "invoice", "events"})
    @Query("select c from Complaint c where c.id = :id")
    Optional<Complaint> findDetailed(@Param("id") Long id);

    @EntityGraph(attributePaths = {"client", "assignee"})
    @Query("""
            select c from Complaint c
            where c.status in (tn.novafer.erp.domain.ComplaintStatus.OUVERTE, tn.novafer.erp.domain.ComplaintStatus.EN_COURS)
            order by case c.priority when tn.novafer.erp.domain.ComplaintPriority.CRITIQUE then 0
                                     when tn.novafer.erp.domain.ComplaintPriority.HAUTE then 1
                                     when tn.novafer.erp.domain.ComplaintPriority.MOYENNE then 2 else 3 end,
                     c.openedAt asc
            """)
    List<Complaint> findActiveByUrgency(Pageable pageable);
}
