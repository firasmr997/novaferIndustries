package tn.novafer.erp.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.novafer.erp.domain.Client;

public interface ClientRepository extends JpaRepository<Client, Long> {

    /** {@code q} is never null (empty string matches everything). */
    @Query("""
            select c from Client c
            where (lower(c.companyName) like lower(concat('%', :q, '%'))
                   or lower(c.code) like lower(concat('%', :q, '%'))
                   or lower(coalesce(c.city, '')) like lower(concat('%', :q, '%')))
              and (:includeInactive = true or c.active = true)
            """)
    Page<Client> search(@Param("q") String q, @Param("includeInactive") boolean includeInactive, Pageable pageable);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("select coalesce(max(c.id), 0) from Client c")
    long maxId();
}
