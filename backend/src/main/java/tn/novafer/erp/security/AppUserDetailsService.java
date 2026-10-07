package tn.novafer.erp.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AppUserDetails loadUserByUsername(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(AppUserDetails::from)
                .orElseThrow(() -> new UsernameNotFoundException("Unknown user"));
    }
}
