package tn.novafer.erp.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import tn.novafer.erp.security.AppUserDetailsService;
import tn.novafer.erp.security.JwtAuthenticationFilter;
import tn.novafer.erp.security.JwtService;
import tn.novafer.erp.security.RestAccessDeniedHandler;
import tn.novafer.erp.security.RestAuthenticationEntryPoint;

import java.time.Duration;
import java.util.List;

/**
 * Role matrix. Reading is open to every signed-in user; writing is limited per module:
 * <ul>
 *   <li>Utilisateurs, Paramètres: ADMIN</li>
 *   <li>Produits, Catégories, Stock: ADMIN, MANAGER, WAREHOUSE</li>
 *   <li>Clients: ADMIN, MANAGER, SALES, ACCOUNTANT</li>
 *   <li>Devis: ADMIN, MANAGER, SALES</li>
 *   <li>Factures and paiements: ADMIN, MANAGER, ACCOUNTANT</li>
 *   <li>Réclamations: everyone (anyone may log a client complaint)</li>
 * </ul>
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String[] CATALOGUE_WRITERS = {"ADMIN", "MANAGER", "WAREHOUSE"};
    private static final String[] CLIENT_WRITERS = {"ADMIN", "MANAGER", "SALES", "ACCOUNTANT"};
    private static final String[] QUOTE_WRITERS = {"ADMIN", "MANAGER", "SALES"};
    private static final String[] INVOICE_WRITERS = {"ADMIN", "MANAGER", "ACCOUNTANT"};

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;
    private final AppProperties properties;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Stateless JWT in the Authorization header: no cookies, so CSRF protection does not apply.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/health", "/error").permitAll()

                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/settings").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/**").authenticated()
                        .requestMatchers("/api/auth/**").authenticated()

                        .requestMatchers("/api/products/**", "/api/categories/**", "/api/stock/**")
                        .hasAnyRole(CATALOGUE_WRITERS)
                        .requestMatchers("/api/clients/**").hasAnyRole(CLIENT_WRITERS)
                        .requestMatchers("/api/quotes/**").hasAnyRole(QUOTE_WRITERS)
                        .requestMatchers("/api/invoices/**").hasAnyRole(INVOICE_WRITERS)
                        .requestMatchers("/api/complaints/**").authenticated()
                        .anyRequest().denyAll())
                .addFilterBefore(new JwtAuthenticationFilter(jwtService, userDetailsService),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(properties.cors().allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
