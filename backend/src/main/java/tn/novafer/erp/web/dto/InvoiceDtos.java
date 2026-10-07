package tn.novafer.erp.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.InvoiceStatus;
import tn.novafer.erp.domain.Payment;
import tn.novafer.erp.domain.PaymentMethod;
import tn.novafer.erp.web.dto.CommonDtos.LineRequest;
import tn.novafer.erp.web.dto.CommonDtos.LineResponse;
import tn.novafer.erp.web.dto.CommonDtos.PartyDto;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.CommonDtos.TotalsResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class InvoiceDtos {

    private InvoiceDtos() {
    }

    public record InvoiceSummary(Long id, String number, Ref client, LocalDate issueDate, LocalDate dueDate,
                                 InvoiceStatus status, boolean overdue, long daysOverdue, String subject,
                                 BigDecimal totalTtc, BigDecimal amountPaid, BigDecimal balanceDue) {
    }

    public record InvoiceDetail(Long id, String number, PartyDto client, LocalDate issueDate, LocalDate dueDate,
                                InvoiceStatus status, boolean overdue, long daysOverdue, String subject,
                                String notes, List<LineResponse> lines, TotalsResponse totals,
                                BigDecimal amountPaid, BigDecimal balanceDue, List<PaymentDto> payments,
                                Long quoteId, String quoteNumber, Instant issuedAt, Instant cancelledAt,
                                String createdBy, Instant createdAt) {
    }

    public record InvoiceRequest(
            @NotNull(message = "Le client est obligatoire") Long clientId,
            LocalDate issueDate,
            LocalDate dueDate,
            @Size(max = 200) String subject,
            @Size(max = 2000) String notes,
            @NotEmpty(message = "Ajoutez au moins une ligne") @Valid List<LineRequest> lines) {
    }

    public record PaymentDto(Long id, LocalDate paymentDate, BigDecimal amount, PaymentMethod method,
                             String reference, String notes, String createdBy) {
        public static PaymentDto of(Payment p) {
            return new PaymentDto(p.getId(), p.getPaymentDate(), p.getAmount(), p.getMethod(), p.getReference(),
                    p.getNotes(), p.getCreatedBy());
        }
    }

    public record PaymentRequest(
            LocalDate paymentDate,
            @NotNull(message = "Le montant est obligatoire") @Positive(message = "Le montant doit être positif") BigDecimal amount,
            @NotNull(message = "Le mode de règlement est obligatoire") PaymentMethod method,
            @Size(max = 80) String reference,
            @Size(max = 500) String notes) {
    }

    public record CancelRequest(@Size(max = 500) String reason) {
    }
}
