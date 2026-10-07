package tn.novafer.erp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Authenticates {@code Authorization: Bearer <jwt>} requests. An invalid token leaves the request
 * anonymous; protected endpoints then answer 401 through {@link RestAuthenticationEntryPoint}.
 */
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    static final String TOKEN_REJECTED_ATTRIBUTE = "novafer.jwt.rejected";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            String token = header.substring(BEARER_PREFIX.length()).trim();
            jwtService.verify(token).ifPresentOrElse(claims -> {
                try {
                    // Reload the account so deactivated users and role changes apply immediately.
                    AppUserDetails user = userDetailsService.loadUserByUsername(claims.getSubject());
                    if (user.isEnabled()) {
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
                    } else {
                        request.setAttribute(TOKEN_REJECTED_ATTRIBUTE, Boolean.TRUE);
                    }
                } catch (UsernameNotFoundException e) {
                    request.setAttribute(TOKEN_REJECTED_ATTRIBUTE, Boolean.TRUE);
                }
            }, () -> request.setAttribute(TOKEN_REJECTED_ATTRIBUTE, Boolean.TRUE));
        }
        chain.doFilter(request, response);
    }
}
