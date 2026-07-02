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
}
