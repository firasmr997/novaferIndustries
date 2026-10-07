package tn.novafer.erp.web.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.CompanySettings;

import java.math.BigDecimal;

public final class SettingsDtos {

    private SettingsDtos() {
    }

    public record SettingsDto(String companyName, String legalForm, String matriculeFiscal, String registreCommerce,
                              String address, String city, String postalCode, String country, String phone,
                              String email, String website, String bankName, String rib, String currency,
                              BigDecimal defaultVatRate, BigDecimal fiscalStamp, boolean fodecEnabled,
                              BigDecimal fodecRate, int paymentTermsDays, int quoteValidityDays,
                              String invoiceFooter, String quoteFooter,
                              /** True while the database holds the fictional demo dataset: screens and prints say so. */
                              boolean demo) {
        public static SettingsDto of(CompanySettings s, boolean demo) {
            return new SettingsDto(s.getCompanyName(), s.getLegalForm(), s.getMatriculeFiscal(),
                    s.getRegistreCommerce(), s.getAddress(), s.getCity(), s.getPostalCode(), s.getCountry(),
                    s.getPhone(), s.getEmail(), s.getWebsite(), s.getBankName(), s.getRib(), s.getCurrency(),
                    s.getDefaultVatRate(), s.getFiscalStamp(), s.isFodecEnabled(), s.getFodecRate(),
                    s.getPaymentTermsDays(), s.getQuoteValidityDays(), s.getInvoiceFooter(), s.getQuoteFooter(), demo);
        }
    }

    public record SettingsRequest(
            @NotBlank(message = "La raison sociale est obligatoire") @Size(max = 160) String companyName,
            @Size(max = 60) String legalForm,
            @Size(max = 40) String matriculeFiscal,
            @Size(max = 40) String registreCommerce,
            @Size(max = 255) String address,
            @Size(max = 80) String city,
            @Size(max = 12) String postalCode,
            @Size(max = 60) String country,
            @Size(max = 40) String phone,
            @Email @Size(max = 160) String email,
            @Size(max = 160) String website,
            @Size(max = 120) String bankName,
            @Size(max = 40) String rib,
            @NotNull BigDecimal defaultVatRate,
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal fiscalStamp,
            boolean fodecEnabled,
            @NotNull @DecimalMin("0") @DecimalMax("10") BigDecimal fodecRate,
            @Min(0) @Max(365) int paymentTermsDays,
            @Min(1) @Max(365) int quoteValidityDays,
            @Size(max = 500) String invoiceFooter,
            @Size(max = 500) String quoteFooter) {
    }
}
