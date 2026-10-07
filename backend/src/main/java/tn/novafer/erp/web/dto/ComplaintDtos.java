package tn.novafer.erp.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import tn.novafer.erp.domain.ComplaintEvent;
import tn.novafer.erp.domain.ComplaintPriority;
import tn.novafer.erp.domain.ComplaintStatus;
import tn.novafer.erp.domain.ComplaintType;
import tn.novafer.erp.web.dto.CommonDtos.Ref;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ComplaintDtos {

    private ComplaintDtos() {
    }

    public record ComplaintSummary(Long id, String number, Ref client, String subject, ComplaintType type,
                                   ComplaintPriority priority, ComplaintStatus status, Ref assignee,
                                   Instant openedAt, long ageDays, String invoiceNumber, String productReference) {
    }

    public record ComplaintDetail(Long id, String number, Ref client, String subject, String description,
                                  ComplaintType type, ComplaintPriority priority, ComplaintStatus status,
                                  Ref assignee, Long invoiceId, String invoiceNumber, Long productId,
                                  String productReference, String productName, String resolution,
                                  BigDecimal estimatedCost, Instant openedAt, Instant resolvedAt, Instant closedAt,
                                  long ageDays, String createdBy, List<EventDto> events) {
    }

    public record EventDto(Long id, String author, String message, ComplaintStatus fromStatus,
                           ComplaintStatus toStatus, Instant createdAt) {
        public static EventDto of(ComplaintEvent e) {
            return new EventDto(e.getId(), e.getAuthor(), e.getMessage(), e.getFromStatus(), e.getToStatus(),
                    e.getCreatedAt());
        }
    }

    public record ComplaintRequest(
            @NotNull(message = "Le client est obligatoire") Long clientId,
            Long invoiceId,
            Long productId,
            @NotBlank(message = "L'objet est obligatoire") @Size(max = 200) String subject,
            @NotBlank(message = "La description est obligatoire") @Size(max = 4000) String description,
            @NotNull(message = "Le type est obligatoire") ComplaintType type,
            @NotNull(message = "La priorité est obligatoire") ComplaintPriority priority,
            Long assigneeId,
            @PositiveOrZero BigDecimal estimatedCost) {
    }

    public record StatusChangeRequest(
            @NotNull(message = "Le statut est obligatoire") ComplaintStatus status,
            @Size(max = 4000) String comment,
            @Size(max = 4000) String resolution) {
    }

    public record CommentRequest(@NotBlank(message = "Le commentaire est vide") @Size(max = 4000) String message) {
    }
}
