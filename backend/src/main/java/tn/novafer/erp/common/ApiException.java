package tn.novafer.erp.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** A failure whose message is safe to show to the user (French, like the interface). */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, what + " introuvable");
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }
}
