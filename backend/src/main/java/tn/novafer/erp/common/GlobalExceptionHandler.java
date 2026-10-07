package tn.novafer.erp.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tn.novafer.erp.common.ApiErrorResponse.FieldError;

import java.util.List;

/** Translates exceptions into the error body. Internal details are logged, never returned. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String VALIDATION_FAILED = "Certains champs sont à corriger";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApi(ApiException ex) {
        return error(ex.getStatus(), ex.getMessage());
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiErrorResponse> handleBind(BindException ex) {
        List<FieldError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest().body(ApiErrorResponse.of(VALIDATION_FAILED, errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
        log.debug("Unreadable request body: {}", ex.getMessage());
        return error(HttpStatus.BAD_REQUEST, "Requête invalide ou incomplète");
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiErrorResponse> handleParameter(Exception ex) {
        return error(HttpStatus.BAD_REQUEST, "Paramètre invalide");
    }

    @ExceptionHandler({BadCredentialsException.class, DisabledException.class})
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(AuthenticationException ex) {
        return error(HttpStatus.UNAUTHORIZED, "E-mail ou mot de passe incorrect");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthentication(AuthenticationException ex) {
        return error(HttpStatus.UNAUTHORIZED, "Authentification requise.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "Votre rôle ne permet pas cette action.");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(OptimisticLockingFailureException ex) {
        return error(HttpStatus.CONFLICT, "Ce document a été modifié entre-temps. Rechargez la page.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        return error(HttpStatus.CONFLICT, "Cette opération entre en conflit avec des données existantes");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "Ressource introuvable");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethod(HttpRequestMethodNotSupportedException ex) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "Méthode non autorisée");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur inattendue est survenue");
    }

    private static ResponseEntity<ApiErrorResponse> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ApiErrorResponse.of(message));
    }
}
