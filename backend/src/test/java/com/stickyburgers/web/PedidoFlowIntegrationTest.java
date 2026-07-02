package com.stickyburgers.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stickyburgers.domain.Producto;
import com.stickyburgers.domain.TipoProducto;
import com.stickyburgers.repository.ProductoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PedidoFlowIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ProductoRepository productoRepository;
    @Autowired ObjectMapper json;

    private Long burgerId;

    @BeforeEach
    void seed() {
        Producto b = productoRepository.save(Producto.builder()
                .tipo(TipoProducto.HAMBURGUESA).nombre("Queso Simple")
                .descripcion("test").precio(8000).disponible(true).build());
        burgerId = b.getId();
    }

    private String body(Object o) throws Exception {
        return json.writeValueAsString(o);
    }

    @Test
    void menuPublicoDevuelveProductos() throws Exception {
        mvc.perform(get("/api/menu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nombre").value("Queso Simple"));
    }

    @Test
    void crearPedidoValidoDevuelve201YTotal() throws Exception {
        Map<String, Object> req = Map.of(
                "clienteNombre", "Ana", "clienteTelefono", "3548",
                "tipoEntrega", "RETIRO", "medioPago", "EFECTIVO",
                "items", List.of(Map.of("productoId", burgerId, "cantidad", 2, "medallonExtra", false)));

        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(body(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.numero").value("#001"))
                .andExpect(jsonPath("$.total").value(16000))
                .andExpect(jsonPath("$.estado").value("NUEVO"));
    }

    @Test
    void masDeSeisHamburguesasDevuelve400() throws Exception {
        Map<String, Object> req = Map.of(
                "clienteNombre", "Ana", "clienteTelefono", "3548",
                "tipoEntrega", "RETIRO", "medioPago", "EFECTIVO",
                "items", List.of(Map.of("productoId", burgerId, "cantidad", 7, "medallonExtra", false)));

        mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(body(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminSinTokenDevuelve401() throws Exception {
        mvc.perform(get("/api/admin/pedidos")).andExpect(status().isUnauthorized());
    }

    @Test
    void loginPermiteListarPedidosAdmin() throws Exception {
        String resp = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("username", "admin", "password", "admin123"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode node = json.readTree(resp);
        String token = node.get("token").asText();

        mvc.perform(get("/api/admin/pedidos").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void loginCredencialesInvalidasDevuelve401() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("username", "admin", "password", "malaclave"))))
                .andExpect(status().isUnauthorized());
    }
}
