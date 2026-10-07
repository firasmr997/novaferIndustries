package tn.novafer.erp.web;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.novafer.erp.service.UserService;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.UserDtos.AuthResponse;
import tn.novafer.erp.web.dto.UserDtos.ChangePasswordRequest;
import tn.novafer.erp.web.dto.UserDtos.LoginRequest;
import tn.novafer.erp.web.dto.UserDtos.UserDto;

import java.util.List;

@Tag(name = "Authentification")
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/api/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return userService.login(request);
    }

    @GetMapping("/api/auth/me")
    public UserDto me() {
        return userService.me();
    }

    @PostMapping("/api/auth/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
    }

    /** Active staff for assignment pickers; readable by every signed-in user. */
    @GetMapping("/api/team")
    public List<Ref> team() {
        return userService.team();
    }
}
