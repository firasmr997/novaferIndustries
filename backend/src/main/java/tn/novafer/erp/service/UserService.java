package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.domain.Role;
import tn.novafer.erp.domain.User;
import tn.novafer.erp.repository.UserRepository;
import tn.novafer.erp.security.AppUserDetails;
import tn.novafer.erp.security.CurrentUser;
import tn.novafer.erp.security.JwtService;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.UserDtos.AuthResponse;
import tn.novafer.erp.web.dto.UserDtos.ChangePasswordRequest;
import tn.novafer.erp.web.dto.UserDtos.LoginRequest;
import tn.novafer.erp.web.dto.UserDtos.UserDto;
import tn.novafer.erp.web.dto.UserDtos.UserRequest;

import java.time.Instant;
import java.util.List;

/** Sign-in, the signed-in account, and user administration. */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse login(LoginRequest r) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(r.email().trim(), r.password()));
        AppUserDetails principal = (AppUserDetails) authentication.getPrincipal();
        User user = userRepository.findById(principal.id()).orElseThrow();
        user.setLastLoginAt(Instant.now());
        JwtService.IssuedToken token = jwtService.issue(principal);
        return new AuthResponse(token.token(), token.expiresAt(), UserDto.of(user));
    }

    @Transactional(readOnly = true)
    public UserDto me() {
        return UserDto.of(currentUser());
    }

    @Transactional
    public void changePassword(ChangePasswordRequest r) {
        User user = currentUser();
        if (!passwordEncoder.matches(r.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Le mot de passe actuel est incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(r.newPassword()));
    }

    private User currentUser() {
        Long id = CurrentUser.get().map(AppUserDetails::id)
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                        "Authentification requise."));
        return userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur"));
    }

    /** Active staff, for assignment pickers. */
    @Transactional(readOnly = true)
    public List<Ref> team() {
        return userRepository.findByActiveTrueOrderByFullNameAsc().stream().map(Ref::of).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> list() {
        return userRepository.findAllByOrderByFullNameAsc().stream().map(UserDto::of).toList();
    }

    @Transactional
    public UserDto create(UserRequest r) {
        if (r.password() == null || r.password().isBlank()) {
            throw ApiException.badRequest("Le mot de passe est obligatoire");
        }
        if (userRepository.existsByEmailIgnoreCase(r.email().trim())) {
            throw ApiException.conflict("Un compte existe déjà avec cet e-mail");
        }
        User user = new User();
        user.setEmail(r.email().trim().toLowerCase());
        user.setFullName(r.fullName().trim());
        user.setRole(r.role());
        user.setActive(r.active() == null || r.active());
        user.setPasswordHash(passwordEncoder.encode(r.password()));
        return UserDto.of(userRepository.save(user));
    }

    @Transactional
    public UserDto update(Long id, UserRequest r) {
        User user = userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Utilisateur"));
        boolean self = CurrentUser.get().map(u -> u.id().equals(id)).orElse(false);
        boolean deactivating = r.active() != null && !r.active();
        if (self && (deactivating || r.role() != Role.ADMIN)) {
            throw ApiException.conflict("Vous ne pouvez ni désactiver votre compte ni retirer votre rôle administrateur");
        }
        userRepository.findByEmailIgnoreCase(r.email().trim())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw ApiException.conflict("Un compte existe déjà avec cet e-mail");
                });
        user.setEmail(r.email().trim().toLowerCase());
        user.setFullName(r.fullName().trim());
        user.setRole(r.role());
        if (r.active() != null) {
            user.setActive(r.active());
        }
        if (r.password() != null && !r.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(r.password()));
        }
        return UserDto.of(user);
    }
}
