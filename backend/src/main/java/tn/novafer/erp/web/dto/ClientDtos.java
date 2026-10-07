package tn.novafer.erp.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.Client;

import java.math.BigDecimal;

public final class ClientDtos {

    private ClientDtos() {
    }

    public record ClientDto(Long id, String code, String companyName, String contactName, String email, String phone,
                            String address, String city, String matriculeFiscal, String sector,
                            int paymentTermsDays, boolean vatExempt, String notes, boolean active) {
        public static ClientDto of(Client c) {
            return new ClientDto(c.getId(), c.getCode(), c.getCompanyName(), c.getContactName(), c.getEmail(),
                    c.getPhone(), c.getAddress(), c.getCity(), c.getMatriculeFiscal(), c.getSector(),
                    c.getPaymentTermsDays(), c.isVatExempt(), c.getNotes(), c.isActive());
        }
    }

    /** Commercial standing of one client, shown on its page. */
    public record ClientStats(BigDecimal revenueYtd, BigDecimal revenueTotal, BigDecimal openBalance,
                              BigDecimal overdueBalance, long invoiceCount, long quoteCount,
                              long openComplaintCount, Integer averagePaymentDays) {
    }

    public record ClientDetail(ClientDto client, ClientStats stats) {
    }

    public record ClientRequest(
            @Size(max = 20) String code,
            @NotBlank(message = "La raison sociale est obligatoire") @Size(max = 160) String companyName,
            @Size(max = 120) String contactName,
            @Email(message = "E-mail invalide") @Size(max = 160) String email,
            @Size(max = 40) String phone,
            @Size(max = 255) String address,
            @Size(max = 80) String city,
            @Size(max = 40) String matriculeFiscal,
            @Size(max = 80) String sector,
            @Min(0) @Max(365) Integer paymentTermsDays,
            boolean vatExempt,
            @Size(max = 1000) String notes,
            Boolean active) {
    }
}
