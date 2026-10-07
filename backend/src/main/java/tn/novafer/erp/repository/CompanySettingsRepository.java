package tn.novafer.erp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.novafer.erp.domain.CompanySettings;

public interface CompanySettingsRepository extends JpaRepository<CompanySettings, Long> {
}
