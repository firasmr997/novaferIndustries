package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.config.AppProperties;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.CompanySettings;
import tn.novafer.erp.repository.CompanySettingsRepository;
import tn.novafer.erp.web.dto.SettingsDtos.SettingsDto;
import tn.novafer.erp.web.dto.SettingsDtos.SettingsRequest;

import java.math.BigDecimal;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SettingsService {

    /** Tunisian TVA rates in force: standard 19%, reduced 13% and 7%, and 0% (exonéré / suspension). */
    public static final Set<BigDecimal> VAT_RATES = Set.of(
            new BigDecimal("0"), new BigDecimal("7"), new BigDecimal("13"), new BigDecimal("19"));

    private final CompanySettingsRepository repository;
    private final AppProperties properties;

    @Transactional(readOnly = true)
    public CompanySettings current() {
        return repository.findById(CompanySettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("company_settings row is missing"));
    }

    @Transactional(readOnly = true)
    public SettingsDto get() {
        return SettingsDto.of(current(), properties.demo().enabled());
    }

    @Transactional
    public SettingsDto update(SettingsRequest r) {
        requireVatRate(r.defaultVatRate());
        CompanySettings s = current();
        s.setCompanyName(r.companyName().trim());
        s.setLegalForm(r.legalForm());
        s.setMatriculeFiscal(r.matriculeFiscal());
        s.setRegistreCommerce(r.registreCommerce());
        s.setAddress(r.address());
        s.setCity(r.city());
        s.setPostalCode(r.postalCode());
        s.setCountry(r.country() == null || r.country().isBlank() ? "Tunisie" : r.country());
        s.setPhone(r.phone());
        s.setEmail(r.email());
        s.setWebsite(r.website());
        s.setBankName(r.bankName());
        s.setRib(r.rib());
        s.setDefaultVatRate(r.defaultVatRate());
        s.setFiscalStamp(Money.round(r.fiscalStamp()));
        s.setFodecEnabled(r.fodecEnabled());
        s.setFodecRate(r.fodecRate());
        s.setPaymentTermsDays(r.paymentTermsDays());
        s.setQuoteValidityDays(r.quoteValidityDays());
        s.setInvoiceFooter(r.invoiceFooter());
        s.setQuoteFooter(r.quoteFooter());
        return SettingsDto.of(s, properties.demo().enabled());
    }

    public static BigDecimal requireVatRate(BigDecimal rate) {
        if (rate == null || VAT_RATES.stream().noneMatch(v -> v.compareTo(rate) == 0)) {
            throw ApiException.badRequest("Taux de TVA invalide : utilisez 0, 7, 13 ou 19 %");
        }
        return rate.setScale(2);
    }

    /**
     * The FODEC rate for a document of this client. Sales in suspension (totally exporting companies) are made
     * "en suspension de TVA et de FODEC", so they carry no FODEC either.
     */
    public BigDecimal fodecRateFor(Client client) {
        CompanySettings s = current();
        return s.isFodecEnabled() && !client.isVatExempt() ? s.getFodecRate() : BigDecimal.ZERO;
    }
}
