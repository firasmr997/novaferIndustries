package tn.novafer.erp.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.domain.Role;
import tn.novafer.erp.domain.User;
import tn.novafer.erp.repository.UserRepository;

/** Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD when that account does not exist yet. */
@Slf4j
@Order(1)
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements ApplicationRunner {

    private final AppProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Admin admin = properties.admin();
        if (admin.email() == null || admin.email().isBlank() || admin.password() == null || admin.password().isBlank()) {
            return;
        }
        if (userRepository.existsByEmailIgnoreCase(admin.email())) {
            return;
        }
        User user = new User();
        user.setEmail(admin.email().trim().toLowerCase());
        user.setFullName(admin.name() == null || admin.name().isBlank() ? "Administrateur" : admin.name());
        user.setRole(Role.ADMIN);
        user.setPasswordHash(passwordEncoder.encode(admin.password()));
        userRepository.save(user);
        log.info("Bootstrap administrator {} created", user.getEmail());
    }
}
