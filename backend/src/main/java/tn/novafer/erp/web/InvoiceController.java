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
import tn.novafer.erp.domain.InvoiceStatus;
import tn.novafer.erp.service.InvoiceService;
import tn.novafer.erp.web.dto.InvoiceDtos.CancelRequest;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceDetail;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceRequest;
import tn.novafer.erp.web.dto.InvoiceDtos.InvoiceSummary;
import tn.novafer.erp.web.dto.InvoiceDtos.PaymentRequest;

@Tag(name = "Factures")
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public PageResponse<InvoiceSummary> search(@RequestParam(required = false) String q,
                                               @RequestParam(required = false) InvoiceStatus status,
                                               @RequestParam(required = false) Long clientId,
                                               @RequestParam(defaultValue = "false") boolean overdue,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "25") int size,
                                               @RequestParam(defaultValue = "issueDate") String sort,
                                               @RequestParam(defaultValue = "desc") String dir) {
        return invoiceService.search(q, status, clientId, overdue, PageRequest.of(page, Paging.size(size),
                Paging.sort(sort, dir, "issueDate", "issueDate", "number", "dueDate", "totalTtc")));
    }

    @GetMapping("/{id}")
    public InvoiceDetail get(@PathVariable Long id) {
        return invoiceService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceDetail create(@Valid @RequestBody InvoiceRequest request) {
        return invoiceService.create(request);
    }

    @PutMapping("/{id}")
    public InvoiceDetail update(@PathVariable Long id, @Valid @RequestBody InvoiceRequest request) {
        return invoiceService.update(id, request);
    }

    @PostMapping("/{id}/issue")
    public InvoiceDetail issue(@PathVariable Long id) {
        return invoiceService.issue(id);
    }

    @PostMapping("/{id}/cancel")
    public InvoiceDetail cancel(@PathVariable Long id, @Valid @RequestBody(required = false) CancelRequest request) {
        return invoiceService.cancel(id, request == null ? null : request.reason());
    }

    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceDetail addPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return invoiceService.addPayment(id, request);
    }

    @DeleteMapping("/{id}/payments/{paymentId}")
    public InvoiceDetail deletePayment(@PathVariable Long id, @PathVariable Long paymentId) {
        return invoiceService.deletePayment(id, paymentId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        invoiceService.delete(id);
    }
}
