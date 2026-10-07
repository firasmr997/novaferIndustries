package tn.novafer.erp.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.QuoteStatus;
import tn.novafer.erp.web.dto.CommonDtos.LineRequest;
import tn.novafer.erp.web.dto.CommonDtos.LineResponse;
import tn.novafer.erp.web.dto.CommonDtos.PartyDto;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.CommonDtos.TotalsResponse;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class QuoteDtos {

    private QuoteDtos() {
    }

    public record QuoteSummary(Long id, String number, Ref client, LocalDate issueDate, LocalDate validUntil,
                               QuoteStatus status, String subject, BigDecimal totalHt, BigDecimal totalTtc,
                               Long convertedInvoiceId) {
    }

    public record QuoteDetail(Long id, String number, PartyDto client, LocalDate issueDate, LocalDate validUntil,
                              QuoteStatus status, String subject, String notes, List<LineResponse> lines,
                              TotalsResponse totals, Long convertedInvoiceId, String convertedInvoiceNumber,
                              String createdBy, Instant createdAt, Instant updatedAt) {
    }

    public record QuoteRequest(
            @NotNull(message = "Le client est obligatoire") Long clientId,
            LocalDate issueDate,
            LocalDate validUntil,
            @Size(max = 200) String subject,
            @Size(max = 2000) String notes,
            @NotEmpty(message = "Ajoutez au moins une ligne") @Valid List<LineRequest> lines) {
    }

    public enum QuoteAction { SEND, ACCEPT, REFUSE, REOPEN }

    public record QuoteStatusRequest(@NotNull QuoteAction action) {
    }
}
