package tn.novafer.erp.seed;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.novafer.erp.common.Money;
import tn.novafer.erp.config.AppProperties;
import tn.novafer.erp.domain.Category;
import tn.novafer.erp.domain.Client;
import tn.novafer.erp.domain.CompanySettings;
import tn.novafer.erp.domain.Complaint;
import tn.novafer.erp.domain.ComplaintEvent;
import tn.novafer.erp.domain.ComplaintPriority;
import tn.novafer.erp.domain.ComplaintStatus;
import tn.novafer.erp.domain.ComplaintType;
import tn.novafer.erp.domain.DocumentLine;
import tn.novafer.erp.domain.Invoice;
import tn.novafer.erp.domain.InvoiceLine;
import tn.novafer.erp.domain.InvoiceStatus;
import tn.novafer.erp.domain.Payment;
import tn.novafer.erp.domain.PaymentMethod;
import tn.novafer.erp.domain.Product;
import tn.novafer.erp.domain.Quote;
import tn.novafer.erp.domain.QuoteLine;
import tn.novafer.erp.domain.QuoteStatus;
import tn.novafer.erp.domain.Role;
import tn.novafer.erp.domain.StockMovement;
import tn.novafer.erp.domain.StockMovementType;
import tn.novafer.erp.domain.User;
import tn.novafer.erp.repository.CategoryRepository;
import tn.novafer.erp.repository.ClientRepository;
import tn.novafer.erp.repository.CompanySettingsRepository;
import tn.novafer.erp.repository.ComplaintRepository;
import tn.novafer.erp.repository.InvoiceRepository;
import tn.novafer.erp.repository.ProductRepository;
import tn.novafer.erp.repository.QuoteRepository;
import tn.novafer.erp.repository.StockMovementRepository;
import tn.novafer.erp.repository.UserRepository;
import tn.novafer.erp.service.DocumentCalculator;
import tn.novafer.erp.service.LineFactory;
import tn.novafer.erp.service.NumberingService;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.Supplier;

/**
 * Development-only demo dataset: a fictional Novafer Industries with 22 months of history.
 * Every company, person and figure here is invented; none of it is a real record. Runs once, on an empty
 * database, when {@code novafer.demo.enabled} is true (the dev profile).
 */
