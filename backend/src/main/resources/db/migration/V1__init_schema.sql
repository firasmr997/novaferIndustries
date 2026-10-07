-- Novafer ERP schema. Amounts are NUMERIC(14,3): the Tunisian dinar has three decimals (millimes).

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(160) NOT NULL,
    full_name      VARCHAR(120) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(20)  NOT NULL,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'QUALITY', 'WAREHOUSE'))
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

-- One row (id = 1): the company identity printed on every document, and its fiscal rules.
CREATE TABLE company_settings (
    id                   BIGINT PRIMARY KEY,
    company_name         VARCHAR(160) NOT NULL,
    legal_form           VARCHAR(60),
    matricule_fiscal     VARCHAR(40),
    registre_commerce    VARCHAR(40),
    address              VARCHAR(255),
    city                 VARCHAR(80),
    postal_code          VARCHAR(12),
    country              VARCHAR(60)  NOT NULL DEFAULT 'Tunisie',
    phone                VARCHAR(40),
    email                VARCHAR(160),
    website              VARCHAR(160),
    bank_name            VARCHAR(120),
    rib                  VARCHAR(40),
    currency             VARCHAR(3)    NOT NULL DEFAULT 'TND',
    default_vat_rate     NUMERIC(5, 2) NOT NULL DEFAULT 19.00,
    fiscal_stamp         NUMERIC(14, 3) NOT NULL DEFAULT 1.000,
    fodec_enabled        BOOLEAN       NOT NULL DEFAULT TRUE,
    fodec_rate           NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    payment_terms_days   INTEGER       NOT NULL DEFAULT 30,
    quote_validity_days  INTEGER       NOT NULL DEFAULT 30,
    invoice_footer       VARCHAR(500),
    quote_footer         VARCHAR(500),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_company_singleton CHECK (id = 1)
);

INSERT INTO company_settings (id, company_name) VALUES (1, 'Novafer Industries');

-- Sequential numbering per document type and year: DEV-2026-0001, FAC-2026-0001, REC-2026-0001.
CREATE TABLE document_sequences (
    doc_type    VARCHAR(10) NOT NULL,
    year        INTEGER     NOT NULL,
    last_value  INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (doc_type, year)
);

CREATE TABLE categories (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(20)  NOT NULL UNIQUE,
    name         VARCHAR(120) NOT NULL,
    description  VARCHAR(500),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    reference       VARCHAR(40)    NOT NULL UNIQUE,
    name            VARCHAR(160)   NOT NULL,
    description     VARCHAR(1000),
    category_id     BIGINT REFERENCES categories (id),
    material        VARCHAR(80),
    unit            VARCHAR(12)    NOT NULL DEFAULT 'pièce',
    unit_price      NUMERIC(14, 3) NOT NULL,
    cost_price      NUMERIC(14, 3) NOT NULL DEFAULT 0,
    vat_rate        NUMERIC(5, 2)  NOT NULL DEFAULT 19.00,
    stock_quantity  NUMERIC(14, 3) NOT NULL DEFAULT 0,
    min_stock       NUMERIC(14, 3) NOT NULL DEFAULT 0,
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_products_price CHECK (unit_price >= 0 AND cost_price >= 0),
    CONSTRAINT ck_products_vat CHECK (vat_rate IN (0, 7, 13, 19))
);
CREATE INDEX ix_products_category ON products (category_id);

