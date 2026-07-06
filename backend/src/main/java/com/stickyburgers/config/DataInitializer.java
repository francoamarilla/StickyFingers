package com.stickyburgers.config;

import com.stickyburgers.domain.Rol;
import com.stickyburgers.domain.Usuario;
import com.stickyburgers.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Siembra el usuario administrador al arrancar si todavía no existe. */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    public ApplicationRunner seedAdmin(UsuarioRepository usuarioRepository,
                                       PasswordEncoder passwordEncoder,
                                       StickyProperties props) {
        return args -> {
            String username = props.admin().username();
            String password = props.admin().password();
            // Aborta si faltan las credenciales (env vars sin resolver): evita sembrar
            // un admin inservible con el placeholder crudo o una contraseña vacía.
            if (isBlank(username) || isBlank(password) || username.contains("${") || password.contains("${")) {
                throw new IllegalStateException(
                        "Definí ADMIN_USERNAME y ADMIN_PASSWORD en el entorno antes de arrancar.");
            }
            if (usuarioRepository.existsByUsername(username)) {
                return;
            }
            Usuario admin = Usuario.builder()
                    .username(username)
                    .passwordHash(passwordEncoder.encode(props.admin().password()))
                    .rol(Rol.ADMIN)
                    .build();
            usuarioRepository.save(admin);
            log.info("Usuario admin '{}' creado", username);
        };
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
