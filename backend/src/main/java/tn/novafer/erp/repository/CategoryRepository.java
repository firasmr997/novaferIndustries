package tn.novafer.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.novafer.erp.domain.Category;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderByNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}