CREATE TABLE clients (
    id                  BIGSERIAL PRIMARY KEY,
    code                VARCHAR(20)  NOT NULL UNIQUE,
    company_name        VARCHAR(160) NOT NULL,
    contact_name        VARCHAR(120),
    email               VARCHAR(160),
    phone               VARCHAR(40),
    address             VARCHAR(255),
    city                VARCHAR(80),
    matricule_fiscal    VARCHAR(40),
    sector              VARCHAR(80),
    payment_terms_days  INTEGER      NOT NULL DEFAULT 30,
    vat_exempt          BOOLEAN      NOT NULL DEFAULT FALSE,
    notes               VARCHAR(1000),
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_clients_name ON clients (lower(company_name));

CREATE TABLE quotes (
    id                    BIGSERIAL PRIMARY KEY,
    number                VARCHAR(20)    NOT NULL UNIQUE,
    client_id             BIGINT         NOT NULL REFERENCES clients (id),
    issue_date            DATE           NOT NULL,
    valid_until           DATE           NOT NULL,
    status                VARCHAR(12)    NOT NULL,
    subject               VARCHAR(200),
    notes                 VARCHAR(2000),
    total_ht              NUMERIC(14, 3) NOT NULL DEFAULT 0,
    total_discount        NUMERIC(14, 3) NOT NULL DEFAULT 0,
    total_fodec           NUMERIC(14, 3) NOT NULL DEFAULT 0,
    fodec_rate            NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    total_vat             NUMERIC(14, 3) NOT NULL DEFAULT 0,
    total_ttc             NUMERIC(14, 3) NOT NULL DEFAULT 0,
    converted_invoice_id  BIGINT,
    created_by            VARCHAR(160),
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_quotes_status CHECK (status IN ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE', 'FACTURE'))
);
CREATE INDEX ix_quotes_client ON quotes (client_id);
CREATE INDEX ix_quotes_issue_date ON quotes (issue_date);

CREATE TABLE quote_lines (
    id            BIGSERIAL PRIMARY KEY,
    quote_id      BIGINT         NOT NULL REFERENCES quotes (id) ON DELETE CASCADE,
    position      INTEGER        NOT NULL,
    product_id    BIGINT REFERENCES products (id),
    reference     VARCHAR(40),
    description   VARCHAR(500)   NOT NULL,
    unit          VARCHAR(12)    NOT NULL,
    quantity      NUMERIC(14, 3) NOT NULL,
    unit_price    NUMERIC(14, 3) NOT NULL,
    discount_pct  NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    vat_rate      NUMERIC(5, 2)  NOT NULL,
    total_ht      NUMERIC(14, 3) NOT NULL
);
CREATE INDEX ix_quote_lines_quote ON quote_lines (quote_id);

-- A facture gets its number only when issued, so the legal sequence never has gaps from abandoned drafts.
CREATE TABLE invoices (
    id              BIGSERIAL PRIMARY KEY,
    number          VARCHAR(20) UNIQUE,
    client_id       BIGINT         NOT NULL REFERENCES clients (id),
    quote_id        BIGINT REFERENCES quotes (id),
    issue_date      DATE           NOT NULL,
    due_date        DATE           NOT NULL,
    status          VARCHAR(20)    NOT NULL,
    subject         VARCHAR(200),
    notes           VARCHAR(2000),
    total_ht        NUMERIC(14, 3) NOT NULL DEFAULT 0,
    total_discount  NUMERIC(14, 3) NOT NULL DEFAULT 0,
    total_fodec     NUMERIC(14, 3) NOT NULL DEFAULT 0,
    fodec_rate      NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    total_vat       NUMERIC(14, 3) NOT NULL DEFAULT 0,
    fiscal_stamp    NUMERIC(14, 3) NOT NULL DEFAULT 0,
    total_ttc       NUMERIC(14, 3) NOT NULL DEFAULT 0,
    amount_paid     NUMERIC(14, 3) NOT NULL DEFAULT 0,
    issued_at       TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    created_by      VARCHAR(160),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_invoices_status CHECK (status IN ('BROUILLON', 'EMISE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE'))
);
CREATE INDEX ix_invoices_client ON invoices (client_id);
CREATE INDEX ix_invoices_issue_date ON invoices (issue_date);
CREATE INDEX ix_invoices_status_due ON invoices (status, due_date);

ALTER TABLE quotes ADD CONSTRAINT fk_quotes_invoice FOREIGN KEY (converted_invoice_id) REFERENCES invoices (id);

CREATE TABLE invoice_lines (
    id            BIGSERIAL PRIMARY KEY,
    invoice_id    BIGINT         NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    position      INTEGER        NOT NULL,
    product_id    BIGINT REFERENCES products (id),
    reference     VARCHAR(40),
    description   VARCHAR(500)   NOT NULL,
    unit          VARCHAR(12)    NOT NULL,
    quantity      NUMERIC(14, 3) NOT NULL,
    unit_price    NUMERIC(14, 3) NOT NULL,
    discount_pct  NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    vat_rate      NUMERIC(5, 2)  NOT NULL,
    total_ht      NUMERIC(14, 3) NOT NULL
);
CREATE INDEX ix_invoice_lines_invoice ON invoice_lines (invoice_id);
CREATE INDEX ix_invoice_lines_product ON invoice_lines (product_id);

CREATE TABLE payments (
    id            BIGSERIAL PRIMARY KEY,
    invoice_id    BIGINT         NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
    payment_date  DATE           NOT NULL,
    amount        NUMERIC(14, 3) NOT NULL,
    method        VARCHAR(12)    NOT NULL,
    reference     VARCHAR(80),
    notes         VARCHAR(500),
    created_by    VARCHAR(160),
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_payments_amount CHECK (amount > 0),
    CONSTRAINT ck_payments_method CHECK (method IN ('ESPECES', 'CHEQUE', 'VIREMENT', 'TRAITE', 'CARTE'))
);
CREATE INDEX ix_payments_invoice ON payments (invoice_id);
CREATE INDEX ix_payments_date ON payments (payment_date);

CREATE TABLE stock_movements (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT         NOT NULL REFERENCES products (id),
    type            VARCHAR(12)    NOT NULL,
    quantity        NUMERIC(14, 3) NOT NULL,
    stock_after     NUMERIC(14, 3) NOT NULL,
    reason          VARCHAR(255),
    document_ref    VARCHAR(40),
    movement_date   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    created_by      VARCHAR(160),
    CONSTRAINT ck_stock_type CHECK (type IN ('ENTREE', 'SORTIE', 'AJUSTEMENT'))
);
CREATE INDEX ix_stock_product_date ON stock_movements (product_id, movement_date DESC);

CREATE TABLE complaints (
    id             BIGSERIAL PRIMARY KEY,
    number         VARCHAR(20)   NOT NULL UNIQUE,
    client_id      BIGINT        NOT NULL REFERENCES clients (id),
    invoice_id     BIGINT REFERENCES invoices (id),
    product_id     BIGINT REFERENCES products (id),
    subject        VARCHAR(200)  NOT NULL,
    description    VARCHAR(4000) NOT NULL,
    type           VARCHAR(12)   NOT NULL,
    priority       VARCHAR(10)   NOT NULL,
    status         VARCHAR(10)   NOT NULL,
    assignee_id    BIGINT REFERENCES users (id),
    resolution     VARCHAR(4000),
    estimated_cost NUMERIC(14, 3),
    opened_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    resolved_at    TIMESTAMPTZ,
    closed_at      TIMESTAMPTZ,
    created_by     VARCHAR(160),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_complaints_type CHECK (type IN ('QUALITE', 'LIVRAISON', 'FACTURATION', 'AUTRE')),
    CONSTRAINT ck_complaints_priority CHECK (priority IN ('BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE')),
    CONSTRAINT ck_complaints_status CHECK (status IN ('OUVERTE', 'EN_COURS', 'RESOLUE', 'CLOTUREE'))
);
CREATE INDEX ix_complaints_status ON complaints (status);
CREATE INDEX ix_complaints_client ON complaints (client_id);

CREATE TABLE complaint_events (
    id            BIGSERIAL PRIMARY KEY,
    complaint_id  BIGINT        NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
    author        VARCHAR(160)  NOT NULL,
    message       VARCHAR(4000),
    from_status   VARCHAR(10),
    to_status     VARCHAR(10),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_complaint_events_complaint ON complaint_events (complaint_id, created_at);
