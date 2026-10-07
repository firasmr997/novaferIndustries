package tn.novafer.erp.web;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
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
import tn.novafer.erp.domain.ComplaintPriority;
import tn.novafer.erp.domain.ComplaintStatus;
import tn.novafer.erp.domain.ComplaintType;
import tn.novafer.erp.service.ComplaintService;
import tn.novafer.erp.web.dto.ComplaintDtos.CommentRequest;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintDetail;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintRequest;
import tn.novafer.erp.web.dto.ComplaintDtos.ComplaintSummary;
import tn.novafer.erp.web.dto.ComplaintDtos.StatusChangeRequest;

@Tag(name = "Réclamations")
@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;

    @GetMapping
    public PageResponse<ComplaintSummary> search(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) ComplaintStatus status,
                                                 @RequestParam(defaultValue = "false") boolean active,
                                                 @RequestParam(required = false) ComplaintPriority priority,
                                                 @RequestParam(required = false) ComplaintType type,
                                                 @RequestParam(required = false) Long clientId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "25") int size,
                                                 @RequestParam(defaultValue = "openedAt") String sort,
                                                 @RequestParam(defaultValue = "desc") String dir) {
        return complaintService.search(q, status, active, priority, type, clientId, PageRequest.of(page,
                Paging.size(size), Paging.sort(sort, dir, "openedAt", "openedAt", "number", "priority", "status")));
    }

    @GetMapping("/{id}")
    public ComplaintDetail get(@PathVariable Long id) {
        return complaintService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ComplaintDetail create(@Valid @RequestBody ComplaintRequest request) {
        return complaintService.create(request);
    }

    @PutMapping("/{id}")
    public ComplaintDetail update(@PathVariable Long id, @Valid @RequestBody ComplaintRequest request) {
        return complaintService.update(id, request);
    }

    @PostMapping("/{id}/status")
    public ComplaintDetail changeStatus(@PathVariable Long id, @Valid @RequestBody StatusChangeRequest request) {
        return complaintService.changeStatus(id, request);
    }

    @PostMapping("/{id}/comments")
    public ComplaintDetail comment(@PathVariable Long id, @Valid @RequestBody CommentRequest request) {
        return complaintService.comment(id, request.message());
    }
}
