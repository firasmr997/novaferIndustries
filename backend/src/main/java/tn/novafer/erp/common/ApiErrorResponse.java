package tn.novafer.erp.common;

import java.util.List;

/** Error body: {@code {"message": "...", "errors": [{"field": "...", "message": "..."}]}}. */
public record ApiErrorResponse(String message, List<FieldError> errors) {

    public record FieldError(String field, String message) {
    }

    public static ApiErrorResponse of(String message) {
        return new ApiErrorResponse(message, List.of());
    }

    public static ApiErrorResponse of(String message, List<FieldError> errors) {
        return new ApiErrorResponse(message, errors);
    }
}
