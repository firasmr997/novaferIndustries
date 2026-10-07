package tn.novafer.erp.domain;

public enum InvoiceStatus {
    BROUILLON, EMISE, PARTIELLEMENT_PAYEE, PAYEE, ANNULEE;

    /** Issued and not fully settled: counts toward receivables. */
    public boolean isOpen() {
        return this == EMISE || this == PARTIELLEMENT_PAYEE;
    }
}
