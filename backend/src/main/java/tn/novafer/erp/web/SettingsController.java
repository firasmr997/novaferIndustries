package tn.novafer.erp.web;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.novafer.erp.service.SettingsService;
import tn.novafer.erp.web.dto.SettingsDtos.SettingsDto;
import tn.novafer.erp.web.dto.SettingsDtos.SettingsRequest;

@Tag(name = "Paramètres")
@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public SettingsDto get() {
        return settingsService.get();
    }

    @PutMapping
    public SettingsDto update(@Valid @RequestBody SettingsRequest request) {
        return settingsService.update(request);
    }
}
