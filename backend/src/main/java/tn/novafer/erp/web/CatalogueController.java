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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.StockMovementType;
import tn.novafer.erp.service.CatalogueService;
import tn.novafer.erp.service.StockService;
import tn.novafer.erp.web.dto.CatalogueDtos.CategoryDto;
import tn.novafer.erp.web.dto.CatalogueDtos.CategoryRequest;
import tn.novafer.erp.web.dto.CatalogueDtos.ProductDto;
import tn.novafer.erp.web.dto.CatalogueDtos.ProductRequest;
import tn.novafer.erp.web.dto.CatalogueDtos.StockMovementDto;
import tn.novafer.erp.web.dto.CatalogueDtos.StockMovementRequest;

import java.util.List;

@Tag(name = "Catalogue et stock")
@RestController
@RequiredArgsConstructor
public class CatalogueController {

    private final CatalogueService catalogueService;
    private final StockService stockService;

    @GetMapping("/api/categories")
    public List<CategoryDto> categories() {
        return catalogueService.categories();
    }

    @PostMapping("/api/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest request) {
        return catalogueService.createCategory(request);
    }

    @PutMapping("/api/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return catalogueService.updateCategory(id, request);
    }

    @DeleteMapping("/api/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        catalogueService.deleteCategory(id);
    }

    @GetMapping("/api/products")
    public PageResponse<ProductDto> products(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) Long categoryId,
                                             @RequestParam(defaultValue = "false") boolean lowStock,
                                             @RequestParam(defaultValue = "false") boolean includeInactive,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size,
                                             @RequestParam(defaultValue = "reference") String sort,
                                             @RequestParam(defaultValue = "asc") String dir) {
        return catalogueService.searchProducts(q, categoryId, lowStock, includeInactive,
                PageRequest.of(page, Paging.size(size), Paging.sort(sort, dir, "reference",
                        "reference", "name", "unitPrice", "stockQuantity", "createdAt")));
    }

    @GetMapping("/api/products/{id}")
    public ProductDto product(@PathVariable Long id) {
        return catalogueService.getProduct(id);
    }

    @PostMapping("/api/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDto createProduct(@Valid @RequestBody ProductRequest request) {
        return catalogueService.createProduct(request);
    }

    @PutMapping("/api/products/{id}")
    public ProductDto updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return catalogueService.updateProduct(id, request);
    }

    @DeleteMapping("/api/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archiveProduct(@PathVariable Long id) {
        catalogueService.archiveProduct(id);
    }

    @GetMapping("/api/stock/movements")
    public PageResponse<StockMovementDto> movements(@RequestParam(required = false) Long productId,
                                                    @RequestParam(required = false) StockMovementType type,
                                                    @RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "30") int size) {
        return stockService.movements(productId, type, PageRequest.of(page, Paging.size(size),
                Paging.sort("movementDate", "desc", "movementDate", "movementDate")));
    }

    @PostMapping("/api/stock/movements")
    @ResponseStatus(HttpStatus.CREATED)
    public StockMovementDto recordMovement(@Valid @RequestBody StockMovementRequest request) {
        return stockService.record(request);
    }
}
