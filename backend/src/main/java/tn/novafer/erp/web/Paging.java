package tn.novafer.erp.web;

import org.springframework.data.domain.Sort;

import java.util.Set;

/** Request paging helpers: bounded page sizes and a whitelist of sortable properties. */
final class Paging {

    private static final int MAX_SIZE = 200;

    private Paging() {
    }

    static int size(int requested) {
        return Math.max(1, Math.min(requested, MAX_SIZE));
    }

    static Sort sort(String property, String direction, String fallback, String... allowed) {
        String chosen = Set.of(allowed).contains(property) ? property : fallback;
        Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = Sort.by(dir, chosen);
        return chosen.equals("id") ? sort : sort.and(Sort.by(Sort.Direction.DESC, "id"));
    }
}
