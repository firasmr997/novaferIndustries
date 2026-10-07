package tn.novafer.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.novafer.erp.domain.User;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findAllByOrderByFullNameAsc();

    List<User> findByActiveTrueOrderByFullNameAsc();
}
