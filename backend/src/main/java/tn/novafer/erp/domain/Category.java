package tn.novafer.erp.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "categories")
public class Category extends BaseEntity {

    @Column(nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    private String description;
}
