package tn.novafer.erp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.novafer.erp.config.AppProperties;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/** Issues and verifies HMAC-SHA256 signed access tokens. */
@Slf4j
@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final AppProperties.Jwt properties;

    public JwtService(AppProperties appProperties) {
        this.properties = appProperties.jwt();
        String secret = properties.secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be set to at least " + MIN_SECRET_BYTES + " bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public IssuedToken issue(AppUserDetails user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.expiration());
        String token = Jwts.builder()
                .issuer(properties.issuer())
                .subject(user.email())
                .claim("uid", user.id())
                .claim("role", user.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    /** Verified claims, or empty when the token is malformed, tampered with or expired. */
    public Optional<Claims> verify(String token) {
        try {
            return Optional.of(Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(properties.issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Rejected JWT: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }
}
