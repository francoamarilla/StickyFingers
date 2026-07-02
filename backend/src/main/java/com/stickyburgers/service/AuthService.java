package com.stickyburgers.service;

import com.stickyburgers.security.JwtService;
import com.stickyburgers.web.dto.LoginRequest;
import com.stickyburgers.web.dto.TokenResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

/** Autenticación del administrador. */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    /**
     * Valida credenciales y devuelve un JWT.
     * @throws org.springframework.security.authentication.BadCredentialsException si son inválidas.
     */
    public TokenResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        String token = jwtService.generar(request.username());
        return TokenResponse.bearer(token, jwtService.getExpirationMs());
    }
}
