package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.repository.ClientRepository;
import tn.novafer.erp.web.dto.ClientDtos.ClientDetail;
import tn.novafer.erp.web.dto.ClientDtos.ClientDto;
import tn.novafer.erp.web.dto.ClientDtos.ClientRequest;
import tn.novafer.erp.web.dto.ClientDtos.ClientStats;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final SettingsService settingsService;
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public PageResponse<ClientDto> search(String q, boolean includeInactive, Pageable pageable) {
        return PageResponse.from(clientRepository.search(q == null ? "" : q.trim(), includeInactive, pageable),
                ClientDto::of);
    }

    public Client client(Long id) {
        return clientRepository.findById(id).orElseThrow(() -> ApiException.notFound("Client"));
    }

    @Transactional(readOnly = true)
    public ClientDetail get(Long id) {
        return new ClientDetail(ClientDto.of(client(id)), stats(id));
    }

    private ClientStats stats(Long clientId) {
        return jdbc.queryForObject("""
                SELECT
                  COALESCE(SUM(total_ht) FILTER (WHERE status <> 'BROUILLON' AND status <> 'ANNULEE'
                           AND date_trunc('year', issue_date) = date_trunc('year', CURRENT_DATE)), 0) AS revenue_ytd,
                  COALESCE(SUM(total_ht) FILTER (WHERE status <> 'BROUILLON' AND status <> 'ANNULEE'), 0) AS revenue_total,
                  COALESCE(SUM(total_ttc - amount_paid) FILTER (WHERE status IN ('EMISE', 'PARTIELLEMENT_PAYEE')), 0) AS open_balance,
                  COALESCE(SUM(total_ttc - amount_paid) FILTER (WHERE status IN ('EMISE', 'PARTIELLEMENT_PAYEE')
                           AND due_date < CURRENT_DATE), 0) AS overdue_balance,
                  COUNT(*) FILTER (WHERE status <> 'BROUILLON') AS invoice_count,
                  (SELECT COUNT(*) FROM quotes q WHERE q.client_id = ?) AS quote_count,
                  (SELECT COUNT(*) FROM complaints c WHERE c.client_id = ? AND c.status IN ('OUVERTE', 'EN_COURS')) AS open_complaints,
                  (SELECT ROUND(AVG(p.payment_date - i2.issue_date))::int FROM payments p
                     JOIN invoices i2 ON i2.id = p.invoice_id WHERE i2.client_id = ?) AS avg_payment_days
                FROM invoices WHERE client_id = ?
                """, (rs, n) -> new ClientStats(
                rs.getBigDecimal("revenue_ytd"), rs.getBigDecimal("revenue_total"),
                rs.getBigDecimal("open_balance"), rs.getBigDecimal("overdue_balance"),
                rs.getLong("invoice_count"), rs.getLong("quote_count"), rs.getLong("open_complaints"),
                (Integer) rs.getObject("avg_payment_days")), clientId, clientId, clientId, clientId);
    }

    @Transactional
    public ClientDto create(ClientRequest r) {
        Client c = new Client();
        String code = r.code() == null || r.code().isBlank() ? nextCode() : r.code().trim().toUpperCase();
        if (clientRepository.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("Ce code client existe déjà");
        }
        c.setCode(code);
        apply(c, r);
        if (r.paymentTermsDays() == null) {
            c.setPaymentTermsDays(settingsService.current().getPaymentTermsDays());
        }
        return ClientDto.of(clientRepository.save(c));
    }

    @Transactional
    public ClientDto update(Long id, ClientRequest r) {
        Client c = client(id);
        if (r.code() != null && !r.code().isBlank()) {
            String code = r.code().trim().toUpperCase();
            if (clientRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
                throw ApiException.conflict("Ce code client existe déjà");
            }
            c.setCode(code);
        }
        apply(c, r);
        return ClientDto.of(c);
    }

    /** Clients carry document history, so they are archived rather than deleted. */
    @Transactional
    public void archive(Long id) {
        client(id).setActive(false);
    }

    private String nextCode() {
        return "CLI-%04d".formatted(clientRepository.maxId() + 1);
    }

    private static void apply(Client c, ClientRequest r) {
        c.setCompanyName(r.companyName().trim());
        c.setContactName(r.contactName());
        c.setEmail(r.email());
        c.setPhone(r.phone());
        c.setAddress(r.address());
        c.setCity(r.city());
        c.setMatriculeFiscal(r.matriculeFiscal());
        c.setSector(r.sector());
        if (r.paymentTermsDays() != null) {
            c.setPaymentTermsDays(r.paymentTermsDays());
        }
        c.setVatExempt(r.vatExempt());
        c.setNotes(r.notes());
        if (r.active() != null) {
            c.setActive(r.active());
        }
    }
}
