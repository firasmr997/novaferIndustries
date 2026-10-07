package tn.novafer.erp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "novafer")
public record AppProperties(Jwt jwt, Cors cors, Admin admin, Demo demo) {

    public AppProperties {
        if (jwt == null) jwt = new Jwt(null, null, null);
        if (cors == null) cors = new Cors(List.of("http://localhost:4200"));
        if (admin == null) admin = new Admin(null, null, null);
        if (demo == null) demo = new Demo(false, null);
    }

    public record Jwt(String secret, Duration expiration, String issuer) {
        public Jwt {
            if (expiration == null) expiration = Duration.ofHours(12);
            if (issuer == null || issuer.isBlank()) issuer = "novafer-erp";
        }
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Admin(String email, String password, String name) {
    }

    /** Demo dataset for development: a fictional company history, never real records. */
    public record Demo(boolean enabled, String password) {
    }
}
