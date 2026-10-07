package tn.novafer.erp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** Fills createdAt / updatedAt automatically. */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
