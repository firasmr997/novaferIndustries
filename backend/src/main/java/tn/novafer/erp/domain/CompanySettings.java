package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;

/** Single row (id = 1): the identity printed on documents and the fiscal rules applied to them. */
@Getter
@Setter
@Entity
@Table(name = "company_settings")
@EntityListeners(AuditingEntityListener.class)
public class CompanySettings {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id;

    @Column(name = "company_name", nullable = false)
    private String companyName;
    @Column(name = "legal_form")
    private String legalForm;
    @Column(name = "matricule_fiscal")
    private String matriculeFiscal;
    @Column(name = "registre_commerce")
    private String registreCommerce;
    private String address;
    private String city;
    @Column(name = "postal_code")
    private String postalCode;
    @Column(nullable = false)
    private String country;
    private String phone;
    private String email;
    private String website;
    @Column(name = "bank_name")
    private String bankName;
    private String rib;
    @Column(nullable = false, length = 3)
    private String currency;
    @Column(name = "default_vat_rate", nullable = false)
    private BigDecimal defaultVatRate;
    @Column(name = "fiscal_stamp", nullable = false)
    private BigDecimal fiscalStamp;
    @Column(name = "fodec_enabled", nullable = false)
    private boolean fodecEnabled;
    @Column(name = "fodec_rate", nullable = false)
    private BigDecimal fodecRate;
    @Column(name = "payment_terms_days", nullable = false)
    private int paymentTermsDays;
    @Column(name = "quote_validity_days", nullable = false)
    private int quoteValidityDays;
    @Column(name = "invoice_footer")
    private String invoiceFooter;
    @Column(name = "quote_footer")
    private String quoteFooter;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
