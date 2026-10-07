package tn.novafer.erp.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI novaferOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Novafer ERP API")
                        .version("1.0.0")
                        .description("""
                                Catalogue, clients, stock, devis, factures, paiements, réclamations and analytics \
                                for Novafer Industries.

                                Call `POST /api/auth/login`, then press **Authorize** with the returned token.
                                Amounts are in TND with three decimals.
                                """))
                .components(new Components().addSecuritySchemes("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
