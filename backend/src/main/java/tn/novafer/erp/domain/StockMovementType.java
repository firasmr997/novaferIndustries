package tn.novafer.erp.domain;

public enum StockMovementType {
    /** Production output or supplier reception. */
    ENTREE,
    /** Delivery to a client (issued facture) or consumption. */
    SORTIE,
    /** Inventory correction; the quantity is signed. */
    AJUSTEMENT
}
