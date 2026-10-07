package tn.novafer.erp.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** 401 for protected endpoints reached without a valid token. */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final JsonErrorWriter errorWriter;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        boolean rejected = Boolean.TRUE.equals(request.getAttribute(JwtAuthenticationFilter.TOKEN_REJECTED_ATTRIBUTE));
        errorWriter.write(response, HttpStatus.UNAUTHORIZED, rejected
                ? "Votre session a expiré. Veuillez vous reconnecter."
                : "Authentification requise.");
    }
}