@Slf4j
@Order(2)
@Component
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private static final ZoneId TZ = ZoneId.of("Africa/Tunis");
    /** From January of last year, so year-on-year comparisons cover a full previous year-to-date. */
    private static final int HISTORY_MONTHS = 22;

    private final AppProperties properties;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final CompanySettingsRepository settingsRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ClientRepository clientRepository;
    private final QuoteRepository quoteRepository;
    private final InvoiceRepository invoiceRepository;
    private final ComplaintRepository complaintRepository;
    private final StockMovementRepository movementRepository;
    private final NumberingService numberingService;
    private final DocumentCalculator calculator;

    private final Random random = new Random(2026);
    private final LocalDate today = LocalDate.now(TZ);
    private final Map<Long, ProductSpec> specs = new HashMap<>();

    private record ProductSpec(int minQty, int maxQty) {
    }

    private record ClientSpec(String name, String contact, String city, String address, String sector, int terms,
                              boolean vatExempt, int weight) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.demo().enabled() || clientRepository.count() > 0) {
            return;
        }
        log.info("Seeding Novafer demo data ({} months of history)…", HISTORY_MONTHS);
        List<User> users = users();
        CompanySettings settings = company();
        Map<String, Category> categories = categories();
        List<Product> products = products(categories);
        List<Client> clients = new ArrayList<>();
        List<Integer> weights = new ArrayList<>();
        clients(clients, weights);
        LocalDate start = today.withDayOfMonth(1).minusMonths(HISTORY_MONTHS - 1L);
        openingStock(products, start.minusDays(3));
        List<Invoice> invoices = documents(clients, weights, products, settings, users, start);
        complaints(invoices, users);
        quoteRepository.expireOutdated(today);
        log.info("Demo data ready: {} clients, {} products, {} factures", clients.size(), products.size(),
                invoices.size());
    }

    // ---------------------------------------------------------------- people and company

    private List<User> users() {
        String password = properties.demo().password();
        if (password == null || password.isBlank()) {
            throw new IllegalStateException("novafer.demo.password must be set when demo data is enabled");
        }
        String hash = passwordEncoder.encode(password);
        Object[][] rows = {
                {"direction@novafer.tn", "Sami Trabelsi", Role.ADMIN},
                {"l.bensalem@novafer.tn", "Leïla Ben Salem", Role.MANAGER},
                {"k.jaziri@novafer.tn", "Karim Jaziri", Role.SALES},
                {"y.hammami@novafer.tn", "Yasmine Hammami", Role.SALES},
                {"n.gharbi@novafer.tn", "Nour Gharbi", Role.ACCOUNTANT},
                {"h.mansour@novafer.tn", "Hédi Mansour", Role.QUALITY},
                {"r.bouaziz@novafer.tn", "Rania Bouaziz", Role.WAREHOUSE},
        };
        List<User> users = new ArrayList<>();
        for (Object[] row : rows) {
            if (userRepository.existsByEmailIgnoreCase((String) row[0])) {
                continue;
            }
            User u = new User();
            u.setEmail((String) row[0]);
            u.setFullName((String) row[1]);
            u.setRole((Role) row[2]);
            u.setPasswordHash(hash);
            users.add(userRepository.save(u));
        }
        return users;
    }

    private CompanySettings company() {
        CompanySettings s = settingsRepository.findById(CompanySettings.SINGLETON_ID).orElseThrow();
        s.setCompanyName("Novafer Industries");
        s.setLegalForm("SA au capital de 2 400 000 TND");
        s.setMatriculeFiscal("1658243P/A/M/000");
        s.setRegistreCommerce("B01245372016");
        s.setAddress("Zone industrielle de Ben Arous, rue de l'Acier, lot 47");
        s.setCity("Ben Arous");
        s.setPostalCode("2013");
        s.setCountry("Tunisie");
        s.setPhone("+216 71 000 470");
        s.setEmail("contact@novafer.tn");
        s.setWebsite("www.novafer.tn");
        s.setBankName("Banque de démonstration");
        s.setRib("00 000 0000000000000 00");
        s.setCurrency("TND");
        s.setDefaultVatRate(new BigDecimal("19.00"));
        s.setFiscalStamp(new BigDecimal("1.000"));
        s.setFodecEnabled(true);
        s.setFodecRate(new BigDecimal("1.00"));
        s.setPaymentTermsDays(60);
        s.setQuoteValidityDays(30);
        s.setInvoiceFooter("Pénalités de retard : 1 % par mois au-delà de l'échéance. "
                + "Marchandise voyageant aux risques et périls du destinataire.");
        s.setQuoteFooter("Offre valable 30 jours. Délai de fabrication indicatif : 2 à 4 semaines après accord.");
        return s;
    }

    private Map<String, Category> categories() {
        String[][] rows = {
                {"VIS", "Visserie et fixations", "Boulonnerie, tiges filetées, chevilles d'ancrage"},
                {"TOL", "Tôlerie et découpe laser", "Tôles, platines et goussets découpés sur plan"},
                {"PRO", "Profilés et charpente", "Poutrelles, profilés, tubes et aciers pour béton"},
                {"USI", "Usinage de précision", "Arbres, bagues, brides et pièces sur plan"},
                {"HYD", "Hydraulique et raccords", "Raccords, flexibles, vérins et vannes"},
                {"MEC", "Transmission mécanique", "Roulements, paliers, poulies, chaînes, accouplements"},
                {"SER", "Serrurerie industrielle", "Caillebotis, garde-corps, échelles"},
        };
        Map<String, Category> map = new LinkedHashMap<>();
        for (String[] row : rows) {
            Category c = new Category();
            c.setCode(row[0]);
            c.setName(row[1]);
            c.setDescription(row[2]);
            map.put(row[0], categoryRepository.save(c));
        }
        return map;
    }

    private List<Product> products(Map<String, Category> categories) {
        // reference, name, category, material, unit, price, cost, min stock, min qty, max qty
        Object[][] rows = {
                {"VIS-TH-M8X30", "Vis TH M8×30 classe 8.8 zinguée (boîte de 100)", "VIS", "Acier 8.8 zingué", "boîte", "18.500", "11.200", 40, 5, 60},
                {"VIS-TH-M10X40", "Vis TH M10×40 classe 8.8 zinguée (boîte de 100)", "VIS", "Acier 8.8 zingué", "boîte", "29.800", "18.400", 40, 5, 50},
                {"VIS-TH-M12X50", "Vis TH M12×50 classe 8.8 zinguée (boîte de 100)", "VIS", "Acier 8.8 zingué", "boîte", "46.900", "29.100", 30, 4, 40},
                {"ECR-HU-M10", "Écrou hexagonal M10 classe 8 zingué (boîte de 100)", "VIS", "Acier cl. 8", "boîte", "9.400", "5.300", 50, 5, 60},
                {"RON-PL-M12", "Rondelle plate M12 zinguée (boîte de 100)", "VIS", "Acier zingué", "boîte", "6.200", "3.400", 50, 5, 60},
                {"TIG-M16-1M", "Tige filetée M16 × 1 m classe 8.8", "VIS", "Acier 8.8", "pièce", "14.750", "8.900", 120, 20, 300},
                {"CHE-AN-M12", "Cheville d'ancrage M12×100 (boîte de 50)", "VIS", "Acier zingué", "boîte", "62.000", "39.500", 20, 2, 25},
                {"BOU-HR-M20", "Boulon HR M20×80 classe 10.9 pour charpente", "VIS", "Acier 10.9", "pièce", "4.850", "2.950", 800, 100, 2000},
                {"TOL-S235-3", "Tôle acier S235 ép. 3 mm, 1250×2500", "TOL", "S235JR", "feuille", "238.000", "186.000", 25, 4, 40},
                {"TOL-S235-6", "Tôle acier S235 ép. 6 mm, 1250×2500", "TOL", "S235JR", "feuille", "472.000", "369.000", 15, 2, 25},
                {"TOL-INOX-2", "Tôle inox 304L ép. 2 mm, 1000×2000", "TOL", "Inox 304L", "feuille", "512.000", "418.000", 10, 1, 12},
                {"TOL-GALVA-15", "Tôle galvanisée ép. 1,5 mm, 1000×2000", "TOL", "DX51D Z275", "feuille", "156.000", "121.000", 20, 4, 40},
                {"DEC-PLT-200", "Platine 200×200×12 découpe laser, 4 perçages Ø18", "TOL", "S355", "pièce", "38.600", "22.400", 120, 20, 400},
                {"DEC-GOU-150", "Gousset de renfort 150×150×8 découpe laser", "TOL", "S235JR", "pièce", "12.900", "7.100", 200, 40, 600},
                {"PRO-IPE-200", "Poutrelle IPE 200 S275", "PRO", "S275JR", "m", "96.500", "78.200", 120, 12, 240},
                {"PRO-HEA-160", "Poutrelle HEA 160 S275", "PRO", "S275JR", "m", "118.400", "95.900", 80, 12, 180},
                {"PRO-UPN-100", "Profilé UPN 100 S235", "PRO", "S235JR", "m", "41.300", "32.800", 150, 24, 300},
                {"PRO-COR-40", "Cornière 40×40×4 S235", "PRO", "S235JR", "m", "9.850", "7.400", 400, 60, 900},
                {"PRO-TUB-60", "Tube carré 60×60×3 S235", "PRO", "S235JR", "m", "21.600", "16.300", 300, 36, 600},
                {"PRO-HA12-12M", "Fer à béton HA12, barre de 12 m", "PRO", "FeE500", "barre", "31.200", "26.100", 600, 50, 1500},
                {"USI-ARB-40", "Arbre de transmission Ø40×600 rectifié", "USI", "C45 trempé", "pièce", "186.000", "104.000", 10, 2, 30},
                {"USI-BAG-50", "Bague d'usure bronze Ø50×65×40", "USI", "Bronze CuSn12", "pièce", "64.500", "33.800", 25, 4, 60},
                {"USI-BRI-DN100", "Bride à souder DN100 PN16", "USI", "P250GH", "pièce", "58.900", "36.200", 30, 4, 80},
                {"USI-AXE-30", "Axe de chape Ø30×120 traité", "USI", "42CrMo4", "pièce", "27.400", "13.900", 60, 10, 200},
                {"USI-PIG-Z20", "Pignon droit module 3, Z20", "USI", "18CrNiMo7", "pièce", "142.000", "78.500", 8, 2, 24},
                {"HYD-RAC-12", "Raccord hydraulique droit 1/2\" BSP", "HYD", "Acier zingué", "pièce", "11.900", "6.800", 150, 20, 400},
                {"HYD-FLX-34", "Flexible hydraulique 3/4\" serti, longueur 1 m", "HYD", "2SN", "pièce", "48.600", "29.700", 40, 4, 80},
                {"HYD-VER-80", "Vérin double effet Ø80, course 400 mm", "HYD", "Acier chromé", "pièce", "1240.000", "865.000", 3, 1, 6},
                {"HYD-VAN-1", "Vanne à boisseau sphérique 1\" acier", "HYD", "A105", "pièce", "74.300", "46.900", 20, 2, 40},
                {"MEC-ROU-6205", "Roulement à billes 6205-2RS", "MEC", "Acier 100Cr6", "pièce", "16.800", "10.200", 100, 10, 200},
                {"MEC-PAL-UCP208", "Palier UCP 208 en fonte", "MEC", "Fonte GG25", "pièce", "72.500", "47.800", 20, 2, 40},
                {"MEC-POU-SPA200", "Poulie SPA Ø200 deux gorges", "MEC", "Fonte GG25", "pièce", "138.000", "88.400", 8, 1, 16},
                {"MEC-CHA-12B", "Chaîne de transmission 12B-1, rouleau de 5 m", "MEC", "Acier", "rouleau", "245.000", "166.000", 6, 1, 10},
                {"MEC-ACC-K1", "Accouplement élastique à mâchoires taille 1", "MEC", "Fonte et élastomère", "pièce", "96.000", "61.000", 10, 1, 20},
                {"SER-CAI-1000", "Caillebotis pressé maille 30×30, 1000×1000 galvanisé", "SER", "S235 galvanisé", "pièce", "189.000", "131.000", 20, 4, 60},
                {"SER-GAR-2M", "Garde-corps acier, module 2 m thermolaqué", "SER", "S235 thermolaqué", "pièce", "365.000", "236.000", 8, 2, 30},
                {"SER-ECH-3M", "Échelle à crinoline 3 m galvanisée", "SER", "S235 galvanisé", "pièce", "980.000", "640.000", 2, 1, 4},
        };
        List<Product> products = new ArrayList<>();
        for (Object[] row : rows) {
            Product p = new Product();
            p.setReference((String) row[0]);
            p.setName((String) row[1]);
            p.setCategory(categories.get((String) row[2]));
            p.setMaterial((String) row[3]);
            p.setUnit((String) row[4]);
            p.setUnitPrice(new BigDecimal((String) row[5]));
            p.setCostPrice(new BigDecimal((String) row[6]));
            p.setVatRate(new BigDecimal("19.00"));
            p.setMinStock(BigDecimal.valueOf((Integer) row[7]).setScale(3));
            p.setStockQuantity(Money.ZERO);
            products.add(productRepository.save(p));
            specs.put(p.getId(), new ProductSpec((Integer) row[8], (Integer) row[9]));
        }
        return products;
    }

    private void clients(List<Client> clients, List<Integer> weights) {
        ClientSpec[] rows = {
                new ClientSpec("Atlas Charpente Métallique", "Mourad Belhaj", "Ben Arous", "Route de Mornag, km 4", "Charpente métallique", 60, false, 18),
                new ClientSpec("Carthage Bâtiment", "Ines Karray", "Tunis", "Avenue Mohamed V, 112", "BTP", 60, false, 14),
                new ClientSpec("Sahel Agri-Machines", "Fethi Chaabane", "Sousse", "Zone industrielle Sidi Abdelhamid", "Machinisme agricole", 45, false, 12),
                new ClientSpec("Sfax Industries Navales", "Walid Ellouze", "Sfax", "Port de pêche, môle 3", "Construction navale", 60, false, 11),
                new ClientSpec("Mégrine Auto Pièces", "Olfa Mzoughi", "Ben Arous", "Zone industrielle de Mégrine", "Équipement automobile", 30, true, 10),
                new ClientSpec("Medjerda Hydraulique", "Anis Riahi", "Béja", "Route de Tunis, km 2", "Hydraulique", 45, false, 8),
                new ClientSpec("Bizerte Maintenance Industrielle", "Chokri Ayari", "Bizerte", "Zone industrielle de Menzel Jemil", "Maintenance", 30, false, 8),
                new ClientSpec("Ben Arous Travaux Publics", "Slim Ferchichi", "Ben Arous", "Rue de l'Industrie, 9", "Travaux publics", 90, false, 8),
                new ClientSpec("Kairouan Silos et Stockage", "Habib Guesmi", "Kairouan", "Route de Sousse, km 6", "Stockage de céréales", 60, false, 6),
                new ClientSpec("Monastir Textile Machines", "Sonia Ben Amor", "Monastir", "Zone industrielle de Ksar Hellal", "Textile", 30, true, 6),
                new ClientSpec("Gabès Chimie Services", "Ridha Hamdi", "Gabès", "Zone industrielle de Ghannouch", "Chimie", 60, false, 6),
                new ClientSpec("Tunis Ascenseurs et Levage", "Nadia Chebbi", "Tunis", "Rue d'Angleterre, 27", "Levage", 45, false, 5),
                new ClientSpec("Mahdia Emballages Métalliques", "Lotfi Snoussi", "Mahdia", "Zone industrielle de Mahdia", "Emballage", 60, false, 5),
                new ClientSpec("Soliman Énergie Solaire", "Amira Jelassi", "Nabeul", "Route de Soliman, km 3", "Énergie solaire", 30, false, 5),
                new ClientSpec("Zaghouan Carrières Matériel", "Béchir Khelifi", "Zaghouan", "Route d'El Fahs", "Carrières", 60, false, 4),
                new ClientSpec("Ariana Climatisation Pro", "Mehdi Saidi", "Ariana", "Avenue de l'Environnement, 40", "Génie climatique", 30, false, 4),
                new ClientSpec("Cap Bon Conserverie Équipement", "Hela Masmoudi", "Nabeul", "Zone industrielle de Béni Khiar", "Agroalimentaire", 45, false, 4),
                new ClientSpec("Djerba Marine Équipement", "Taoufik Bennour", "Djerba", "Port de Houmt Souk", "Nautisme", 30, false, 3),
                new ClientSpec("Nabeul Menuiserie Aluminium", "Rim Ouertani", "Nabeul", "Rue des Potiers, 15", "Menuiserie", 30, false, 3),
                new ClientSpec("El Fahs Agro-Industrie", "Karim Dridi", "Zaghouan", "Zone industrielle d'El Fahs", "Agroalimentaire", 45, false, 3),
                new ClientSpec("Sousse Équipements Hôteliers", "Najla Sassi", "Sousse", "Boulevard du 14 Janvier, 66", "Hôtellerie", 30, false, 2),
                new ClientSpec("Kélibia Pêche et Froid", "Adel Haddad", "Nabeul", "Port de Kélibia", "Pêche", 30, false, 2),
                new ClientSpec("Tozeur Palmeraie Irrigation", "Samia Bouzid", "Tozeur", "Route de Nefta, km 2", "Irrigation", 60, false, 2),
                new ClientSpec("Jendouba Bois et Scierie", "Moez Jaouadi", "Jendouba", "Route de Bou Salem", "Bois", 45, false, 1),
        };
        int n = 1;
        for (ClientSpec spec : rows) {
            Client c = new Client();
            c.setCode("CLI-%04d".formatted(n++));
            c.setCompanyName(spec.name());
            c.setContactName(spec.contact());
            c.setCity(spec.city());
            c.setAddress(spec.address());
            c.setSector(spec.sector());
            c.setPaymentTermsDays(spec.terms());
            c.setVatExempt(spec.vatExempt());
            c.setEmail("achats@" + spec.name().toLowerCase()
                    .replaceAll("[éèê]", "e").replaceAll("[^a-z]+", "-").replaceAll("(^-|-$)", "") + ".demo");
            c.setPhone("+216 7%d 000 %03d".formatted(1 + random.nextInt(4), random.nextInt(1000)));
            c.setMatriculeFiscal("%07d%c/A/M/000".formatted(1_000_000 + random.nextInt(8_999_999),
                    (char) ('A' + random.nextInt(26))));
            if (spec.vatExempt()) {
                c.setNotes("Entreprise totalement exportatrice : facturation en suspension de TVA.");
            }
            clients.add(clientRepository.save(c));
            weights.add(spec.weight());
        }
    }

    // ---------------------------------------------------------------- stock

    private void openingStock(List<Product> products, LocalDate date) {
        for (Product p : products) {
            ProductSpec spec = specs.get(p.getId());
            BigDecimal qty = p.getMinStock().multiply(BigDecimal.valueOf(2)).add(BigDecimal.valueOf(spec.maxQty()));
            move(p, StockMovementType.ENTREE, qty, "Stock d'ouverture", null, date, "Rania Bouaziz");
        }
    }

    private void move(Product p, StockMovementType type, BigDecimal signedQty, String reason, String ref,
                      LocalDate date, String by) {
        BigDecimal after = Money.round(p.getStockQuantity().add(signedQty));
        p.setStockQuantity(after);
        StockMovement m = new StockMovement();
        m.setProduct(p);
        m.setType(type);
        m.setQuantity(Money.round(signedQty));
        m.setStockAfter(after);
        m.setReason(reason);
        m.setDocumentRef(ref);
        m.setMovementDate(at(date, 7 + random.nextInt(9)));
        m.setCreatedBy(by);
        movementRepository.save(m);
    }

    // ---------------------------------------------------------------- devis and factures

    private record PendingInvoice(Client client, LocalDate issueDate, Quote quote, List<InvoiceLine> lines,
                                  String subject) {
    }

    private List<Invoice> documents(List<Client> clients, List<Integer> weights, List<Product> products,
                                    CompanySettings settings, List<User> users, LocalDate start) {
        BigDecimal fodec = settings.getFodecRate();
        List<String> sellers = users.stream().filter(u -> u.getRole() == Role.SALES).map(User::getFullName).toList();
        if (sellers.isEmpty()) sellers = List.of("Karim Jaziri");
        List<PendingInvoice> pending = new ArrayList<>();
        List<Quote> quotes = new ArrayList<>();

        for (int month = 0; month < HISTORY_MONTHS; month++) {
            LocalDate monthStart = start.plusMonths(month);
            // Gentle growth over the period, quieter in August.
            double growth = 1 + month * 0.018;
            int quoteCount = (int) Math.round((10 + random.nextInt(5)) * growth
                    * (monthStart.getMonthValue() == 8 ? 0.6 : 1));
            List<LocalDate> dates = new ArrayList<>();
            for (int i = 0; i < quoteCount; i++) {
                LocalDate d = monthStart.plusDays(random.nextInt(monthStart.lengthOfMonth()));
                if (!d.isAfter(today)) dates.add(workday(d));
            }
            dates.sort(Comparator.naturalOrder());
            for (LocalDate date : dates) {
                if (date.isAfter(today)) continue;
                Client client = pick(clients, weights);
                Quote q = new Quote();
                q.setNumber(numberingService.next(NumberingService.QUOTE, date.getYear()));
                q.setClient(client);
                q.setIssueDate(date);
                q.setValidUntil(date.plusDays(settings.getQuoteValidityDays()));
                q.setCreatedBy(sellers.get(random.nextInt(sellers.size())));
                List<QuoteLine> lines = lines(products, client, QuoteLine::new);
                q.setSubject(subject(lines));
                q.replaceLines(lines);
                calculator.apply(q, client.isVatExempt() ? BigDecimal.ZERO : fodec);

                long age = today.toEpochDay() - date.toEpochDay();
                double roll = random.nextDouble();
                if (age < 4 && roll < 0.5) {
                    q.setStatus(QuoteStatus.BROUILLON);
                } else if (age < 30 && roll < 0.55) {
                    q.setStatus(QuoteStatus.ENVOYE);
                } else if (roll < 0.62) {
                    q.setStatus(QuoteStatus.ACCEPTE);
                } else if (roll < 0.85) {
                    q.setStatus(QuoteStatus.REFUSE);
                } else {
                    q.setStatus(QuoteStatus.ENVOYE); // expires below if past validity
                }
                quoteRepository.save(q);
                quotes.add(q);
                if (q.getStatus() == QuoteStatus.ACCEPTE) {
                    LocalDate invoiceDate = workday(date.plusDays(5 + random.nextInt(18)));
                    if (!invoiceDate.isAfter(today) && random.nextDouble() < 0.92) {
                        List<InvoiceLine> invoiceLines = q.getLines().stream()
                                .map(l -> LineFactory.copy(l, InvoiceLine::new)).toList();
                        pending.add(new PendingInvoice(client, invoiceDate, q, invoiceLines, q.getSubject()));
                    }
                }
            }
            // Repeat orders invoiced without a devis (framework agreements, consumables).
            int direct = (int) Math.round((6 + random.nextInt(4)) * growth);
            for (int i = 0; i < direct; i++) {
                LocalDate d = workday(monthStart.plusDays(random.nextInt(monthStart.lengthOfMonth())));
                if (d.isAfter(today)) continue;
                Client client = pick(clients, weights);
                List<InvoiceLine> lines = lines(products, client, InvoiceLine::new);
                pending.add(new PendingInvoice(client, d, null, lines, "Commande " + subject(lines).toLowerCase()));
            }
        }

        pending.sort(Comparator.comparing(PendingInvoice::issueDate));
        List<Invoice> invoices = new ArrayList<>();
        int drafts = 0;
        for (PendingInvoice p : pending) {
            Invoice inv = new Invoice();
            inv.setClient(p.client());
            inv.setQuote(p.quote());
            inv.setIssueDate(p.issueDate());
            inv.setDueDate(p.issueDate().plusDays(p.client().getPaymentTermsDays()));
            inv.setSubject(p.subject());
            inv.setCreatedBy("Nour Gharbi");
            inv.replaceLines(p.lines());
            BigDecimal ttc = calculator.apply(inv, p.client().isVatExempt() ? BigDecimal.ZERO : fodec);
            inv.setFiscalStamp(settings.getFiscalStamp());
            inv.setTotalTtc(Money.round(ttc.add(settings.getFiscalStamp())));

            long age = today.toEpochDay() - p.issueDate().toEpochDay();
            if (age <= 1 && drafts < 1) {
                drafts++;
                invoiceRepository.save(inv);
            } else {
                inv.setNumber(numberingService.next(NumberingService.INVOICE, p.issueDate().getYear()));
                inv.setStatus(InvoiceStatus.EMISE);
                inv.setIssuedAt(at(p.issueDate(), 10));
                invoiceRepository.save(inv);
                deliver(inv);
                if (age > 20 && random.nextDouble() < 0.025) {
                    cancel(inv);
                } else {
                    pay(inv, age);
                }
            }
            if (p.quote() != null) {
                p.quote().setStatus(QuoteStatus.FACTURE);
                p.quote().setConvertedInvoiceId(inv.getId());
            }
            invoices.add(inv);
        }
        return invoices;
    }

    private void deliver(Invoice inv) {
        for (InvoiceLine line : inv.getLines()) {
            Product product = line.getProduct();
            if (product == null) continue;
            BigDecimal needed = line.getQuantity();
            if (product.getStockQuantity().compareTo(needed) < 0) {
                // Production order completed the day before the delivery.
                ProductSpec spec = specs.get(product.getId());
                BigDecimal batch = needed.add(BigDecimal.valueOf(spec.maxQty() * (2L + random.nextInt(3))))
                        .add(product.getMinStock());
                move(product, StockMovementType.ENTREE, batch, "Production atelier",
                        "OF-%05d".formatted(10000 + random.nextInt(89999)), inv.getIssueDate().minusDays(1),
                        "Rania Bouaziz");
            }
            move(product, StockMovementType.SORTIE, needed.negate(), "Livraison " + inv.getClient().getCompanyName(),
                    inv.getNumber(), inv.getIssueDate(), "Rania Bouaziz");
        }
    }

    private void cancel(Invoice inv) {
        inv.setStatus(InvoiceStatus.ANNULEE);
        inv.setCancelledAt(at(inv.getIssueDate().plusDays(3), 11));
        inv.setNotes("Annulée : erreur de quantités, refacturée.");
        for (InvoiceLine line : inv.getLines()) {
            if (line.getProduct() != null) {
                move(line.getProduct(), StockMovementType.ENTREE, line.getQuantity(), "Annulation facture",
                        inv.getNumber(), inv.getIssueDate().plusDays(3), "Nour Gharbi");
            }
        }
    }

    /** Older factures are mostly settled; a few slow payers keep the aging buckets realistic. */
    private void pay(Invoice inv, long age) {
        int terms = inv.getClient().getPaymentTermsDays();
        double behaviour = random.nextDouble();
        int delay = behaviour < 0.55 ? terms - 10 + random.nextInt(15)
                : behaviour < 0.85 ? terms + 5 + random.nextInt(30)
                : terms + 40 + random.nextInt(80);
        BigDecimal total = inv.getTotalTtc();
        if (age > terms + 45 && random.nextDouble() < 0.025) {
            // Disputed or slow debtor: still unpaid long after the due date.
            inv.setStatus(InvoiceStatus.EMISE);
            return;
        }
        if (age < delay) {
            // Not paid yet; sometimes a deposit was received.
            if (age > 15 && random.nextDouble() < 0.18) {
                addPayment(inv, inv.getIssueDate().plusDays(Math.min(age, 10)),
                        Money.round(total.multiply(new BigDecimal("0.30"))));
            }
        } else if (random.nextDouble() < 0.12) {
            addPayment(inv, inv.getIssueDate().plusDays(delay), Money.round(total.multiply(new BigDecimal("0.50"))));
            long second = delay + 20L + random.nextInt(30);
            if (second <= age) {
                addPayment(inv, inv.getIssueDate().plusDays(second), total.subtract(inv.getAmountPaid()));
            }
        } else {
            addPayment(inv, inv.getIssueDate().plusDays(delay), total);
        }
        BigDecimal paid = inv.getAmountPaid();
        inv.setStatus(paid.signum() == 0 ? InvoiceStatus.EMISE
                : paid.compareTo(total) >= 0 ? InvoiceStatus.PAYEE : InvoiceStatus.PARTIELLEMENT_PAYEE);
    }

    private void addPayment(Invoice inv, LocalDate date, BigDecimal amount) {
        if (date.isAfter(today) || amount.signum() <= 0) return;
        Payment p = new Payment();
        p.setInvoice(inv);
        p.setPaymentDate(workday(date).isAfter(today) ? today : workday(date));
        p.setAmount(amount);
        double r = random.nextDouble();
        p.setMethod(r < 0.48 ? PaymentMethod.VIREMENT : r < 0.78 ? PaymentMethod.CHEQUE
                : r < 0.95 ? PaymentMethod.TRAITE : PaymentMethod.ESPECES);
        p.setReference(switch (p.getMethod()) {
            case VIREMENT -> "VIR-" + (100000 + random.nextInt(899999));
            case CHEQUE -> "CHQ " + (1000000 + random.nextInt(8999999));
            case TRAITE -> "LC-" + (10000 + random.nextInt(89999));
            default -> null;
        });
        p.setCreatedBy("Nour Gharbi");
        inv.getPayments().add(p);
        inv.setAmountPaid(Money.round(inv.getAmountPaid().add(amount)));
    }

    private <L extends DocumentLine> List<L> lines(List<Product> products, Client client, Supplier<L> factory) {
        // Orders cluster around one family, plus the odd consumable.
        Product anchor = products.get(random.nextInt(products.size()));
        List<Product> family = products.stream().filter(p -> p.getCategory() == anchor.getCategory()).toList();
        int count = 1 + random.nextInt(Math.min(5, family.size()));
        List<Product> chosen = new ArrayList<>();
        while (chosen.size() < count) {
            Product p = family.get(random.nextInt(family.size()));
            if (!chosen.contains(p)) chosen.add(p);
        }
        if (random.nextDouble() < 0.3) {
            Product extra = products.get(random.nextInt(products.size()));
            if (!chosen.contains(extra)) chosen.add(extra);
        }
        List<L> lines = new ArrayList<>();
        int position = 1;
        for (Product p : chosen) {
            ProductSpec spec = specs.get(p.getId());
            L line = factory.get();
            line.setPosition(position++);
            line.setProduct(p);
            line.setReference(p.getReference());
            line.setDescription(p.getName());
            line.setUnit(p.getUnit());
            int qty = spec.minQty() + random.nextInt(spec.maxQty() - spec.minQty() + 1);
            line.setQuantity(BigDecimal.valueOf(qty).setScale(3));
            line.setUnitPrice(p.getUnitPrice());
            BigDecimal discount = qty > (spec.maxQty() * 0.7) ? new BigDecimal(random.nextBoolean() ? "5.00" : "3.00")
                    : random.nextDouble() < 0.15 ? new BigDecimal("2.00") : BigDecimal.ZERO.setScale(2);
            line.setDiscountPct(discount);
            line.setVatRate(client.isVatExempt() ? BigDecimal.ZERO.setScale(2) : p.getVatRate());
            lines.add(line);
        }
        return lines;
    }

    private static String subject(List<? extends DocumentLine> lines) {
        Product first = lines.getFirst().getProduct();
        return switch (first.getCategory().getCode()) {
            case "VIS" -> "Fourniture de visserie et fixations";
            case "TOL" -> "Tôlerie et pièces découpées laser";
            case "PRO" -> "Profilés pour charpente";
            case "USI" -> "Pièces usinées sur plan";
            case "HYD" -> "Composants hydrauliques";
            case "MEC" -> "Pièces de transmission";
            default -> "Ouvrages de serrurerie";
        };
    }

    // ---------------------------------------------------------------- réclamations

    private void complaints(List<Invoice> invoices, List<User> users) {
        List<Invoice> issued = invoices.stream().filter(i -> i.getNumber() != null).toList();
        User qualityLead = users.stream().filter(u -> u.getRole() == Role.QUALITY).findFirst().orElse(null);
        User accountant = users.stream().filter(u -> u.getRole() == Role.ACCOUNTANT).findFirst().orElse(null);
        User warehouse = users.stream().filter(u -> u.getRole() == Role.WAREHOUSE).findFirst().orElse(null);
        String[][] quality = {
                {"Défaut de planéité sur tôles", "Tôles livrées avec un défaut de planéité supérieur à la tolérance de 3 mm/m, constaté au déballage."},
                {"Filetage non conforme", "Plusieurs vis présentent un filetage abîmé ; le contrôle au calibre bague est refusé."},
                {"Cotes hors tolérance", "Les pièces usinées mesurent 0,15 mm au-dessus de la cote du plan sur le diamètre fonctionnel."},
                {"Traces de corrosion", "Traces de rouille sur une partie du lot à la réception, emballage humide."},
                {"Soudure défectueuse", "Cordon de soudure incomplet sur deux modules de garde-corps."},
                {"Bavures de découpe laser", "Bavures importantes sur les arêtes, reprise manuelle nécessaire chez le client."},
        };
        String[][] delivery = {
                {"Livraison incomplète", "Il manque une partie des quantités commandées par rapport au bon de livraison."},
                {"Retard de livraison", "Livraison reçue avec une semaine de retard, chantier immobilisé deux jours."},
                {"Erreur de référence livrée", "Référence livrée différente de la commande (UPN 80 au lieu d'UPN 100)."},
        };
        String[][] billing = {
                {"Écart de prix facturé", "Le prix unitaire facturé ne correspond pas au devis accepté."},
                {"Remise non appliquée", "La remise négociée n'apparaît pas sur la facture."},
        };
        LocalDate start = today.withDayOfMonth(1).minusMonths(HISTORY_MONTHS - 1L);
        int total = 0;
        for (int month = 0; month < HISTORY_MONTHS; month++) {
            LocalDate monthStart = start.plusMonths(month);
            int count = 3 + random.nextInt(4);
            List<LocalDate> dates = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                dates.add(monthStart.plusDays(random.nextInt(monthStart.lengthOfMonth())));
            }
            dates.sort(Comparator.naturalOrder());
            for (LocalDate opened : dates) {
                if (opened.isAfter(today)) continue;
                List<Invoice> candidates = issued.stream()
                        .filter(inv -> !inv.getIssueDate().isAfter(opened) && inv.getIssueDate().isAfter(opened.minusDays(45)))
                        .toList();
                if (candidates.isEmpty()) continue;
                Invoice inv = candidates.get(random.nextInt(candidates.size()));
                double r = random.nextDouble();
                ComplaintType type = r < 0.58 ? ComplaintType.QUALITE : r < 0.85 ? ComplaintType.LIVRAISON
                        : r < 0.96 ? ComplaintType.FACTURATION : ComplaintType.AUTRE;
                String[] text = switch (type) {
                    case QUALITE -> quality[random.nextInt(quality.length)];
                    case LIVRAISON -> delivery[random.nextInt(delivery.length)];
                    case FACTURATION -> billing[random.nextInt(billing.length)];
                    case AUTRE -> new String[]{"Demande de certificat matière", "Le client demande les certificats 3.1 du lot livré."};
                };
                Complaint c = new Complaint();
                c.setNumber(numberingService.next(NumberingService.COMPLAINT, opened.getYear()));
                c.setClient(inv.getClient());
                c.setInvoice(inv);
                c.setProduct(inv.getLines().getFirst().getProduct());
                c.setSubject(text[0]);
                c.setDescription(text[1] + " Facture " + inv.getNumber() + ".");
                c.setType(type);
                double pr = random.nextDouble();
                c.setPriority(pr < 0.08 ? ComplaintPriority.CRITIQUE : pr < 0.32 ? ComplaintPriority.HAUTE
                        : pr < 0.78 ? ComplaintPriority.MOYENNE : ComplaintPriority.BASSE);
                c.setAssignee(type == ComplaintType.FACTURATION ? accountant
                        : type == ComplaintType.LIVRAISON ? warehouse : qualityLead);
                c.setCreatedBy("Karim Jaziri");
                Instant openedAt = at(opened, 9 + random.nextInt(8));
                c.setOpenedAt(openedAt);
                if (type == ComplaintType.QUALITE) {
                    c.setEstimatedCost(Money.round(inv.getTotalHt().multiply(BigDecimal.valueOf(0.02 + random.nextDouble() * 0.1))));
                }
                event(c, "Karim Jaziri", "Réclamation reçue par téléphone et enregistrée.", null, ComplaintStatus.OUVERTE, openedAt);

                long age = today.toEpochDay() - opened.toEpochDay();
                int resolveAfter = 2 + random.nextInt(c.getPriority() == ComplaintPriority.CRITIQUE ? 6 : 20);
                String assignee = c.getAssignee() == null ? "Hédi Mansour" : c.getAssignee().getFullName();
                if (age >= 1) {
                    c.setStatus(ComplaintStatus.EN_COURS);
                    event(c, assignee, "Analyse en cours, échantillons demandés au client.", ComplaintStatus.OUVERTE,
                            ComplaintStatus.EN_COURS, openedAt.plusSeconds(86400L));
                }
                // Older réclamations are always settled; a few recent ones stay open past their usual delay.
                if (age > resolveAfter && (age > 45 || random.nextDouble() < 0.85)) {
                    String resolution = switch (type) {
                        case QUALITE -> "Remplacement du lot non conforme et action corrective en atelier (contrôle renforcé).";
                        case LIVRAISON -> "Complément livré et procédure de préparation revue avec le magasin.";
                        case FACTURATION -> "Avoir émis pour la différence et tarif corrigé dans la fiche client.";
                        case AUTRE -> "Certificats matière transmis au client.";
                    };
                    Instant resolvedAt = openedAt.plusSeconds(86400L * resolveAfter);
                    c.setResolution(resolution);
                    c.setStatus(ComplaintStatus.RESOLUE);
                    c.setResolvedAt(resolvedAt);
                    event(c, assignee, resolution, ComplaintStatus.EN_COURS, ComplaintStatus.RESOLUE, resolvedAt);
                    if (age > resolveAfter + 7) {
                        Instant closedAt = resolvedAt.plusSeconds(86400L * 5);
                        c.setStatus(ComplaintStatus.CLOTUREE);
                        c.setClosedAt(closedAt);
                        event(c, "Hédi Mansour", "Solution confirmée par le client, réclamation clôturée.",
                                ComplaintStatus.RESOLUE, ComplaintStatus.CLOTUREE, closedAt);
                    }
                }
                complaintRepository.save(c);
                total++;
            }
        }
        log.info("{} réclamations seeded", total);
    }

    private static void event(Complaint c, String author, String message, ComplaintStatus from, ComplaintStatus to,
                              Instant at) {
        ComplaintEvent e = new ComplaintEvent();
        e.setAuthor(author);
        e.setMessage(message);
        e.setFromStatus(from);
        e.setToStatus(to);
        e.setCreatedAt(at);
        c.addEvent(e);
    }

    // ---------------------------------------------------------------- helpers

    private <T> T pick(List<T> items, List<Integer> weights) {
        int total = weights.stream().mapToInt(Integer::intValue).sum();
        int r = random.nextInt(total);
        for (int i = 0; i < items.size(); i++) {
            r -= weights.get(i);
            if (r < 0) return items.get(i);
        }
        return items.getLast();
    }

    /** Moves weekend dates to the following Monday (Tunisian working week: Monday to Friday, plus Saturday mornings). */
    private static LocalDate workday(LocalDate d) {
        return switch (d.getDayOfWeek()) {
            case SUNDAY -> d.plusDays(1);
            default -> d;
        };
    }

    private static Instant at(LocalDate date, int hour) {
        return date.atTime(hour, 0).atZone(TZ).toInstant();
    }

}

