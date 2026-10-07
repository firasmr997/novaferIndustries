package tn.novafer.erp.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.ApiException;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.common.PageResponse;
import tn.novafer.erp.domain.Category;
import tn.novafer.erp.domain.Product;
import tn.novafer.erp.domain.StockMovementType;
import tn.novafer.erp.repository.CategoryRepository;
import tn.novafer.erp.repository.ProductRepository;
import tn.novafer.erp.web.dto.CatalogueDtos.CategoryDto;
import tn.novafer.erp.web.dto.CatalogueDtos.CategoryRequest;
import tn.novafer.erp.web.dto.CatalogueDtos.ProductDto;
import tn.novafer.erp.web.dto.CatalogueDtos.ProductRequest;

import java.math.BigDecimal;
import java.util.List;

/** Product catalogue and its categories. */
@Service
@RequiredArgsConstructor
public class CatalogueService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;

    // ---- Categories ----

    @Transactional(readOnly = true)
    public List<CategoryDto> categories() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(c -> CategoryDto.of(c, productRepository.countByCategoryId(c.getId())))
                .toList();
    }

    @Transactional
    public CategoryDto createCategory(CategoryRequest r) {
        if (categoryRepository.existsByCodeIgnoreCase(r.code().trim())) {
            throw ApiException.conflict("Ce code de catégorie existe déjà");
        }
        Category c = new Category();
        applyCategory(c, r);
        return CategoryDto.of(categoryRepository.save(c), 0);
    }

    @Transactional
    public CategoryDto updateCategory(Long id, CategoryRequest r) {
        Category c = categoryRepository.findById(id).orElseThrow(() -> ApiException.notFound("Catégorie"));
        if (categoryRepository.existsByCodeIgnoreCaseAndIdNot(r.code().trim(), id)) {
            throw ApiException.conflict("Ce code de catégorie existe déjà");
        }
        applyCategory(c, r);
        return CategoryDto.of(c, productRepository.countByCategoryId(id));
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (productRepository.countByCategoryId(id) > 0) {
            throw ApiException.conflict("Cette catégorie contient des produits : déplacez-les d'abord");
        }
        categoryRepository.deleteById(id);
    }

    private static void applyCategory(Category c, CategoryRequest r) {
        c.setCode(r.code().trim().toUpperCase());
        c.setName(r.name().trim());
        c.setDescription(r.description());
    }

    // ---- Products ----

    @Transactional(readOnly = true)
    public PageResponse<ProductDto> searchProducts(String q, Long categoryId, boolean lowStockOnly,
                                                   boolean includeInactive, Pageable pageable) {
        return PageResponse.from(productRepository.search(q == null ? "" : q.trim(), categoryId, lowStockOnly,
                includeInactive, pageable), ProductDto::of);
    }

    @Transactional(readOnly = true)
    public ProductDto getProduct(Long id) {
        return ProductDto.of(product(id));
    }

    public Product product(Long id) {
        return productRepository.findById(id).orElseThrow(() -> ApiException.notFound("Produit"));
    }

    @Transactional
    public ProductDto createProduct(ProductRequest r) {
        if (productRepository.existsByReferenceIgnoreCase(r.reference().trim())) {
            throw ApiException.conflict("Cette référence existe déjà");
        }
        Product p = new Product();
        applyProduct(p, r);
        productRepository.save(p);
        BigDecimal initial = Money.nz(r.initialStock());
        if (initial.signum() > 0) {
            stockService.move(p, StockMovementType.ENTREE, initial, "Stock initial", null);
        }
        return ProductDto.of(p);
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductRequest r) {
        Product p = product(id);
        if (productRepository.existsByReferenceIgnoreCaseAndIdNot(r.reference().trim(), id)) {
            throw ApiException.conflict("Cette référence existe déjà");
        }
        applyProduct(p, r);
        return ProductDto.of(p);
    }

    /** Products appear on past documents, so they are archived rather than deleted. */
    @Transactional
    public void archiveProduct(Long id) {
        product(id).setActive(false);
    }

    private void applyProduct(Product p, ProductRequest r) {
        p.setReference(r.reference().trim().toUpperCase());
        p.setName(r.name().trim());
        p.setDescription(r.description());
        p.setCategory(r.categoryId() == null ? null
                : categoryRepository.findById(r.categoryId()).orElseThrow(() -> ApiException.notFound("Catégorie")));
        p.setMaterial(r.material());
        p.setUnit(r.unit().trim());
        p.setUnitPrice(Money.round(r.unitPrice()));
        p.setCostPrice(Money.round(Money.nz(r.costPrice())));
        p.setVatRate(SettingsService.requireVatRate(r.vatRate()));
        p.setMinStock(Money.round(Money.nz(r.minStock())));
        if (r.active() != null) {
            p.setActive(r.active());
        }
    }
}
