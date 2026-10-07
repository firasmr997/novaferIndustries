package tn.novafer.erp.web;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.novafer.erp.service.DashboardService;
import tn.novafer.erp.web.dto.DashboardDtos.AnalyticsDto;
import tn.novafer.erp.web.dto.DashboardDtos.HomeDto;

@Tag(name = "Tableau de bord")
@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/api/dashboard")
    public HomeDto home() {
        return dashboardService.home();
    }

    @GetMapping("/api/analytics")
    public AnalyticsDto analytics(@RequestParam(defaultValue = "12") int months) {
        return dashboardService.analytics(months);
    }
}
