package tn.novafer.erp.web.dto;

import tn.novafer.erp.web.dto.CatalogueDtos.ProductDto;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintSummary;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceSummary;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteSummary;

import java.math.BigDecimal;
import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    /** Home screen: money first (revenue, receivables, devis), then quality and stock. */
    public record HomeDto(Kpis kpis, List<AgingBucket> aging, List<MonthPoint> monthly,
                          List<InvoiceSummary> overdueInvoices, List<QuoteSummary> pendingQuotes,
                          List<ComplaintSummary> urgentComplaints, List<ProductDto> lowStock) {
    }

    /** {@code revenuePrevMonthToDate}: last month from its first day to the same day number, for a like-for-like delta. */
    public record Kpis(BigDecimal revenueMonth, BigDecimal revenuePrevMonth, BigDecimal revenuePrevMonthToDate, BigDecimal revenueYtd,
                       BigDecimal revenuePrevYtd, BigDecimal collectedMonth, BigDecimal receivables,
                       BigDecimal overdueAmount, long overdueCount, BigDecimal pendingQuotesAmount,
                       long pendingQuotesCount, BigDecimal conversionRate, long openComplaints,
                       long criticalComplaints, long lowStockCount, long draftInvoices) {
    }

    /**
     * Receivables by lateness. {@code heat} runs from 0 (not yet due) to 4 (over 90 days late) and drives
     * the heat-colour scale in the interface.
     */
    public record AgingBucket(String key, String label, int heat, BigDecimal amount, long count) {
    }

    public record MonthPoint(String month, BigDecimal invoiced, BigDecimal collected, BigDecimal quoted,
                             BigDecimal margin, long complaints) {
    }

    public record AnalyticsDto(int months, Totals totals, List<MonthPoint> monthly, List<ClientRank> topClients,
                               List<ProductRank> topProducts, List<CategoryShare> revenueByCategory,
                               QuoteFunnel quoteFunnel, List<ComplaintTypeStat> complaintsByType,
                               List<MethodShare> paymentMethods) {
    }

    public record Totals(BigDecimal invoiced, BigDecimal collected, BigDecimal margin, BigDecimal marginRate,
                         long invoiceCount, BigDecimal averageInvoice, Integer dso, Integer averagePaymentDays,
                         long complaints, BigDecimal complaintsPer100Invoices, BigDecimal nonQualityCost,
                         BigDecimal stockValue) {
    }

    public record ClientRank(Long id, String name, String city, BigDecimal revenue, BigDecimal share,
                             long invoices, BigDecimal openBalance) {
    }

    public record ProductRank(Long id, String reference, String name, BigDecimal quantity, String unit,
                              BigDecimal revenue, BigDecimal margin) {
    }

    public record CategoryShare(String name, BigDecimal revenue, BigDecimal share) {
    }

    public record QuoteFunnel(long created, long sent, long accepted, long refused, long expired, long invoiced,
                              BigDecimal conversionRate, BigDecimal quotedAmount, BigDecimal wonAmount) {
    }

    public record ComplaintTypeStat(String type, long count, long open, BigDecimal averageResolutionDays) {
    }

    public record MethodShare(String method, BigDecimal amount, long count) {
    }
}
