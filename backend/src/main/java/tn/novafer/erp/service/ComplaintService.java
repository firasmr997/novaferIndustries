package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.Complaint;
import tn.novafer.erp.domain.ComplaintEvent;
import tn.novafer.erp.domain.ComplaintPriority;
import tn.novafer.erp.domain.ComplaintStatus;
import tn.novafer.erp.domain.ComplaintType;
import tn.novafer.erp.domain.Invoice;
import tn.novafer.erp.repository.ComplaintRepository;
import tn.novafer.erp.repository.InvoiceRepository;
import tn.novafer.erp.repository.ProductRepository;
import tn.novafer.erp.repository.UserRepository;
import tn.novafer.erp.security.CurrentUser;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintDetail;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintRequest;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintSummary;
import tn.novafer.erp.web.dto.ComplaintDtos.EventDto;
import tn.novafer.erp.web.dto.ComplaintDtos.StatusChangeRequest;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Réclamation lifecycle: OUVERTE → EN_COURS → RESOLUE → CLOTUREE, every step written to its history. */
@Service
@RequiredArgsConstructor
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final InvoiceRepository invoiceRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ClientService clientService;
    private final NumberingService numberingService;

    @Transactional(readOnly = true)
    public PageResponse<ComplaintSummary> search(String q, ComplaintStatus status, boolean activeOnly,
                                                 ComplaintPriority priority, ComplaintType type, Long clientId,
                                                 Pageable pageable) {
        return PageResponse.from(complaintRepository.search(q == null ? "" : q.trim(), status, activeOnly, priority,
                type, clientId, pageable), ComplaintService::summary);
    }

    @Transactional(readOnly = true)
    public ComplaintDetail get(Long id) {
        return detail(load(id));
    }

    private Complaint load(Long id) {
        return complaintRepository.findDetailed(id).orElseThrow(() -> ApiException.notFound("Réclamation"));
    }

    @Transactional
    public ComplaintDetail create(ComplaintRequest r) {
        Complaint c = new Complaint();
        c.setNumber(numberingService.next(NumberingService.COMPLAINT, LocalDate.now().getYear()));
        c.setCreatedBy(CurrentUser.name());
        c.setOpenedAt(Instant.now());
        apply(c, r);
        ComplaintEvent opened = new ComplaintEvent();
        opened.setAuthor(CurrentUser.name());
        opened.setMessage("Réclamation enregistrée");
        opened.setToStatus(ComplaintStatus.OUVERTE);
        c.addEvent(opened);
        return detail(complaintRepository.save(c));
    }

    @Transactional
    public ComplaintDetail update(Long id, ComplaintRequest r) {
        Complaint c = load(id);
        if (c.getStatus() == ComplaintStatus.CLOTUREE) {
            throw ApiException.conflict("Une réclamation clôturée ne peut plus être modifiée");
        }
        apply(c, r);
        return detail(c);
    }

    private void apply(Complaint c, ComplaintRequest r) {
        Client client = clientService.client(r.clientId());
        c.setClient(client);
        if (r.invoiceId() != null) {
            Invoice invoice = invoiceRepository.findById(r.invoiceId())
                    .orElseThrow(() -> ApiException.notFound("Facture"));
            if (!invoice.getClient().getId().equals(client.getId())) {
                throw ApiException.badRequest("La facture choisie appartient à un autre client");
            }
            c.setInvoice(invoice);
        } else {
            c.setInvoice(null);
        }
        c.setProduct(r.productId() == null ? null : productRepository.findById(r.productId())
                .orElseThrow(() -> ApiException.notFound("Produit")));
        c.setSubject(r.subject().trim());
        c.setDescription(r.description().trim());
        c.setType(r.type());
        c.setPriority(r.priority());
        c.setAssignee(r.assigneeId() == null ? null : userRepository.findById(r.assigneeId())
                .orElseThrow(() -> ApiException.notFound("Utilisateur")));
        c.setEstimatedCost(r.estimatedCost() == null ? null : Money.round(r.estimatedCost()));
    }

    @Transactional
    public ComplaintDetail changeStatus(Long id, StatusChangeRequest r) {
        Complaint c = load(id);
        ComplaintStatus from = c.getStatus();
        ComplaintStatus to = r.status();
        if (from == to) {
            throw ApiException.badRequest("La réclamation est déjà à ce statut");
        }
        if (from == ComplaintStatus.CLOTUREE) {
            throw ApiException.conflict("Une réclamation clôturée ne peut plus changer de statut");
        }
        if ((to == ComplaintStatus.RESOLUE || to == ComplaintStatus.CLOTUREE)
                && blank(r.resolution()) && blank(c.getResolution())) {
            throw ApiException.badRequest("Décrivez la solution apportée avant de résoudre la réclamation");
        }
        if (!blank(r.resolution())) {
            c.setResolution(r.resolution().trim());
        }
        Instant now = Instant.now();
        switch (to) {
            case RESOLUE -> c.setResolvedAt(now);
            case CLOTUREE -> {
                if (c.getResolvedAt() == null) c.setResolvedAt(now);
                c.setClosedAt(now);
            }
            case OUVERTE, EN_COURS -> {
                c.setResolvedAt(null);
                c.setClosedAt(null);
            }
        }
        c.setStatus(to);
        ComplaintEvent event = new ComplaintEvent();
        event.setAuthor(CurrentUser.name());
        event.setFromStatus(from);
        event.setToStatus(to);
        event.setMessage(blank(r.comment()) ? null : r.comment().trim());
        c.addEvent(event);
        return detail(c);
    }

    @Transactional
    public ComplaintDetail comment(Long id, String message) {
        Complaint c = load(id);
        ComplaintEvent event = new ComplaintEvent();
        event.setAuthor(CurrentUser.name());
        event.setMessage(message.trim());
        c.addEvent(event);
        return detail(c);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static long ageDays(Complaint c) {
        Instant end = c.getClosedAt() != null ? c.getClosedAt()
                : c.getResolvedAt() != null ? c.getResolvedAt() : Instant.now();
        return ChronoUnit.DAYS.between(c.getOpenedAt(), end);
    }

    static ComplaintSummary summary(Complaint c) {
        return new ComplaintSummary(c.getId(), c.getNumber(), Ref.of(c.getClient()), c.getSubject(), c.getType(),
                c.getPriority(), c.getStatus(), Ref.of(c.getAssignee()), c.getOpenedAt(), ageDays(c),
                c.getInvoice() == null ? null : c.getInvoice().getNumber(),
                c.getProduct() == null ? null : c.getProduct().getReference());
    }

    private static ComplaintDetail detail(Complaint c) {
        return new ComplaintDetail(c.getId(), c.getNumber(), Ref.of(c.getClient()), c.getSubject(), c.getDescription(),
                c.getType(), c.getPriority(), c.getStatus(), Ref.of(c.getAssignee()),
                c.getInvoice() == null ? null : c.getInvoice().getId(),
                c.getInvoice() == null ? null : c.getInvoice().getNumber(),
                c.getProduct() == null ? null : c.getProduct().getId(),
                c.getProduct() == null ? null : c.getProduct().getReference(),
                c.getProduct() == null ? null : c.getProduct().getName(),
                c.getResolution(), c.getEstimatedCost(), c.getOpenedAt(), c.getResolvedAt(), c.getClosedAt(),
                ageDays(c), c.getCreatedBy(), c.getEvents().stream().map(EventDto::of).toList());
    }
}
