package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.CompanySettings;
import tn.novafer.erp.domain.Invoice;
import tn.novafer.erp.domain.InvoiceLine;
import tn.novafer.erp.domain.InvoiceStatus;
import tn.novafer.erp.domain.Payment;
import tn.novafer.erp.domain.Quote;
import tn.novafer.erp.domain.QuoteStatus;
import tn.novafer.erp.domain.StockMovementType;
import tn.novafer.erp.repository.InvoiceRepository;
import tn.novafer.erp.security.CurrentUser;
import tn.novafer.erp.web.dto.CommonDtos.LineResponse;
import tn.novafer.erp.web.dto.CommonDtos.PartyDto;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.CommonDtos.TotalsResponse;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceDetail;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceRequest;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceSummary;
import tn.novafer.erp.web.dto.InvoiceDtos.PaymentDto;
import tn.novafer.erp.web.dto.InvoiceDtos.PaymentRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Facture lifecycle: BROUILLON → EMISE → PARTIELLEMENT_PAYEE → PAYEE, or EMISE → ANNULEE.
 * Issuing assigns the legal number, adds the timbre fiscal and takes the goods out of stock.
 */
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final QuoteService quoteService;
    private final ClientService clientService;
    private final SettingsService settingsService;
    private final NumberingService numberingService;
    private final StockService stockService;
    private final LineFactory lineFactory;
    private final DocumentCalculator calculator;

    @Transactional(readOnly = true)
    public PageResponse<InvoiceSummary> search(String q, InvoiceStatus status, Long clientId, boolean overdueOnly,
                                               Pageable pageable) {
        LocalDate today = LocalDate.now();
        return PageResponse.from(invoiceRepository.search(q == null ? "" : q.trim(), status, clientId, overdueOnly,
                today, pageable), i -> summary(i, today));
    }

    @Transactional(readOnly = true)
    public InvoiceDetail get(Long id) {
        return detail(load(id));
    }

    private Invoice load(Long id) {
        return invoiceRepository.findDetailed(id).orElseThrow(() -> ApiException.notFound("Facture"));
    }

    @Transactional
    public InvoiceDetail create(InvoiceRequest r) {
        Invoice invoice = new Invoice();
        invoice.setCreatedBy(CurrentUser.name());
        apply(invoice, r);
        return detail(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceDetail update(Long id, InvoiceRequest r) {
        Invoice invoice = load(id);
        requireDraft(invoice, "modifiée");
        apply(invoice, r);
        return detail(invoice);
    }

    private void apply(Invoice invoice, InvoiceRequest r) {
        Client client = clientService.client(r.clientId());
        LocalDate issueDate = r.issueDate() != null ? r.issueDate() : LocalDate.now();
        LocalDate dueDate = r.dueDate() != null ? r.dueDate() : issueDate.plusDays(client.getPaymentTermsDays());
        if (dueDate.isBefore(issueDate)) {
            throw ApiException.badRequest("L'échéance précède la date de facture");
        }
        invoice.setClient(client);
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(dueDate);
        invoice.setSubject(r.subject());
        invoice.setNotes(r.notes());
        invoice.replaceLines(lineFactory.build(r.lines(), client, InvoiceLine::new));
        recompute(invoice, settingsService.current());
    }

    private void recompute(Invoice invoice, CompanySettings settings) {
        BigDecimal ttcBeforeStamp = calculator.apply(invoice, settingsService.fodecRateFor(invoice.getClient()));
        invoice.setFiscalStamp(Money.round(settings.getFiscalStamp()));
        invoice.setTotalTtc(Money.round(ttcBeforeStamp.add(invoice.getFiscalStamp())));
    }

    /** Converts an accepted (or sent) devis into a draft facture with the same lines. */
    @Transactional
    public InvoiceDetail createFromQuote(Long quoteId) {
        Quote quote = quoteService.load(quoteId);
        if (quote.getStatus() == QuoteStatus.FACTURE) {
            throw ApiException.conflict("Ce devis a déjà été facturé");
        }
        if (quote.getStatus() != QuoteStatus.ACCEPTE && quote.getStatus() != QuoteStatus.ENVOYE) {
            throw ApiException.conflict("Seul un devis envoyé ou accepté peut être facturé");
        }
        Invoice invoice = new Invoice();
        invoice.setCreatedBy(CurrentUser.name());
        invoice.setClient(quote.getClient());
        invoice.setQuote(quote);
        LocalDate today = LocalDate.now();
        invoice.setIssueDate(today);
        invoice.setDueDate(today.plusDays(quote.getClient().getPaymentTermsDays()));
        invoice.setSubject(quote.getSubject());
        invoice.setNotes(quote.getNotes());
        invoice.replaceLines(quote.getLines().stream().map(l -> LineFactory.copy(l, InvoiceLine::new)).toList());
        recompute(invoice, settingsService.current());
        invoiceRepository.save(invoice);
        quote.setStatus(QuoteStatus.FACTURE);
        quote.setConvertedInvoiceId(invoice.getId());
        return detail(invoice);
    }

    @Transactional
    public InvoiceDetail issue(Long id) {
        Invoice invoice = load(id);
        requireDraft(invoice, "émise");
        CompanySettings settings = settingsService.current();
        recompute(invoice, settings);
        invoice.setNumber(numberingService.next(NumberingService.INVOICE, invoice.getIssueDate().getYear()));
        invoice.setStatus(InvoiceStatus.EMISE);
        invoice.setIssuedAt(Instant.now());
        invoice.getLines().stream().filter(l -> l.getProduct() != null).forEach(l ->
                stockService.move(l.getProduct(), StockMovementType.SORTIE, l.getQuantity().negate(),
                        "Livraison " + invoice.getClient().getCompanyName(), invoice.getNumber()));
        return detail(invoice);
    }

    /** Cancels an issued facture without payments and returns its goods to stock. The number stays used. */
    @Transactional
    public InvoiceDetail cancel(Long id, String reason) {
        Invoice invoice = load(id);
        if (invoice.getStatus() != InvoiceStatus.EMISE) {
            throw ApiException.conflict(invoice.getAmountPaid().signum() > 0
                    ? "Une facture réglée ne peut pas être annulée : supprimez d'abord les règlements"
                    : "Seule une facture émise peut être annulée");
        }
        invoice.setStatus(InvoiceStatus.ANNULEE);
        invoice.setCancelledAt(Instant.now());
        if (reason != null && !reason.isBlank()) {
            invoice.setNotes((invoice.getNotes() == null ? "" : invoice.getNotes() + "\n") + "Annulée : " + reason.trim());
        }
        invoice.getLines().stream().filter(l -> l.getProduct() != null).forEach(l ->
                stockService.move(l.getProduct(), StockMovementType.ENTREE, l.getQuantity(),
                        "Annulation facture", invoice.getNumber()));
        return detail(invoice);
    }

    @Transactional
    public void delete(Long id) {
        Invoice invoice = load(id);
        requireDraft(invoice, "supprimée");
        if (invoice.getQuote() != null) {
            invoice.getQuote().setStatus(QuoteStatus.ACCEPTE);
            invoice.getQuote().setConvertedInvoiceId(null);
        }
        invoiceRepository.delete(invoice);
    }

    @Transactional
    public InvoiceDetail addPayment(Long id, PaymentRequest r) {
        Invoice invoice = load(id);
        if (!invoice.getStatus().isOpen()) {
            throw ApiException.conflict("Seule une facture émise et non soldée peut recevoir un règlement");
        }
        BigDecimal amount = Money.round(r.amount());
        if (amount.compareTo(invoice.getBalanceDue()) > 0) {
            throw ApiException.badRequest("Le montant dépasse le reste à payer (" + invoice.getBalanceDue() + " TND)");
        }
        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setPaymentDate(r.paymentDate() != null ? r.paymentDate() : LocalDate.now());
        payment.setAmount(amount);
        payment.setMethod(r.method());
        payment.setReference(r.reference());
        payment.setNotes(r.notes());
        payment.setCreatedBy(CurrentUser.name());
        invoice.getPayments().add(payment);
        settle(invoice);
        return detail(invoice);
    }

    @Transactional
    public InvoiceDetail deletePayment(Long id, Long paymentId) {
        Invoice invoice = load(id);
        boolean removed = invoice.getPayments().removeIf(p -> p.getId().equals(paymentId));
        if (!removed) {
            throw ApiException.notFound("Règlement");
        }
        settle(invoice);
        return detail(invoice);
    }

    private static void settle(Invoice invoice) {
        BigDecimal paid = invoice.getPayments().stream().map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setAmountPaid(Money.round(paid));
        if (paid.signum() == 0) {
            invoice.setStatus(InvoiceStatus.EMISE);
        } else if (paid.compareTo(invoice.getTotalTtc()) >= 0) {
            invoice.setStatus(InvoiceStatus.PAYEE);
        } else {
            invoice.setStatus(InvoiceStatus.PARTIELLEMENT_PAYEE);
        }
    }

    private static void requireDraft(Invoice invoice, String verb) {
        if (invoice.getStatus() != InvoiceStatus.BROUILLON) {
            throw ApiException.conflict("Seule une facture en brouillon peut être " + verb);
        }
    }

    static long daysOverdue(Invoice i, LocalDate today) {
        return i.isOverdue(today) ? ChronoUnit.DAYS.between(i.getDueDate(), today) : 0;
    }

    static InvoiceSummary summary(Invoice i, LocalDate today) {
        return new InvoiceSummary(i.getId(), i.getNumber(), Ref.of(i.getClient()), i.getIssueDate(), i.getDueDate(),
                i.getStatus(), i.isOverdue(today), daysOverdue(i, today), i.getSubject(), i.getTotalTtc(),
                i.getAmountPaid(), i.getBalanceDue());
    }

    private InvoiceDetail detail(Invoice i) {
        LocalDate today = LocalDate.now();
        TotalsResponse totals = new TotalsResponse(i.getTotalHt(), i.getTotalDiscount(), i.getFodecRate(),
                i.getTotalFodec(), i.getTotalVat(), i.getFiscalStamp(), i.getTotalTtc(),
                calculator.vatBreakdown(i.getLines(), i.getFodecRate()));
        return new InvoiceDetail(i.getId(), i.getNumber(), PartyDto.of(i.getClient()), i.getIssueDate(),
                i.getDueDate(), i.getStatus(), i.isOverdue(today), daysOverdue(i, today), i.getSubject(),
                i.getNotes(), i.getLines().stream().map(LineResponse::of).toList(), totals, i.getAmountPaid(),
                i.getBalanceDue(), i.getPayments().stream().map(PaymentDto::of).toList(),
                i.getQuote() == null ? null : i.getQuote().getId(),
                i.getQuote() == null ? null : i.getQuote().getNumber(), i.getIssuedAt(), i.getCancelledAt(),
                i.getCreatedBy(), i.getCreatedAt());
    }
}
