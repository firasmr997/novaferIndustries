package tn.novafer.erp.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tn.novafer.erp.common.ApiErrorResponse;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Writes the standard error body from filters, where @RestControllerAdvice does not apply. */
@Component
@RequiredArgsConstructor
public class JsonErrorWriter {

    private final JsonMapper jsonMapper;

    public void write(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        jsonMapper.writeValue(response.getOutputStream(), ApiErrorResponse.of(message));
    }
}
