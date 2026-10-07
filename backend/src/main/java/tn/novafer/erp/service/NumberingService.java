package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gap-free yearly numbering (DEV-2026-0001). The upsert takes a row lock on the counter, so concurrent
 * issues serialize and a rolled-back transaction gives its number back.
 */
@Service
@RequiredArgsConstructor
public class NumberingService {

    public static final String QUOTE = "DEV";
    public static final String INVOICE = "FAC";
    public static final String COMPLAINT = "REC";

    private final JdbcTemplate jdbc;

    @Transactional(propagation = Propagation.MANDATORY)
    public String next(String prefix, int year) {
        Integer value = jdbc.queryForObject("""
                INSERT INTO document_sequences (doc_type, year, last_value) VALUES (?, ?, 1)
                ON CONFLICT (doc_type, year) DO UPDATE SET last_value = document_sequences.last_value + 1
                RETURNING last_value
                """, Integer.class, prefix, year);
        return "%s-%d-%04d".formatted(prefix, year, value);
    }
}
