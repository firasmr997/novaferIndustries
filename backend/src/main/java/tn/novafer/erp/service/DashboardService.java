package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.domain.QuoteStatus;
import tn.novafer.erp.repository.ComplaintRepository;
import tn.novafer.erp.repository.InvoiceRepository;
import tn.novafer.erp.repository.ProductRepository;
import tn.novafer.erp.repository.QuoteRepository;
import tn.novafer.erp.web.dto.CatalogueDtos.ProductDto;
import tn.novafer.erp.web.dto.DashboardDtos.AgingBucket;
import tn.novafer.erp.web.dto.DashboardDtos.AnalyticsDto;
import tn.novafer.erp.web.dto.DashboardDtos.CategoryShare;
import tn.novafer.erp.web.dto.DashboardDtos.ClientRank;
import tn.novafer.erp.web.dto.DashboardDtos.ComplaintTypeStat;
import tn.novafer.erp.web.dto.DashboardDtos.HomeDto;
import tn.novafer.erp.web.dto.DashboardDtos.Kpis;
import tn.novafer.erp.web.dto.DashboardDtos.MethodShare;
import tn.novafer.erp.web.dto.DashboardDtos.MonthPoint;
import tn.novafer.erp.web.dto.DashboardDtos.ProductRank;
import tn.novafer.erp.web.dto.DashboardDtos.QuoteFunnel;
import tn.novafer.erp.web.dto.DashboardDtos.Totals;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Aggregates for the home dashboard and the analytics screen. Revenue is invoiced HT of issued factures
 * (drafts and cancelled ones excluded); collections are payments by payment date.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final String BILLED = "i.status NOT IN ('BROUILLON', 'ANNULEE')";
    private static final String OPEN = "i.status IN ('EMISE', 'PARTIELLEMENT_PAYEE')";

    private final JdbcTemplate jdbc;
    private final InvoiceRepository invoiceRepository;
    private final QuoteRepository quoteRepository;
    private final ComplaintRepository complaintRepository;
    private final ProductRepository productRepository;

    public HomeDto home() {
        LocalDate today = LocalDate.now();
        return new HomeDto(kpis(), aging(), monthly(12),
                invoiceRepository.findOpenOrderByDueDate(PageRequest.of(0, 7)).stream()
                        .filter(i -> i.isOverdue(today))
                        .map(i -> InvoiceService.summary(i, today)).toList(),
                quoteRepository.search("", QuoteStatus.ENVOYE, null,
                                PageRequest.of(0, 6, Sort.by("validUntil").ascending()))
                        .map(QuoteService::summary).getContent(),
                complaintRepository.findActiveByUrgency(PageRequest.of(0, 5)).stream()
                        .map(ComplaintService::summary).toList(),
                productRepository.findLowStock(PageRequest.of(0, 6)).stream().map(ProductDto::of).toList());
    }

    private Kpis kpis() {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE %1$s
                     AND date_trunc('month', i.issue_date) = date_trunc('month', CURRENT_DATE)) AS revenue_month,
                  (SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE %1$s
                     AND date_trunc('month', i.issue_date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')) AS revenue_prev_month,
                  (SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE %1$s
                     AND i.issue_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                     AND i.issue_date <= CURRENT_DATE - INTERVAL '1 month') AS revenue_prev_mtd,
                  (SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE %1$s
                     AND i.issue_date >= date_trunc('year', CURRENT_DATE) AND i.issue_date <= CURRENT_DATE) AS revenue_ytd,
                  (SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE %1$s
                     AND i.issue_date >= date_trunc('year', CURRENT_DATE) - INTERVAL '1 year'
                     AND i.issue_date <= CURRENT_DATE - INTERVAL '1 year') AS revenue_prev_ytd,
                  (SELECT COALESCE(SUM(amount), 0) FROM payments p
                     WHERE date_trunc('month', p.payment_date) = date_trunc('month', CURRENT_DATE)) AS collected_month,
                  (SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM invoices i WHERE %2$s) AS receivables,
                  (SELECT COALESCE(SUM(total_ttc - amount_paid), 0) FROM invoices i WHERE %2$s AND i.due_date < CURRENT_DATE) AS overdue_amount,
                  (SELECT COUNT(*) FROM invoices i WHERE %2$s AND i.due_date < CURRENT_DATE) AS overdue_count,
                  (SELECT COALESCE(SUM(total_ht), 0) FROM quotes WHERE status = 'ENVOYE') AS pending_quotes_amount,
                  (SELECT COUNT(*) FROM quotes WHERE status = 'ENVOYE') AS pending_quotes_count,
                  (SELECT CASE WHEN COUNT(*) FILTER (WHERE status IN ('ACCEPTE', 'FACTURE', 'REFUSE', 'EXPIRE')) = 0 THEN 0
                          ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('ACCEPTE', 'FACTURE'))
                               / COUNT(*) FILTER (WHERE status IN ('ACCEPTE', 'FACTURE', 'REFUSE', 'EXPIRE')), 1) END
                     FROM quotes WHERE issue_date >= CURRENT_DATE - 90) AS conversion_rate,
                  (SELECT COUNT(*) FROM complaints WHERE status IN ('OUVERTE', 'EN_COURS')) AS open_complaints,
                  (SELECT COUNT(*) FROM complaints WHERE status IN ('OUVERTE', 'EN_COURS') AND priority = 'CRITIQUE') AS critical_complaints,
                  (SELECT COUNT(*) FROM products WHERE active AND stock_quantity <= min_stock) AS low_stock,
                  (SELECT COUNT(*) FROM invoices WHERE status = 'BROUILLON') AS draft_invoices
                """.formatted(BILLED, OPEN), (rs, n) -> new Kpis(
                rs.getBigDecimal("revenue_month"), rs.getBigDecimal("revenue_prev_month"), rs.getBigDecimal("revenue_prev_mtd"),
                rs.getBigDecimal("revenue_ytd"), rs.getBigDecimal("revenue_prev_ytd"),
                rs.getBigDecimal("collected_month"), rs.getBigDecimal("receivables"),
                rs.getBigDecimal("overdue_amount"), rs.getLong("overdue_count"),
                rs.getBigDecimal("pending_quotes_amount"), rs.getLong("pending_quotes_count"),
                rs.getBigDecimal("conversion_rate"), rs.getLong("open_complaints"),
                rs.getLong("critical_complaints"), rs.getLong("low_stock"), rs.getLong("draft_invoices")));
    }

    private List<AgingBucket> aging() {
        return jdbc.queryForObject("""
                SELECT
                  COALESCE(SUM(b) FILTER (WHERE late <= 0), 0) a0, COUNT(*) FILTER (WHERE late <= 0) c0,
                  COALESCE(SUM(b) FILTER (WHERE late BETWEEN 1 AND 30), 0) a1, COUNT(*) FILTER (WHERE late BETWEEN 1 AND 30) c1,
                  COALESCE(SUM(b) FILTER (WHERE late BETWEEN 31 AND 60), 0) a2, COUNT(*) FILTER (WHERE late BETWEEN 31 AND 60) c2,
                  COALESCE(SUM(b) FILTER (WHERE late BETWEEN 61 AND 90), 0) a3, COUNT(*) FILTER (WHERE late BETWEEN 61 AND 90) c3,
                  COALESCE(SUM(b) FILTER (WHERE late > 90), 0) a4, COUNT(*) FILTER (WHERE late > 90) c4
                FROM (SELECT total_ttc - amount_paid AS b, CURRENT_DATE - due_date AS late FROM invoices i WHERE %s) open
                """.formatted(OPEN), (rs, n) -> List.of(
                new AgingBucket("NOT_DUE", "Non échu", 0, rs.getBigDecimal("a0"), rs.getLong("c0")),
                new AgingBucket("D1_30", "1–30 j", 1, rs.getBigDecimal("a1"), rs.getLong("c1")),
                new AgingBucket("D31_60", "31–60 j", 2, rs.getBigDecimal("a2"), rs.getLong("c2")),
                new AgingBucket("D61_90", "61–90 j", 3, rs.getBigDecimal("a3"), rs.getLong("c3")),
                new AgingBucket("D90_PLUS", "+90 j", 4, rs.getBigDecimal("a4"), rs.getLong("c4"))));
    }

    private List<MonthPoint> monthly(int months) {
        return jdbc.query("""
                WITH months AS (
                  SELECT (date_trunc('month', CURRENT_DATE) - make_interval(months => n))::date AS m
                  FROM generate_series(0, ? - 1) AS n
                )
                SELECT to_char(m, 'YYYY-MM') AS month,
                  (SELECT COALESCE(SUM(i.total_ht), 0) FROM invoices i
                     WHERE %1$s AND date_trunc('month', i.issue_date)::date = m) AS invoiced,
                  (SELECT COALESCE(SUM(p.amount), 0) FROM payments p
                     WHERE date_trunc('month', p.payment_date)::date = m) AS collected,
                  (SELECT COALESCE(SUM(q.total_ht), 0) FROM quotes q
                     WHERE q.status <> 'BROUILLON' AND date_trunc('month', q.issue_date)::date = m) AS quoted,
                  (SELECT COALESCE(SUM(l.total_ht - l.quantity * COALESCE(pr.cost_price, 0)), 0)
                     FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id
                     LEFT JOIN products pr ON pr.id = l.product_id
                     WHERE %1$s AND date_trunc('month', i.issue_date)::date = m) AS margin,
                  (SELECT COUNT(*) FROM complaints c WHERE date_trunc('month', c.opened_at)::date = m) AS complaints
                FROM months ORDER BY m
                """.formatted(BILLED), (rs, n) -> new MonthPoint(rs.getString("month"),
                rs.getBigDecimal("invoiced"), rs.getBigDecimal("collected"), rs.getBigDecimal("quoted"),
                rs.getBigDecimal("margin"), rs.getLong("complaints")), months);
    }

    public AnalyticsDto analytics(int months) {
        int span = Math.max(1, Math.min(months, 36));
        // Period start: first day of the oldest month in the window.
        LocalDate from = LocalDate.now().withDayOfMonth(1).minusMonths(span - 1L);
        List<MonthPoint> monthly = monthly(span);
        return new AnalyticsDto(span, totals(from), monthly, topClients(from), topProducts(from),
                categories(from), funnel(from), complaintTypes(from), paymentMethods(from));
    }

    private Totals totals(LocalDate from) {
        return jdbc.queryForObject("""
                SELECT
                  (SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE %1$s AND i.issue_date >= ?) AS invoiced,
                  (SELECT COUNT(*) FROM invoices i WHERE %1$s AND i.issue_date >= ?) AS invoice_count,
                  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= ?) AS collected,
                  (SELECT COALESCE(SUM(l.total_ht - l.quantity * COALESCE(pr.cost_price, 0)), 0)
                     FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id
                     LEFT JOIN products pr ON pr.id = l.product_id WHERE %1$s AND i.issue_date >= ?) AS margin,
                  (SELECT ROUND(SUM(total_ttc - amount_paid) * 90
                          / NULLIF((SELECT SUM(total_ttc) FROM invoices i WHERE %1$s AND i.issue_date > CURRENT_DATE - 90), 0))::int
                     FROM invoices i WHERE %2$s) AS dso,
                  (SELECT ROUND(AVG(p.payment_date - i.issue_date))::int FROM payments p
                     JOIN invoices i ON i.id = p.invoice_id WHERE p.payment_date >= ?) AS avg_payment_days,
                  (SELECT COUNT(*) FROM complaints WHERE opened_at >= ?) AS complaints,
                  (SELECT COALESCE(SUM(estimated_cost), 0) FROM complaints WHERE opened_at >= ?) AS non_quality_cost,
                  (SELECT COALESCE(SUM(stock_quantity * cost_price), 0) FROM products WHERE active AND stock_quantity > 0) AS stock_value
                """.formatted(BILLED, OPEN), (rs, n) -> {
            BigDecimal invoiced = rs.getBigDecimal("invoiced");
            BigDecimal margin = rs.getBigDecimal("margin");
            long count = rs.getLong("invoice_count");
            long complaints = rs.getLong("complaints");
            return new Totals(invoiced, rs.getBigDecimal("collected"), margin, rate(margin, invoiced), count,
                    count == 0 ? BigDecimal.ZERO : invoiced.divide(BigDecimal.valueOf(count), 3, RoundingMode.HALF_UP),
                    (Integer) rs.getObject("dso"), (Integer) rs.getObject("avg_payment_days"), complaints,
                    count == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(complaints * 100.0 / count).setScale(1, RoundingMode.HALF_UP),
                    rs.getBigDecimal("non_quality_cost"), rs.getBigDecimal("stock_value"));
        }, from, from, from, from, from, ts(from), ts(from));
    }

    private List<ClientRank> topClients(LocalDate from) {
        BigDecimal total = jdbc.queryForObject("SELECT COALESCE(SUM(total_ht), 0) FROM invoices i WHERE "
                + BILLED + " AND i.issue_date >= ?", BigDecimal.class, from);
        return jdbc.query("""
                SELECT c.id, c.company_name, c.city, SUM(i.total_ht) AS revenue, COUNT(*) AS invoices,
                  (SELECT COALESCE(SUM(o.total_ttc - o.amount_paid), 0) FROM invoices o
                     WHERE o.client_id = c.id AND o.status IN ('EMISE', 'PARTIELLEMENT_PAYEE')) AS open_balance
                FROM invoices i JOIN clients c ON c.id = i.client_id
                WHERE %s AND i.issue_date >= ?
                GROUP BY c.id, c.company_name, c.city ORDER BY revenue DESC LIMIT 8
                """.formatted(BILLED), (rs, n) -> new ClientRank(rs.getLong("id"), rs.getString("company_name"),
                rs.getString("city"), rs.getBigDecimal("revenue"), rate(rs.getBigDecimal("revenue"), total),
                rs.getLong("invoices"), rs.getBigDecimal("open_balance")), from);
    }

    private List<ProductRank> topProducts(LocalDate from) {
        return jdbc.query("""
                SELECT pr.id, pr.reference, pr.name, pr.unit, SUM(l.quantity) AS quantity, SUM(l.total_ht) AS revenue,
                  SUM(l.total_ht - l.quantity * pr.cost_price) AS margin
                FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id JOIN products pr ON pr.id = l.product_id
                WHERE %s AND i.issue_date >= ?
                GROUP BY pr.id, pr.reference, pr.name, pr.unit ORDER BY revenue DESC LIMIT 8
                """.formatted(BILLED), (rs, n) -> new ProductRank(rs.getLong("id"), rs.getString("reference"),
                rs.getString("name"), rs.getBigDecimal("quantity"), rs.getString("unit"),
                rs.getBigDecimal("revenue"), rs.getBigDecimal("margin")), from);
    }

    private List<CategoryShare> categories(LocalDate from) {
        List<Object[]> rows = jdbc.query("""
                SELECT COALESCE(cat.name, 'Hors catalogue') AS name, SUM(l.total_ht) AS revenue
                FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id
                LEFT JOIN products pr ON pr.id = l.product_id LEFT JOIN categories cat ON cat.id = pr.category_id
                WHERE %s AND i.issue_date >= ?
                GROUP BY 1 ORDER BY revenue DESC
                """.formatted(BILLED), (rs, n) -> new Object[]{rs.getString("name"), rs.getBigDecimal("revenue")}, from);
        BigDecimal total = rows.stream().map(r -> (BigDecimal) r[1]).reduce(BigDecimal.ZERO, BigDecimal::add);
        return rows.stream().map(r -> new CategoryShare((String) r[0], (BigDecimal) r[1], rate((BigDecimal) r[1], total)))
                .toList();
    }

    private QuoteFunnel funnel(LocalDate from) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) AS created,
                  COUNT(*) FILTER (WHERE status <> 'BROUILLON') AS sent,
                  COUNT(*) FILTER (WHERE status IN ('ACCEPTE', 'FACTURE')) AS accepted,
                  COUNT(*) FILTER (WHERE status = 'REFUSE') AS refused,
                  COUNT(*) FILTER (WHERE status = 'EXPIRE') AS expired,
                  COUNT(*) FILTER (WHERE status = 'FACTURE') AS invoiced,
                  COALESCE(SUM(total_ht) FILTER (WHERE status <> 'BROUILLON'), 0) AS quoted_amount,
                  COALESCE(SUM(total_ht) FILTER (WHERE status IN ('ACCEPTE', 'FACTURE')), 0) AS won_amount
                FROM quotes WHERE issue_date >= ?
                """, (rs, n) -> {
            long accepted = rs.getLong("accepted");
            long decided = accepted + rs.getLong("refused") + rs.getLong("expired");
            return new QuoteFunnel(rs.getLong("created"), rs.getLong("sent"), accepted, rs.getLong("refused"),
                    rs.getLong("expired"), rs.getLong("invoiced"),
                    decided == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(accepted * 100.0 / decided).setScale(1, RoundingMode.HALF_UP),
                    rs.getBigDecimal("quoted_amount"), rs.getBigDecimal("won_amount"));
        }, from);
    }

    private List<ComplaintTypeStat> complaintTypes(LocalDate from) {
        return jdbc.query("""
                SELECT type, COUNT(*) AS count,
                  COUNT(*) FILTER (WHERE status IN ('OUVERTE', 'EN_COURS')) AS open,
                  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - opened_at)) / 86400.0)::numeric, 1) AS avg_days
                FROM complaints WHERE opened_at >= ?
                GROUP BY type ORDER BY count DESC
                """, (rs, n) -> new ComplaintTypeStat(rs.getString("type"), rs.getLong("count"), rs.getLong("open"),
                rs.getBigDecimal("avg_days")), ts(from));
    }

    private List<MethodShare> paymentMethods(LocalDate from) {
        return jdbc.query("""
                SELECT method, SUM(amount) AS amount, COUNT(*) AS count FROM payments
                WHERE payment_date >= ? GROUP BY method ORDER BY amount DESC
                """, (rs, n) -> new MethodShare(rs.getString("method"), rs.getBigDecimal("amount"),
                rs.getLong("count")), from);
    }

    private static java.sql.Timestamp ts(LocalDate date) {
        return java.sql.Timestamp.valueOf(date.atStartOfDay());
    }

    private static BigDecimal rate(BigDecimal part, BigDecimal total) {
        if (total == null || total.signum() == 0 || part == null) {
            return BigDecimal.ZERO;
        }
        return part.multiply(BigDecimal.valueOf(100)).divide(total, 1, RoundingMode.HALF_UP);
    }
}
