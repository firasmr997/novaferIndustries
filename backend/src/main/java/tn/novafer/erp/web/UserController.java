package tn.novafer.erp.web;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.novafer.erp.service.UserService;
import tn.novafer.erp.web.dto.UserDtos.UserDto;
import tn.novafer.erp.web.dto.UserDtos.UserRequest;

import java.util.List;

@Tag(name = "Utilisateurs")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserDto> list() {
        return userService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody UserRequest request) {
        return userService.create(request);
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        return userService.update(id, request);
    }
}
