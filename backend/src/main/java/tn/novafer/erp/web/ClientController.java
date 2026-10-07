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
import tn.novafer.erp.service.ClientService;
import tn.novafer.erp.web.dto.ClientDtos.ClientDetail;
import tn.novafer.erp.web.dto.ClientDtos.ClientDto;
import tn.novafer.erp.web.dto.ClientDtos.ClientRequest;

@Tag(name = "Clients")
@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public PageResponse<ClientDto> search(@RequestParam(required = false) String q,
                                          @RequestParam(defaultValue = "false") boolean includeInactive,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "25") int size,
                                          @RequestParam(defaultValue = "companyName") String sort,
                                          @RequestParam(defaultValue = "asc") String dir) {
        return clientService.search(q, includeInactive, PageRequest.of(page, Paging.size(size),
                Paging.sort(sort, dir, "companyName", "companyName", "code", "city", "createdAt")));
    }

    @GetMapping("/{id}")
    public ClientDetail get(@PathVariable Long id) {
        return clientService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientDto create(@Valid @RequestBody ClientRequest request) {
        return clientService.create(request);
    }

    @PutMapping("/{id}")
    public ClientDto update(@PathVariable Long id, @Valid @RequestBody ClientRequest request) {
        return clientService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable Long id) {
        clientService.archive(id);
    }
}
