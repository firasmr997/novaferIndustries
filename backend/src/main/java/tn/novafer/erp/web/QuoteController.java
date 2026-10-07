package tn.novafer.erp.web;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.QuoteStatus;
import tn.novafer.erp.service.InvoiceService;
import tn.novafer.erp.service.QuoteService;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceDetail;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteDetail;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteRequest;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteStatusRequest;
import tn.novafer.erp.web.dto.QuoteDtos.QuoteSummary;

@Tag(name = "Devis")
@RestController
@RequestMapping("/api/quotes")
@RequiredArgsConstructor
public class QuoteController {

    private final QuoteService quoteService;
    private final InvoiceService invoiceService;

    @GetMapping
    public PageResponse<QuoteSummary> search(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) QuoteStatus status,
                                             @RequestParam(required = false) Long clientId,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size,
                                             @RequestParam(defaultValue = "issueDate") String sort,
                                             @RequestParam(defaultValue = "desc") String dir) {
        return quoteService.search(q, status, clientId, PageRequest.of(page, Paging.size(size),
                Paging.sort(sort, dir, "issueDate", "issueDate", "number", "validUntil", "totalTtc")));
    }

    @GetMapping("/{id}")
    public QuoteDetail get(@PathVariable Long id) {
        return quoteService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuoteDetail create(@Valid @RequestBody QuoteRequest request) {
        return quoteService.create(request);
    }

    @PutMapping("/{id}")
    public QuoteDetail update(@PathVariable Long id, @Valid @RequestBody QuoteRequest request) {
        return quoteService.update(id, request);
    }

    @PostMapping("/{id}/status")
    public QuoteDetail changeStatus(@PathVariable Long id, @Valid @RequestBody QuoteStatusRequest request) {
        return quoteService.changeStatus(id, request.action());
    }

    @PostMapping("/{id}/duplicate")
    @ResponseStatus(HttpStatus.CREATED)
    public QuoteDetail duplicate(@PathVariable Long id) {
        return quoteService.duplicate(id);
    }

    /** Creates a draft facture from the devis. */
    @PostMapping("/{id}/convert")
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceDetail convert(@PathVariable Long id) {
        return invoiceService.createFromQuote(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        quoteService.delete(id);
    }
}
