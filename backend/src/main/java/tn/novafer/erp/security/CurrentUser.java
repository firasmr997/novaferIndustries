package tn.novafer.erp.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/** Static access to the signed-in user, for auditing and document authorship. */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static Optional<AppUserDetails> get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AppUserDetails user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public static String name() {
        return get().map(AppUserDetails::fullName).orElse("Système");
    }
}
