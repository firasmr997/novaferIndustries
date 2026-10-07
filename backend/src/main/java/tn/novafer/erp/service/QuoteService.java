package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.CompanySettings;
import tn.novafer.erp.domain.Quote;
import tn.novafer.erp.domain.QuoteLine;
import tn.novafer.erp.domain.QuoteStatus;
import tn.novafer.erp.repository.InvoiceRepository;
import tn.novafer.erp.repository.QuoteRepository;
import tn.novafer.erp.security.CurrentUser;
import tn.novafer.erp.web.dto.CommonDtos.LineResponse;
import tn.novafer.erp.web.dto.CommonDtos.PartyDto;
import tn.novafer.erp.web.dto.CommonDtos.Ref;
import tn.novafer.erp.web.dto.CommonDtos.TotalsResponse;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteAction;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteDetail;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteRequest;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteSummary;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Devis lifecycle: BROUILLON → ENVOYE → ACCEPTE / REFUSE / EXPIRE, and ACCEPTE → FACTURE on conversion. */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final ClientService clientService;
    private final SettingsService settingsService;
    private final NumberingService numberingService;
    private final LineFactory lineFactory;
    private final DocumentCalculator calculator;

    @Transactional(readOnly = true)
    public PageResponse<QuoteSummary> search(String q, QuoteStatus status, Long clientId, Pageable pageable) {
        return PageResponse.from(quoteRepository.search(q == null ? "" : q.trim(), status, clientId, pageable),
                QuoteService::summary);
    }

    @Transactional(readOnly = true)
    public QuoteDetail get(Long id) {
        return detail(load(id));
    }

    Quote load(Long id) {
        return quoteRepository.findDetailed(id).orElseThrow(() -> ApiException.notFound("Devis"));
    }

    @Transactional
    public QuoteDetail create(QuoteRequest r) {
        CompanySettings settings = settingsService.current();
        Quote quote = new Quote();
        LocalDate issueDate = r.issueDate() != null ? r.issueDate() : LocalDate.now();
        quote.setNumber(numberingService.next(NumberingService.QUOTE, issueDate.getYear()));
        quote.setCreatedBy(CurrentUser.name());
        apply(quote, r, issueDate, settings);
        return detail(quoteRepository.save(quote));
    }

    @Transactional
    public QuoteDetail update(Long id, QuoteRequest r) {
        Quote quote = load(id);
        if (quote.getStatus() != QuoteStatus.BROUILLON && quote.getStatus() != QuoteStatus.ENVOYE) {
            throw ApiException.conflict("Seul un devis en brouillon ou envoyé peut être modifié");
        }
        apply(quote, r, r.issueDate() != null ? r.issueDate() : quote.getIssueDate(), settingsService.current());
        return detail(quote);
    }

    private void apply(Quote quote, QuoteRequest r, LocalDate issueDate, CompanySettings settings) {
        Client client = clientService.client(r.clientId());
        quote.setClient(client);
        quote.setIssueDate(issueDate);
        LocalDate validUntil = r.validUntil() != null ? r.validUntil()
                : issueDate.plusDays(settings.getQuoteValidityDays());
        if (validUntil.isBefore(issueDate)) {
            throw ApiException.badRequest("La date de validité précède la date du devis");
        }
        quote.setValidUntil(validUntil);
        quote.setSubject(r.subject());
        quote.setNotes(r.notes());
        quote.replaceLines(lineFactory.build(r.lines(), client, QuoteLine::new));
        calculator.apply(quote, settingsService.fodecRateFor(client));
    }

    @Transactional
    public QuoteDetail changeStatus(Long id, QuoteAction action) {
        Quote quote = load(id);
        QuoteStatus current = quote.getStatus();
        QuoteStatus next = switch (action) {
            case SEND -> require(current, QuoteStatus.ENVOYE, QuoteStatus.BROUILLON);
            case ACCEPT -> require(current, QuoteStatus.ACCEPTE, QuoteStatus.ENVOYE, QuoteStatus.BROUILLON);
            case REFUSE -> require(current, QuoteStatus.REFUSE, QuoteStatus.ENVOYE, QuoteStatus.ACCEPTE);
            case REOPEN -> require(current, QuoteStatus.BROUILLON, QuoteStatus.REFUSE, QuoteStatus.EXPIRE);
        };
        if (action == QuoteAction.REOPEN && quote.getValidUntil().isBefore(LocalDate.now())) {
            quote.setValidUntil(LocalDate.now().plusDays(settingsService.current().getQuoteValidityDays()));
        }
        quote.setStatus(next);
        return detail(quote);
    }

    private static QuoteStatus require(QuoteStatus current, QuoteStatus next, QuoteStatus... allowedFrom) {
        for (QuoteStatus allowed : allowedFrom) {
            if (current == allowed) {
                return next;
            }
        }
        throw ApiException.conflict("Action impossible pour un devis au statut " + current.name().toLowerCase());
    }

    @Transactional
    public QuoteDetail duplicate(Long id) {
        Quote source = load(id);
        Quote copy = new Quote();
        LocalDate today = LocalDate.now();
        copy.setNumber(numberingService.next(NumberingService.QUOTE, today.getYear()));
        copy.setCreatedBy(CurrentUser.name());
        copy.setClient(source.getClient());
        copy.setIssueDate(today);
        copy.setValidUntil(today.plusDays(settingsService.current().getQuoteValidityDays()));
        copy.setSubject(source.getSubject());
        copy.setNotes(source.getNotes());
        copy.replaceLines(source.getLines().stream().map(l -> LineFactory.copy(l, QuoteLine::new)).toList());
        calculator.apply(copy, settingsService.fodecRateFor(copy.getClient()));
        return detail(quoteRepository.save(copy));
    }

    @Transactional
    public void delete(Long id) {
        Quote quote = load(id);
        if (quote.getStatus() != QuoteStatus.BROUILLON) {
            throw ApiException.conflict("Seul un devis en brouillon peut être supprimé");
        }
        quoteRepository.delete(quote);
    }

    /** Daily at 01:00, and once at startup through the demo seeder. */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void expireOutdated() {
        int expired = quoteRepository.expireOutdated(LocalDate.now());
        if (expired > 0) {
            log.info("{} devis expired", expired);
        }
    }

    static QuoteSummary summary(Quote q) {
        return new QuoteSummary(q.getId(), q.getNumber(), Ref.of(q.getClient()), q.getIssueDate(), q.getValidUntil(),
                q.getStatus(), q.getSubject(), q.getTotalHt(), q.getTotalTtc(), q.getConvertedInvoiceId());
    }

    QuoteDetail detail(Quote q) {
        String invoiceNumber = q.getConvertedInvoiceId() == null ? null
                : invoiceRepository.findById(q.getConvertedInvoiceId()).map(i -> i.getNumber()).orElse(null);
        TotalsResponse totals = new TotalsResponse(q.getTotalHt(), q.getTotalDiscount(), q.getFodecRate(),
                q.getTotalFodec(), q.getTotalVat(), BigDecimal.ZERO.setScale(3), q.getTotalTtc(),
                calculator.vatBreakdown(q.getLines(), q.getFodecRate()));
        return new QuoteDetail(q.getId(), q.getNumber(), PartyDto.of(q.getClient()), q.getIssueDate(),
                q.getValidUntil(), q.getStatus(), q.getSubject(), q.getNotes(),
                q.getLines().stream().map(LineResponse::of).toList(), totals, q.getConvertedInvoiceId(),
                invoiceNumber, q.getCreatedBy(), q.getCreatedAt(), q.getUpdatedAt());
    }
}
