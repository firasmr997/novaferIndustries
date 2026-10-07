package tn.novafer.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.novafer.erp.domain.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
}
