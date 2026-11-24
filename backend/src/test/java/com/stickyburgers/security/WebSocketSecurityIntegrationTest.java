package com.stickyburgers.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stickyburgers.config.StickyProperties;
import com.stickyburgers.domain.Producto;
import com.stickyburgers.domain.TipoProducto;
import com.stickyburgers.repository.ProductoRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.BooleanSupplier;

import static com.stickyburgers.service.PedidoEventPublisher.TOPIC_ESTADO;
import static com.stickyburgers.service.PedidoEventPublisher.TOPIC_NUEVOS;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.doReturn;

/**
 * Seguridad del canal STOMP con un cliente SockJS real contra el servidor levantado:
 * autenticación del CONNECT, autorización ADMIN, bloqueo de SEND, payload mínimo,
 * publicación después del commit, reconexión y vencimiento del JWT con la sesión abierta.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:ws-security;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
@ActiveProfiles("test")
class WebSocketSecurityIntegrationTest {

    private static final long TIMEOUT_S = 5;
    /** Vida del token en los tests de vencimiento: deja margen al handshake SockJS. */
    private static final long VIDA_TOKEN_CORTO_S = 6;

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;
    @Autowired ObjectMapper json;
    @Autowired StickyProperties props;
    @Autowired JwtService jwtService;
    @Autowired JwtStompInterceptor interceptor;
    @Autowired SimpUserRegistry userRegistry;
    @Autowired ProductoRepository productoRepository;
    @SpyBean AdminUserDetailsService userDetailsService;

    private WebSocketStompClient stomp;
    private final List<StompSession> sesiones = new ArrayList<>();
    private Long burgerId;

    @BeforeEach
    void setUp() {
        // HttpURLConnection (default) no soporta PATCH; el cliente del JDK sí.
        rest.getRestTemplate().setRequestFactory(new JdkClientHttpRequestFactory());
        stomp = new WebSocketStompClient(new SockJsClient(
                List.of(new WebSocketTransport(new StandardWebSocketClient()))));
        burgerId = productoRepository.save(Producto.builder()
                .tipo(TipoProducto.HAMBURGUESA).nombre("Queso Simple")
                .descripcion("test").precio(8000).disponible(true).build()).getId();
    }

    @AfterEach
    void tearDown() {
        sesiones.stream().filter(StompSession::isConnected).forEach(StompSession::disconnect);
        stomp.stop();
    }

    // ---------- 1-4: CONNECT rechazado ----------

    @Test
    void anonimoNoPuedeConectarse() {
        assertConexionRechazada(null);
    }

    @Test
    void jwtInvalidoEsRechazado() {
        assertConexionRechazada("no-es-un-jwt");
        assertConexionRechazada(tokenAdmin() + "x"); // firma alterada
    }

    @Test
    void jwtExpiradoEsRechazado() {
        assertConexionRechazada(tokenConExpiracion("admin", Instant.now().minusSeconds(60)));
    }

    @Test
    void usuarioSinRolAdminEsRechazado() {
        doReturn(User.withUsername("cocina").password("x").authorities("ROLE_COCINA").build())
                .when(userDetailsService).loadUserByUsername("cocina");
        assertConexionRechazada(jwtService.generar("cocina"));
    }

    @Test
    void usuarioInexistenteEsRechazado() {
        assertConexionRechazada(jwtService.generar("fantasma"));
    }

    // ---------- 5, 7: admin recibe eventos mínimos y puede leer el detalle ----------

    @Test
    void adminRecibeEventoMinimoYElPedidoYaEsLegiblePorRest() throws Exception {
        String token = tokenAdmin();
        StompSession s = conectar(token, new Cliente());
        BlockingQueue<String> nuevos = suscribir(s, TOPIC_NUEVOS);
        BlockingQueue<String> estados = suscribir(s, TOPIC_ESTADO);

        long id = crearPedido();
        JsonNode evento = json.readTree(nuevos.poll(TIMEOUT_S, TimeUnit.SECONDS));
        assertThat(evento.get("id").asLong()).isEqualTo(id);
        assertThat(evento.get("estado").asText()).isEqualTo("NUEVO");
        assertThat(campos(evento)).containsExactlyInAnyOrder("id", "estado");

        // Regresión del after-commit: el id recibido ya se puede leer (nunca 404).
        ResponseEntity<String> detalle = rest.exchange("/api/admin/pedidos/" + id, HttpMethod.GET,
                new HttpEntity<>(bearer(token)), String.class);
        assertThat(detalle.getStatusCode()).isEqualTo(HttpStatus.OK);

        rest.exchange("/api/admin/pedidos/" + id + "/estado", HttpMethod.PATCH,
                new HttpEntity<>(Map.of(), bearer(token)), String.class);
        JsonNode cambio = json.readTree(estados.poll(TIMEOUT_S, TimeUnit.SECONDS));
        assertThat(cambio.get("estado").asText()).isEqualTo("EN_PREPARACION");
        assertThat(campos(cambio)).containsExactlyInAnyOrder("id", "estado");
    }

    // ---------- 6: SEND y comodines bloqueados ----------

    @Test
    void clienteNoPuedePublicarEnTopics() throws Exception {
        StompSession receptor = conectar(tokenAdmin(), new Cliente());
        BlockingQueue<String> nuevos = suscribir(receptor, TOPIC_NUEVOS);

        Cliente emisorHandler = new Cliente();
        StompSession emisor = conectar(tokenAdmin(), emisorHandler);
        emisor.send(TOPIC_NUEVOS, "{\"id\":999,\"estado\":\"NUEVO\"}".getBytes(StandardCharsets.UTF_8));

        assertThat(emisorHandler.errores.poll(TIMEOUT_S, TimeUnit.SECONDS)).isNotNull();
        esperar(() -> !emisor.isConnected());
        assertThat(nuevos.poll(1, TimeUnit.SECONDS)).isNull();
        assertThat(receptor.isConnected()).isTrue();
    }

    @Test
    void suscripcionConComodinEsRechazada() throws Exception {
        for (String destino : List.of("/topic/**", "/topic/pedidos-*", "/topic/otro")) {
            Cliente handler = new Cliente();
            StompSession s = conectar(tokenAdmin(), handler);
            s.subscribe(destino, new Cola(new LinkedBlockingQueue<>()));
            assertThat(handler.errores.poll(TIMEOUT_S, TimeUnit.SECONDS)).as(destino).isNotNull();
            esperar(() -> !s.isConnected());
        }
    }

    // ---------- 8: reconexión ----------

    @Test
    void adminSigueRecibiendoEventosDespuesDeReconectar() throws Exception {
        String token = tokenAdmin();
        StompSession primera = conectar(token, new Cliente());
        suscribir(primera, TOPIC_NUEVOS);
        primera.disconnect();

        StompSession segunda = conectar(token, new Cliente());
        BlockingQueue<String> nuevos = suscribir(segunda, TOPIC_NUEVOS);
        long id = crearPedido();
        assertThat(json.readTree(nuevos.poll(TIMEOUT_S, TimeUnit.SECONDS)).get("id").asLong()).isEqualTo(id);
    }

    @Test
    void desconectarLiberaElRegistroDeLaSesion() throws Exception {
        int antes = interceptor.sesionesRegistradas();
        StompSession s = conectar(tokenAdmin(), new Cliente());
        assertThat(interceptor.sesionesRegistradas()).isEqualTo(antes + 1);
        s.disconnect();
        esperar(() -> interceptor.sesionesRegistradas() == antes);
    }

    // ---------- Vencimiento del JWT con la sesión abierta ----------

    @Test
    void tokenVencidoConSesionAbiertaRecibeErrorSeCierraYNoRecibeElMensaje() throws Exception {
        Instant exp = Instant.now().plusSeconds(VIDA_TOKEN_CORTO_S);
        Cliente handler = new Cliente();
        StompSession s = conectar(tokenConExpiracion("admin", exp), handler);
        BlockingQueue<String> nuevos = suscribir(s, TOPIC_NUEVOS);
        esperarHasta(exp);

        crearPedido(); // el servidor intenta entregar un MESSAGE con el token ya vencido

        assertThat(handler.errores.poll(TIMEOUT_S, TimeUnit.SECONDS)).isEqualTo("Token expirado");
        esperar(() -> !s.isConnected());
        assertThat(nuevos.poll(1, TimeUnit.SECONDS)).isNull();
    }

    @Test
    void tokenVencidoNoPuedeSuscribirseDespues() throws Exception {
        Instant exp = Instant.now().plusSeconds(VIDA_TOKEN_CORTO_S);
        Cliente handler = new Cliente();
        StompSession s = conectar(tokenConExpiracion("admin", exp), handler);
        esperarHasta(exp);

        s.subscribe(TOPIC_NUEVOS, new Cola(new LinkedBlockingQueue<>()));
        assertThat(handler.errores.poll(TIMEOUT_S, TimeUnit.SECONDS)).isNotNull();
        esperar(() -> !s.isConnected());
    }

    // ---------- helpers ----------

    private void assertConexionRechazada(String token) {
        Cliente handler = new Cliente();
        assertThatThrownBy(() -> conectar(token, handler)).isInstanceOf(ExecutionException.class);
        assertThat(handler.errores).as("el servidor responde con un frame ERROR").isNotEmpty();
    }

    private StompSession conectar(String token, Cliente handler) throws Exception {
        StompHeaders connect = new StompHeaders();
        if (token != null) {
            connect.add("Authorization", "Bearer " + token);
        }
        StompSession s = stomp.connectAsync("http://127.0.0.1:" + port + "/ws",
                new WebSocketHttpHeaders(), connect, handler).get(TIMEOUT_S, TimeUnit.SECONDS);
        sesiones.add(s);
        return s;
    }

    /** Suscribe y espera a que el servidor la registre (la suscripción STOMP es asíncrona). */
    private BlockingQueue<String> suscribir(StompSession s, String destino) throws Exception {
        int antes = userRegistry.findSubscriptions(sub -> sub.getDestination().equals(destino)).size();
        BlockingQueue<String> cola = new LinkedBlockingQueue<>();
        s.subscribe(destino, new Cola(cola));
        esperar(() -> userRegistry.findSubscriptions(sub -> sub.getDestination().equals(destino)).size() > antes);
        return cola;
    }

    private long crearPedido() throws Exception {
        Map<String, Object> req = Map.of(
                "clienteNombre", "Ana", "clienteTelefono", "3548",
                "tipoEntrega", "RETIRO", "medioPago", "EFECTIVO",
                "items", List.of(Map.of("productoId", burgerId, "cantidad", 1, "medallonExtra", false)));
        ResponseEntity<String> resp = rest.postForEntity("/api/pedidos", req, String.class);
        assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return json.readTree(resp.getBody()).get("id").asLong();
    }

    private String tokenAdmin() {
        ResponseEntity<String> resp = rest.postForEntity("/api/auth/login",
                Map.of("username", "admin", "password", "admin123"), String.class);
        try {
            return json.readTree(resp.getBody()).get("token").asText();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String tokenConExpiracion(String username, Instant exp) {
        return Jwts.builder().subject(username)
                .issuedAt(Date.from(exp.minusSeconds(120)))
                .expiration(Date.from(exp))
                .signWith(Keys.hmacShaKeyFor(props.jwt().secret().getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        return h;
    }

    private static Set<String> campos(JsonNode node) {
        Set<String> nombres = new HashSet<>();
        node.fieldNames().forEachRemaining(nombres::add);
        return nombres;
    }

    /** El exp del JWT se trunca a segundos: se espera un segundo extra de margen. */
    private static void esperarHasta(Instant exp) throws InterruptedException {
        Thread.sleep(Math.max(0, exp.toEpochMilli() - System.currentTimeMillis()) + 1000);
    }

    private static void esperar(BooleanSupplier condicion) throws InterruptedException {
        long limite = System.currentTimeMillis() + TIMEOUT_S * 1000;
        while (!condicion.getAsBoolean()) {
            if (System.currentTimeMillis() > limite) {
                fail("La condición no se cumplió en " + TIMEOUT_S + "s");
            }
            Thread.sleep(50);
        }
    }

    /** Handler de sesión: los frames que recibe acá son ERROR del servidor. */
    static class Cliente extends StompSessionHandlerAdapter {
        final BlockingQueue<String> errores = new LinkedBlockingQueue<>();

        @Override
        public Type getPayloadType(StompHeaders headers) {
            return byte[].class;
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            errores.add(String.valueOf(headers.getFirst("message")));
        }
    }

    record Cola(BlockingQueue<String> cola) implements StompFrameHandler {
        @Override
        public Type getPayloadType(StompHeaders headers) {
            return byte[].class;
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            cola.add(new String((byte[]) payload, StandardCharsets.UTF_8));
        }
    }
}
