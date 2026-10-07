package tn.novafer.erp.domain;

public enum ComplaintStatus {
    OUVERTE, EN_COURS, RESOLUE, CLOTUREE;

    public boolean isActive() {
        return this == OUVERTE || this == EN_COURS;
    }
}
