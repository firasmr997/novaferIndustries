package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "clients")
public class Client extends BaseEntity {

    @Column(nullable = false, length = 20)
    private String code;

    @Column(name = "company_name", nullable = false, length = 160)
    private String companyName;

    @Column(name = "contact_name")
    private String contactName;
    private String email;
    private String phone;
    private String address;
    private String city;

    @Column(name = "matricule_fiscal")
    private String matriculeFiscal;

    private String sector;

    @Column(name = "payment_terms_days", nullable = false)
    private int paymentTermsDays = 30;

    /** Exonéré or en suspension de TVA (for example a totally exporting company): lines carry 0% VAT. */
    @Column(name = "vat_exempt", nullable = false)
    private boolean vatExempt;

    private String notes;

    @Column(nullable = false)
    private boolean active = true;
}
