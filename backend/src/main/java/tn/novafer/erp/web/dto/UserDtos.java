package tn.novafer.erp.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.Role;
import tn.novafer.erp.domain.User;

import java.time.Instant;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserDto(Long id, String email, String fullName, Role role, boolean active, Instant lastLoginAt) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isActive(), u.getLastLoginAt());
        }
    }

    public record LoginRequest(
            @NotBlank(message = "L'e-mail est obligatoire") @Email String email,
            @NotBlank(message = "Le mot de passe est obligatoire") String password) {
    }

    public record AuthResponse(String token, Instant expiresAt, UserDto user) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 72, message = "8 caractères minimum") String newPassword) {
    }

    public record UserRequest(
            @NotBlank(message = "L'e-mail est obligatoire") @Email @Size(max = 160) String email,
            @NotBlank(message = "Le nom est obligatoire") @Size(max = 120) String fullName,
            @NotNull(message = "Le rôle est obligatoire") Role role,
            Boolean active,
            /** Required at creation; when present on update it resets the password. */
            @Size(min = 8, max = 72, message = "8 caractères minimum") String password) {
    }
}
