package tn.novafer.erp.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import tn.novafer.erp.domain.Role;
import tn.novafer.erp.domain.User;

import java.util.Collection;
import java.util.List;

/** Security principal backed by a {@link User} row. */
public record AppUserDetails(Long id, String fullName, String email, String passwordHash, Role role, boolean active)
        implements UserDetails {

    public static AppUserDetails from(User user) {
        return new AppUserDetails(user.getId(), user.getFullName(), user.getEmail(), user.getPasswordHash(),
                user.getRole(), user.isActive());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
