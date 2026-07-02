package com.stickyburgers.web;

import com.stickyburgers.service.AuthService;
import com.stickyburgers.web.dto.LoginRequest;
import com.stickyburgers.web.dto.TokenResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/** Autenticación del administrador. */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "Login del administrador")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión y obtener un JWT")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
