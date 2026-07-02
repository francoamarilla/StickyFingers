(function () {
  'use strict';

  var MENU = [
    { id: 'queso', nombre: 'Queso Simple', precio: 8000, desc: 'Pan de papa, medallón carne 130g, queso, cheddar, mayonesa casera, ketchup y papas fritas' },
    { id: 'clasica_simple', nombre: 'Clásica Simple', precio: 8000, desc: 'Pan de papa, medallón carne 130g, tomate, lechuga, mayo casera y papas fritas' },
    { id: 'clasica_completa', nombre: 'Clásica Completa', precio: 10000, desc: 'Pan de papa, medallón carne 130g, mayo casera, tomate, lechuga, jamón, queso, huevo y papas fritas' },
    { id: 'sticky', nombre: 'Sticky', precio: 10000, desc: 'Pan de papa, medallón carne 130g, ketchup, mayo casera, queso, jamón, cebolla caramelizada, huevo y papas fritas' },
    { id: 'cheddar_bacon', nombre: 'Clásica Cheddar y Bacon', precio: 11000, desc: 'Pan de papa, medallón carne 130g, mayo casera, ketchup, cheddar, panceta, tomate, huevo, lechuga y papas fritas' },
    { id: 'cheddar', nombre: 'Cheddar', precio: 10000, desc: 'Pan de papa, medallón carne 130g, mayo casera, ketchup, doble cheddar, panceta, jamón salteado y papas fritas' },
    { id: 'barbacoa', nombre: 'Barbacoa', precio: 10000, desc: 'Pan de papa, medallón carne 130g, mayo casera, salsa barbacoa, jamón, panceta, queso, huevo y papas fritas' },
    { id: 'criolla', nombre: 'Criolla', precio: 10000, desc: 'Pan de papa, medallón carne 130g, chimichurri, mayonesa casera, lechuga, salsa criolla, queso y papas fritas' },
    { id: 'picante', nombre: 'Picante', precio: 12500, desc: 'Pan de papa, medallón carne 130g, ají picante, mayo casera, tomate, lechuga, cebolla, panceta, cheddar, jamón y papas fritas' }
  ];

  var EXTRAS = [
    { id: 'mayo', nombre: 'Pote Mayo Casera', precio: 2000 },
    { id: 'ketchup', nombre: 'Pote Ketchup', precio: 1000 }
  ];

  var MEDALLON = 3500;
  var WA_NUMBER = '5493548574081';
  var EST_MAP = {
    nuevo: { l: 'NUEVO', c: '#E11B22' },
    prep: { l: 'EN PREP.', c: '#FFC400' },
    listo: { l: 'LISTO', c: '#39b34a' },
    entregado: { l: 'ENTREGADO', c: '#6f6860' }
  };

  var state = {
    view: 'home', cStep: 'carta',
    cart: [], warn: '',
    custom: null,
    nombre: '', telefono: '', tipoEntrega: 'retiro', direccion: '', km: 2, geoLoading: false, pago: 'transferencia', lluvia: false, notaGeneral: '',
    lastOrder: null,
    panelTab: 'pedidos', orders: [],
    offer: { titulo: '2x Queso Simple', desc: 'Dos hamburguesas Queso Simple con papas fritas', precio: 14000, vigencia: 'Solo hoy' },
    offerSaved: false, histView: 'dia',
    savedOffers: [], editingId: null
  };

  var geoTimer = null;
  var logoImg = null;
  (function preloadLogo() {
    var img = new Image();
    img.onload = function () { logoImg = img; };
    img.src = 'assets/logo.png';
  })();

  // ---------- persistence ----------
  function loadPersisted() {
    try {
      var o = JSON.parse(localStorage.getItem('sticky_offer_v1'));
      if (o) state.offer = o;
    } catch (e) {}
    var savedOffers = [];
    try { savedOffers = JSON.parse(localStorage.getItem('sticky_saved_offers_v1')) || []; } catch (e) {}
    if (!savedOffers.length) { savedOffers = seedOffers(); localStorage.setItem('sticky_saved_offers_v1', JSON.stringify(savedOffers)); }
    state.savedOffers = savedOffers;
    var orders = [];
    try { orders = JSON.parse(localStorage.getItem('sticky_orders_v1')) || []; } catch (e) {}
    if (!orders.length) { orders = seed(); localStorage.setItem('sticky_orders_v1', JSON.stringify(orders)); }
    state.orders = orders;
  }

  function saveOrders(orders) {
    state.orders = orders;
    try { localStorage.setItem('sticky_orders_v1', JSON.stringify(orders)); } catch (e) {}
  }
  function saveOffersList(saved) {
    state.savedOffers = saved;
    try { localStorage.setItem('sticky_saved_offers_v1', JSON.stringify(saved)); } catch (e) {}
  }
  function saveOfferDraft(draft) {
    try { localStorage.setItem('sticky_offer_v1', JSON.stringify(draft)); } catch (e) {}
  }

  // ---------- helpers ----------
  function money(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-AR'); }
  function pagoLabel(p) { return p === 'credito' ? 'Crédito (+15%)' : p === 'debito' ? 'Débito (+10%)' : 'Transferencia'; }
  function deliveryCost(km, lluvia, tipo) {
    if (tipo !== 'delivery') return 0;
    if (km > 3) return null;
    if (km <= 2) return lluvia ? 3000 : 2500;
    if (km <= 2.5) return lluvia ? 3500 : 3000;
    return lluvia ? 4000 : 3500;
  }
  function seg(active) { return active ? 'background:#FFC400;color:#0b0a09;border-color:#FFC400;' : 'background:transparent;color:#9a9186;border-color:rgba(255,255,255,.12);'; }
  function tabStyle(active) { return active ? 'color:#FFC400;border-bottom-color:#FFC400;' : 'color:#6f6860;border-bottom-color:transparent;'; }
  function pillStyle(active) { return active ? 'background:#FFC400;color:#0b0a09;' : 'background:transparent;color:#9a9186;'; }
  function burgerTotal(cart) { return cart.filter(function (l) { return l.tipo === 'burger'; }).reduce(function (a, l) { return a + l.cantidad; }, 0); }
  function lineUnit(l) { return l.precio + (l.medallon ? MEDALLON : 0); }
  function calcularKm(addr) {
    var s = (addr || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var zonas = [
      { k: ['nueva cordoba', 'nva cordoba', 'n cordoba'], km: 1.5 },
      { k: ['centro'], km: 2 },
      { k: ['guemes'], km: 2.5 },
      { k: ['observatorio'], km: 3 },
      { k: ['alberdi', 'general paz', 'gral paz', 'san vicente'], km: 3.5 }
    ];
    for (var i = 0; i < zonas.length; i++) { if (zonas[i].k.some(function (w) { return s.indexOf(w) !== -1; })) return zonas[i].km; }
    var h = 0;
    for (var j = 0; j < s.length; j++) { h = (h * 31 + s.charCodeAt(j)) >>> 0; }
    var opts = [1, 1.5, 2, 2.5, 3, 3.5];
    return opts[h % opts.length];
  }
  function buildWa(o) {
    var L = ['*PEDIDO · STICKY BURGERS* ' + o.num, '', 'Cliente: ' + o.cliente, 'Tel: ' + o.telefono, 'Entrega: ' + (o.tipo === 'delivery' ? ('Delivery — ' + o.direccion + ' (' + o.km + ' km)') : 'Retiro en local'), ''];
    o.items.forEach(function (it) {
      var det = [it.medallon ? 'medallón extra' : '', it.nota].filter(Boolean).join(', ');
      L.push('• ' + it.cantidad + 'x ' + it.nombre + (det ? (' — ' + det) : ''));
    });
    L.push('');
    L.push('Subtotal: ' + money(o.subtotal));
    if (o.tipo === 'delivery') L.push('Envío: ' + money(o.delivery));
    if (o.recargo) L.push('Recargo ' + (o.pago === 'credito' ? '(crédito 15%)' : '(débito 10%)') + ': ' + money(o.recargo));
    L.push('TOTAL: ' + money(o.total));
    L.push('Pago: ' + pagoLabel(o.pago));
    if (o.notaGeneral) { L.push(''); L.push('Nota: ' + o.notaGeneral); }
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(L.join('\n'));
  }
  function seedOffers() {
    return [
      { id: 'seed_of1', titulo: '2x Queso Simple', desc: 'Dos hamburguesas Queso Simple con papas fritas', precio: 14000, vigencia: 'Solo hoy' },
      { id: 'seed_of2', titulo: 'Combo Cheddar + Bebida', desc: 'Cheddar con papas y una gaseosa de 500ml', precio: 12500, vigencia: 'Miércoles' },
      { id: 'seed_of3', titulo: 'Noche Sticky', desc: 'Sticky completa con doble medallón y papas', precio: 13500, vigencia: 'Fin de semana' }
    ];
  }
  function seed() {
    var nombres = ['Lucía', 'Martín', 'Sofía', 'Diego', 'Cami', 'Nacho', 'Flor', 'Juan', 'Meli', 'Tomás', 'Rocío', 'Fede', 'Ana', 'Bruno', 'Vale', 'Guille', 'Pau', 'Santi'];
    var zonas = ['Nva. Córdoba', 'Centro', 'Güemes', 'Observatorio'];
    var notas = ['', '', 'sin tomate', '', 'cortada al medio', '', 'sin cebolla', ''];
    var orders = []; var n = 0; var now = Date.now(); var day = 86400000;
    for (var d = 20; d >= 0; d--) {
      var cant = d === 0 ? 3 : (1 + Math.floor(Math.random() * 3));
      for (var p = 0; p < cant; p++) {
        n++;
        var nItems = 1 + Math.floor(Math.random() * 3); var items = [];
        for (var k = 0; k < nItems; k++) {
          var m = MENU[Math.floor(Math.random() * MENU.length)];
          var ex = items.find(function (it) { return it.id === m.id; });
          if (ex) ex.cantidad++; else items.push({ id: m.id, nombre: m.nombre, precio: m.precio, cantidad: 1, nota: notas[Math.floor(Math.random() * notas.length)], tipo: 'burger' });
        }
        var subtotal = items.reduce(function (a, l) { return a + l.precio * l.cantidad; }, 0);
        var tipo = Math.random() < 0.6 ? 'delivery' : 'retiro';
        var km = tipo === 'delivery' ? [2, 2.5, 3][Math.floor(Math.random() * 3)] : 0;
        var delivery = tipo === 'delivery' ? deliveryCost(km, false, 'delivery') : 0;
        var pago = ['transferencia', 'debito', 'credito'][Math.floor(Math.random() * 3)];
        var pct = pago === 'credito' ? 0.15 : pago === 'debito' ? 0.10 : 0;
        var recargo = Math.round((subtotal + delivery) * pct);
        var total = subtotal + delivery + recargo;
        var date = new Date(now - d * day); date.setHours(11 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);
        var estado = d === 0 ? ['nuevo', 'prep', 'listo'][Math.floor(Math.random() * 3)] : 'entregado';
        orders.push({ id: 'seed' + n, num: '#' + String(n).padStart(3, '0'), fecha: date.toISOString(), cliente: nombres[Math.floor(Math.random() * nombres.length)], telefono: '3548' + (400000 + Math.floor(Math.random() * 99999)), tipo: tipo, direccion: tipo === 'delivery' ? zonas[Math.floor(Math.random() * zonas.length)] : '', km: km, items: items, subtotal: subtotal, delivery: delivery, recargoPct: pct, recargo: recargo, total: total, pago: pago, notaGeneral: '', estado: estado });
      }
    }
    orders.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    return orders;
  }
  function isoWeek(x) {
    var dt = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()));
    var dn = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - dn);
    var ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    return Math.ceil((((dt - ys) / 86400000) + 1) / 7);
  }
  function roundRect(x, rx, ry, w, h, r) {
    x.beginPath(); x.moveTo(rx + r, ry); x.arcTo(rx + w, ry, rx + w, ry + h, r); x.arcTo(rx + w, ry + h, rx, ry + h, r); x.arcTo(rx, ry + h, rx, ry, r); x.arcTo(rx, ry, rx + w, ry, r); x.closePath();
  }
  function wrapText(x, text, maxW) {
    var words = String(text || '').split(' '); var lines = []; var cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------- dom helper ----------
  function h(tag, props) {
    var node = document.createElement(tag);
    if (props) {
      for (var key in props) {
        var val = props[key];
        if (val === null || val === undefined || val === false) continue;
        if (key === 'style') { node.style.cssText = val; }
        else if (key === 'value') { node.value = val; }
        else if (key === 'class') { node.className = val; }
        else if (key === 'onChange') { node.addEventListener('input', val); }
        else if (key.slice(0, 2) === 'on' && typeof val === 'function') { node.addEventListener(key.slice(2).toLowerCase(), val); }
        else if (val === true) { node.setAttribute(key, ''); }
        else { node.setAttribute(key, val); }
      }
    }
    var children = Array.prototype.slice.call(arguments, 2);
    var stack = children.slice();
    while (stack.length) {
      var c = stack.shift();
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) { stack = c.concat(stack); continue; }
      node.appendChild((typeof c === 'object' && c.nodeType) ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  // ---------- state mutation ----------
  function setState(patch) {
    var p = typeof patch === 'function' ? patch(state) : patch;
    if (p) Object.assign(state, p);
    render();
  }

  // ---------- navigation ----------
  function goHome() { setState({ view: 'home' }); }
  function goCliente() { setState({ view: 'cliente', cStep: 'carta' }); }
  function goPanel() { setState({ view: 'panel' }); }
  function goToCarrito() { setState({ cStep: 'carrito' }); }
  function backToCarta() { setState({ cStep: 'carta' }); }
  function goToCheckout() { setState({ cStep: 'checkout' }); }
  function backToCarrito() { setState({ cStep: 'carrito' }); }
  function tabPedidos() { setState({ panelTab: 'pedidos' }); }
  function tabOferta() { setState({ panelTab: 'oferta' }); }
  function tabInformes() { setState({ panelTab: 'informes' }); }

  // ---------- cart ----------
  function openCustom(item) { setState({ cStep: 'custom', warn: '', custom: { id: item.id, nombre: item.nombre, precio: item.precio, desc: item.desc, cantidad: 1, nota: '', medallon: false } }); }
  function cancelCustom() { setState({ cStep: 'carta', custom: null }); }
  function customInc() {
    setState(function (s) {
      var already = burgerTotal(s.cart); var max = 6 - already;
      if (s.custom.cantidad >= max) return {};
      return { custom: Object.assign({}, s.custom, { cantidad: s.custom.cantidad + 1 }) };
    });
  }
  function customDec() { setState(function (s) { return { custom: Object.assign({}, s.custom, { cantidad: Math.max(1, s.custom.cantidad - 1) }) }; }); }
  function customToggleMedallon() { setState(function (s) { return { custom: Object.assign({}, s.custom, { medallon: !s.custom.medallon }) }; }); }
  function customSetNota(e) { var v = e.target.value; setState(function (s) { return { custom: Object.assign({}, s.custom, { nota: v }) }; }); }
  function addCustomToCart() {
    setState(function (s) {
      var c = s.custom; if (!c) return {};
      var line = { lineId: 'l' + Date.now() + Math.random().toString(36).slice(2, 6), id: c.id, nombre: c.nombre, precio: c.precio, cantidad: c.cantidad, nota: c.nota.trim(), medallon: c.medallon, tipo: 'burger' };
      return { cart: s.cart.concat([line]), custom: null, cStep: 'carta', warn: '' };
    });
  }
  function addExtra(item) {
    setState(function (s) {
      var cart = s.cart.map(function (l) { return Object.assign({}, l); });
      var ex = cart.find(function (l) { return l.tipo === 'extra' && l.id === item.id; });
      if (ex) ex.cantidad++; else cart.push({ lineId: 'e' + item.id, id: item.id, nombre: item.nombre, precio: item.precio, cantidad: 1, nota: '', medallon: false, tipo: 'extra' });
      return { cart: cart, warn: '' };
    });
  }
  function incLine(lineId) {
    setState(function (s) {
      var cart = s.cart.map(function (l) { return Object.assign({}, l); });
      var l = cart.find(function (x) { return x.lineId === lineId; });
      if (l.tipo === 'burger' && burgerTotal(cart) >= 6) return { warn: 'Máximo 6 hamburguesas por pedido' };
      l.cantidad++;
      return { cart: cart, warn: '' };
    });
  }
  function decLine(lineId) {
    setState(function (s) {
      var cart = s.cart.map(function (l) { return Object.assign({}, l); });
      var l = cart.find(function (x) { return x.lineId === lineId; });
      l.cantidad--;
      if (l.cantidad <= 0) cart = cart.filter(function (x) { return x.lineId !== lineId; });
      return { cart: cart, warn: '' };
    });
  }
  function removeLine(lineId) { setState(function (s) { return { cart: s.cart.filter(function (x) { return x.lineId !== lineId; }), warn: '' }; }); }

  // ---------- checkout ----------
  function setNombre(e) { setState({ nombre: e.target.value }); }
  function setTelefono(e) { setState({ telefono: e.target.value }); }
  function setDireccion(e) {
    var v = e.target.value;
    setState({ direccion: v, geoLoading: v.trim().length > 2 });
    clearTimeout(geoTimer);
    if (v.trim().length > 2) {
      geoTimer = setTimeout(function () { setState({ km: calcularKm(v), geoLoading: false }); }, 750);
    } else {
      setState({ km: 0, geoLoading: false });
    }
  }
  function setNotaGeneral(e) { setState({ notaGeneral: e.target.value }); }
  function setRetiro() { setState({ tipoEntrega: 'retiro' }); }
  function setDelivery() { setState({ tipoEntrega: 'delivery' }); }
  function setTransf() { setState({ pago: 'transferencia' }); }
  function setDebito() { setState({ pago: 'debito' }); }
  function setCredito() { setState({ pago: 'credito' }); }

  function confirmar() {
    var s = state;
    var subtotal = s.cart.reduce(function (a, l) { return a + lineUnit(l) * l.cantidad; }, 0);
    var dRaw = deliveryCost(s.km, s.lluvia, s.tipoEntrega);
    var delivery = dRaw || 0;
    var pct = s.pago === 'credito' ? 0.15 : s.pago === 'debito' ? 0.10 : 0;
    var recargo = Math.round((subtotal + delivery) * pct);
    var total = subtotal + delivery + recargo;
    var num = '#' + String(s.orders.length + 1).padStart(3, '0');
    var order = { id: 'o' + Date.now(), num: num, fecha: new Date().toISOString(), cliente: s.nombre.trim(), telefono: s.telefono.trim(), tipo: s.tipoEntrega, direccion: s.direccion.trim(), km: s.km, items: s.cart.map(function (l) { return Object.assign({}, l); }), subtotal: subtotal, delivery: delivery, recargoPct: pct, recargo: recargo, total: total, pago: s.pago, notaGeneral: s.notaGeneral.trim(), estado: 'nuevo' };
    var orders = [order].concat(s.orders);
    saveOrders(orders);
    setState({ lastOrder: Object.assign({}, order, { waLink: buildWa(order) }), cStep: 'ok' });
  }
  function nuevoPedido() { setState({ cart: [], custom: null, nombre: '', telefono: '', tipoEntrega: 'retiro', direccion: '', km: 0, geoLoading: false, pago: 'transferencia', lluvia: false, notaGeneral: '', cStep: 'carta', lastOrder: null }); }

  function advanceEstado(id) {
    var order = ['nuevo', 'prep', 'listo', 'entregado'];
    setState(function (s) {
      var orders = s.orders.map(function (o) {
        if (o.id !== id) return o;
        var i = order.indexOf(o.estado);
        return Object.assign({}, o, { estado: order[(i + 1) % order.length] });
      });
      try { localStorage.setItem('sticky_orders_v1', JSON.stringify(orders)); } catch (e) {}
      return { orders: orders };
    });
  }

  // ---------- offer ----------
  function setOfferTitulo(e) { var v = e.target.value; setState(function (s) { return { offer: Object.assign({}, s.offer, { titulo: v }), offerSaved: false }; }); }
  function setOfferDesc(e) { var v = e.target.value; setState(function (s) { return { offer: Object.assign({}, s.offer, { desc: v }), offerSaved: false }; }); }
  function setOfferPrecio(e) { var v = e.target.value.replace(/[^0-9]/g, ''); setState(function (s) { return { offer: Object.assign({}, s.offer, { precio: v }), offerSaved: false }; }); }
  function setOfferVigencia(e) { var v = e.target.value; setState(function (s) { return { offer: Object.assign({}, s.offer, { vigencia: v }), offerSaved: false }; }); }
  function publicarOferta() {
    setState(function (s) {
      var draft = Object.assign({}, s.offer);
      var saved = s.savedOffers.map(function (o) { return Object.assign({}, o); });
      var editingId = s.editingId;
      if (editingId) { saved = saved.map(function (o) { return o.id === editingId ? Object.assign({}, draft, { id: editingId }) : o; }); }
      else { editingId = 'of' + Date.now(); saved = [Object.assign({}, draft, { id: editingId })].concat(saved); }
      saveOffersList(saved);
      saveOfferDraft(draft);
      return { savedOffers: saved, editingId: editingId, offerSaved: true };
    });
    setTimeout(function () { setState({ offerSaved: false }); }, 2600);
  }
  function usarOferta(o) {
    var rest = Object.assign({}, o); var id = rest.id; delete rest.id;
    setState({ offer: rest, editingId: id, offerSaved: false });
  }
  function eliminarOferta(id) {
    setState(function (s) {
      var saved = s.savedOffers.filter(function (o) { return o.id !== id; });
      saveOffersList(saved);
      return { savedOffers: saved, editingId: s.editingId === id ? null : s.editingId };
    });
  }
  function nuevaOferta() { setState({ offer: { titulo: '', desc: '', precio: '', vigencia: 'Solo hoy' }, editingId: null, offerSaved: false }); }

  function descargarOferta() {
    var ready = Promise.resolve();
    try {
      if (document.fonts) {
        ready = Promise.all([
          document.fonts.load('130px "Anton"'),
          document.fonts.load('700 40px "Oswald"'),
          document.fonts.load('300 40px "Oswald"'),
          document.fonts.ready
        ]);
      }
    } catch (e) {}
    ready.catch(function () {}).then(function () {
      var o = state.offer; var W = 1080, H = 1920;
      var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
      x.fillStyle = '#0b0a09'; x.fillRect(0, 0, W, H);
      x.save(); x.strokeStyle = 'rgba(255,255,255,0.035)'; x.lineWidth = 42;
      for (var i = -H; i < W + H; i += 96) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); }
      x.restore();
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      if (logoImg) {
        var sz = 360, lx = (W - sz) / 2, ly = 130;
        roundRect(x, lx, ly, sz, sz, 46); x.save(); x.clip(); x.drawImage(logoImg, lx, ly, sz, sz); x.restore();
        x.lineWidth = 7; x.strokeStyle = '#E11B22'; roundRect(x, lx, ly, sz, sz, 46); x.stroke();
      }
      var pillY = 560; x.fillStyle = '#E11B22'; roundRect(x, W / 2 - 290, pillY, 580, 92, 46); x.fill();
      x.fillStyle = '#fff'; x.font = '700 48px "Oswald"'; x.textBaseline = 'middle'; x.fillText('OFERTA DEL DÍA', W / 2, pillY + 48);
      x.textBaseline = 'alphabetic';
      x.fillStyle = '#FFC400'; x.font = '128px "Anton"';
      var tl = wrapText(x, String(o.titulo || '').toUpperCase(), W - 120); var ty = 790;
      tl.forEach(function (l) { x.fillText(l, W / 2, ty); ty += 126; });
      x.fillStyle = '#e8e0d4'; x.font = '300 46px "Oswald"';
      var dl = wrapText(x, o.desc, W - 200); var dy = ty + 18;
      dl.forEach(function (l) { x.fillText(l, W / 2, dy); dy += 60; });
      x.fillStyle = '#FFC400'; x.font = '250px "Anton"'; x.fillText(money(o.precio), W / 2, dy + 300);
      x.fillStyle = '#9a9186'; x.font = '300 42px "Oswald"'; x.fillText('Mediodía 11:30–15h · Noche 20–00h', W / 2, H - 230);
      x.fillStyle = '#fff'; x.font = '700 66px "Oswald"'; x.fillText('WhatsApp 3548 574081', W / 2, H - 150);
      x.fillStyle = '#E11B22'; x.font = '600 40px "Oswald"'; x.fillText(String(o.vigencia || 'Solo hoy').toUpperCase(), W / 2, H - 80);
      c.toBlob(function (b) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'oferta-sticky.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      }, 'image/png');
    });
  }

  function setHistDia() { setState({ histView: 'dia' }); }
  function setHistSemana() { setState({ histView: 'semana' }); }
  function setHistMes() { setState({ histView: 'mes' }); }
  function resetDemo() { saveOrders(seed()); render(); }

  // ---------- screen: HOME ----------
  function renderHome() {
    return h('div', { class: 'scr', style: 'padding:56px 26px 40px;display:flex;flex-direction:column;min-height:100vh;' },
      h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:22px;margin-top:26px;' },
        h('div', { style: 'width:184px;height:184px;border-radius:34px;overflow:hidden;border:2px solid #E11B22;box-shadow:0 0 46px rgba(225,27,34,.4);' },
          h('img', { src: 'assets/logo.png', alt: 'Sticky Burgers', style: 'width:100%;height:100%;object-fit:cover;display:block;' })
        ),
        h('div', { style: 'text-align:center;' },
          h('div', { style: "font-family:'Anton',sans-serif;font-size:46px;line-height:.9;letter-spacing:1px;color:#f3ece0;" },
            'STICKY', h('br'), h('span', { style: 'color:#E11B22;' }, 'BURGERS')),
          h('div', { style: "font-family:'Oswald';font-weight:300;letter-spacing:4px;font-size:12px;color:#9a9186;margin-top:12px;text-transform:uppercase;" }, 'Hamburguesas artesanales')
        )
      ),
      h('div', { style: 'flex:1;min-height:30px;' }),
      h('div', { style: 'display:flex;flex-direction:column;gap:13px;margin-top:30px;' },
        h('button', { onClick: goCliente, style: "background:#FFC400;color:#0b0a09;border:none;border-radius:15px;padding:19px;font-family:'Anton',sans-serif;font-size:21px;letter-spacing:.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;" },
          'HACÉ TU PEDIDO ', h('span', { style: 'font-size:22px;' }, '→')),
        h('button', { onClick: goPanel, style: "background:transparent;color:#f3ece0;border:1.5px solid rgba(255,255,255,.2);border-radius:15px;padding:18px;font-family:'Anton',sans-serif;font-size:18px;letter-spacing:.5px;cursor:pointer;" }, 'PANEL DEL LOCAL')
      ),
      h('div', { style: "margin-top:26px;text-align:center;font-family:'Oswald';font-weight:300;font-size:12.5px;color:#6f6860;line-height:1.8;" },
        'Mediodía 11:30–15h · Noche 20–00h', h('br'), 'Delivery hasta 3 km · Trabajamos con reservas')
    );
  }

  function header(title, onBack, extra) {
    return h('div', { style: 'position:sticky;top:0;z-index:20;background:rgba(11,10,9,.94);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.07);padding:13px 16px;display:flex;align-items:center;gap:12px;' },
      h('button', { onClick: onBack, style: 'width:38px;height:38px;border-radius:11px;background:#1a1613;border:1px solid rgba(255,255,255,.08);color:#f3ece0;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;' }, '‹'),
      h('div', { style: "font-family:'Anton';font-size:23px;letter-spacing:.5px;" }, title),
      extra || h('div', { style: 'flex:1' })
    );
  }

  // ---------- screen: CLIENTE / CARTA ----------
  function renderCarta() {
    var cart = state.cart;
    var cartCount = cart.reduce(function (a, l) { return a + l.cantidad; }, 0);
    var subtotal = cart.reduce(function (a, l) { return a + lineUnit(l) * l.cantidad; }, 0);
    var cartHasItems = cart.length > 0;

    var cartBtn = h('button', { onClick: goToCarrito, style: 'position:relative;width:42px;height:42px;border-radius:12px;background:#1a1613;border:1px solid rgba(255,255,255,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;' },
      (function () {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '21'); svg.setAttribute('height', '21'); svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', '#FFC400'); svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
        svg.innerHTML = '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>';
        return svg;
      })(),
      cartHasItems ? h('span', { style: 'position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#E11B22;color:#fff;font-family:\'Oswald\';font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;' }, cartCount) : null
    );

    var menuRows = MENU.map(function (m) {
      var q = cart.filter(function (l) { return l.tipo === 'burger' && l.id === m.id; }).reduce(function (a, l) { return a + l.cantidad; }, 0);
      return h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px;' },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:10px;' },
          h('div', { style: "font-family:'Anton';font-size:19px;letter-spacing:.3px;color:#f3ece0;text-transform:uppercase;" }, m.nombre),
          h('div', { style: "font-family:'Oswald';font-weight:700;font-size:18px;color:#FFC400;white-space:nowrap;" }, money(m.precio))
        ),
        h('div', { style: "font-family:'Oswald';font-weight:300;font-size:13px;line-height:1.45;color:#948b7f;" }, m.desc),
        h('div', { style: 'display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:2px;' },
          q > 0 ? h('span', { style: "font-family:'Oswald';font-weight:600;color:#FFC400;font-size:13.5px;" }, q + ' en pedido') : null,
          h('button', { onClick: function () { openCustom(m); }, style: "background:#E11B22;color:#fff;border:none;border-radius:11px;padding:9px 18px;font-family:'Oswald';font-weight:600;font-size:14px;letter-spacing:.6px;cursor:pointer;" }, 'AGREGAR +')
        )
      );
    });

    var extraRows = EXTRAS.map(function (e) {
      var line = cart.find(function (l) { return l.tipo === 'extra' && l.id === e.id; });
      var q = line ? line.cantidad : 0;
      return h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px;' },
        h('div', { style: "font-family:'Oswald';font-weight:600;font-size:15px;color:#f3ece0;flex:1;text-transform:uppercase;letter-spacing:.3px;" }, e.nombre),
        h('div', { style: "font-family:'Oswald';font-weight:700;font-size:16px;color:#FFC400;" }, money(e.precio)),
        q > 0 ? h('span', { style: "font-family:'Oswald';font-weight:700;color:#FFC400;font-size:13px;" }, '×' + q) : null,
        h('button', { onClick: function () { addExtra(e); }, style: 'width:34px;height:34px;border-radius:10px;background:#E11B22;color:#fff;border:none;font-size:20px;line-height:1;cursor:pointer;' }, '+')
      );
    });

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;' },
      (function () {
        var top = h('div', { style: 'position:sticky;top:0;z-index:20;background:rgba(11,10,9,.94);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.07);padding:13px 16px;display:flex;align-items:center;gap:12px;' },
          h('button', { onClick: goHome, style: 'width:38px;height:38px;border-radius:11px;background:#1a1613;border:1px solid rgba(255,255,255,.08);color:#f3ece0;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;' }, '‹'),
          h('div', { style: "font-family:'Anton';font-size:23px;letter-spacing:.5px;" }, 'LA CARTA'),
          h('div', { style: 'flex:1' }),
          cartBtn
        );
        return top;
      })(),
      h('div', { style: 'flex:1;padding:16px 16px 20px;' },
        h('div', { style: 'background:linear-gradient(120deg,#1a0f0f,#160c0c);border:1px solid rgba(225,27,34,.35);border-radius:14px;padding:12px 14px;display:flex;gap:12px;align-items:center;margin-bottom:20px;' },
          h('div', { style: 'font-size:22px;' }, '🔥'),
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12.5px;line-height:1.5;color:#d8cfc2;" }, 'Todo se cocina en el momento. Pedido máximo ', h('b', { style: 'color:#FFC400;font-weight:600;' }, '6 hamburguesas'), ' por persona.')
        ),
        h('div', { style: "font-family:'Anton';font-size:16px;letter-spacing:1.5px;color:#E11B22;margin:0 0 12px 2px;" }, 'HAMBURGUESAS'),
        h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, menuRows),
        h('div', { style: "font-family:'Anton';font-size:16px;letter-spacing:1.5px;color:#E11B22;margin:24px 0 12px 2px;" }, 'EXTRAS'),
        h('div', { style: 'display:flex;flex-direction:column;gap:10px;' }, extraRows)
      ),
      cartHasItems ? h('div', { style: 'position:sticky;bottom:0;z-index:20;padding:14px 16px 18px;background:linear-gradient(0deg,#0b0a09 72%,rgba(11,10,9,0));' },
        h('button', { onClick: goToCarrito, style: "width:100%;background:#FFC400;color:#0b0a09;border:none;border-radius:15px;padding:16px 18px;font-family:'Anton';font-size:18px;letter-spacing:.4px;cursor:pointer;display:flex;align-items:center;gap:10px;" },
          'VER PEDIDO · ' + (cartCount + (cartCount === 1 ? ' item' : ' items')), h('span', { style: 'flex:1' }), money(subtotal), h('span', { style: 'font-size:18px;' }, '→'))
      ) : null
    );
  }

  // ---------- screen: CUSTOM ----------
  function renderCustom() {
    var cu = state.custom;
    var bTotal = burgerTotal(state.cart);
    var cuMax = 6 - bTotal;
    var cuLine = (cu.precio + (cu.medallon ? MEDALLON : 0)) * cu.cantidad;
    var showMax = cu.cantidad >= cuMax;

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;' },
      header('ARMÁ TU HAMBURGUESA', cancelCustom),
      h('div', { style: 'flex:1;padding:18px 16px;display:flex;flex-direction:column;gap:20px;' },
        h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:16px;' },
          h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:10px;' },
            h('div', { style: "font-family:'Anton';font-size:22px;letter-spacing:.3px;text-transform:uppercase;color:#f3ece0;" }, cu.nombre),
            h('div', { style: "font-family:'Oswald';font-weight:700;font-size:19px;color:#FFC400;white-space:nowrap;" }, money(cu.precio))
          ),
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:13px;line-height:1.45;color:#948b7f;margin-top:8px;" }, cu.desc)
        ),
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'CANTIDAD'),
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between;background:#161311;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:10px 14px;' },
            h('span', { style: "font-family:'Oswald';font-weight:300;font-size:14px;color:#9a9186;" }, '¿Cuántas querés?'),
            h('div', { style: 'display:flex;align-items:center;gap:0;background:#0b0a09;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;' },
              h('button', { onClick: customDec, style: 'width:42px;height:42px;background:none;border:none;color:#f3ece0;font-size:24px;line-height:1;cursor:pointer;' }, '–'),
              h('span', { style: "min-width:34px;text-align:center;font-family:'Oswald';font-weight:700;font-size:20px;color:#FFC400;" }, cu.cantidad),
              h('button', { onClick: customInc, style: 'width:42px;height:42px;background:none;border:none;color:#f3ece0;font-size:22px;line-height:1;cursor:pointer;' }, '+')
            )
          ),
          showMax ? h('div', { style: "margin-top:8px;font-family:'Oswald';font-weight:300;font-size:12px;color:#ff9a9a;" }, 'Llegaste al máximo de 6 hamburguesas por pedido') : null
        ),
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'EXTRA'),
          h('button', { onClick: customToggleMedallon, style: 'width:100%;display:flex;align-items:center;gap:12px;background:#161311;border:1.5px solid;border-radius:14px;padding:14px;cursor:pointer;text-align:left;' + (cu.medallon ? 'border-color:#FFC400;background:#1c1710;' : 'border-color:rgba(255,255,255,.12);') },
            h('div', { style: 'width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;' + (cu.medallon ? 'background:#FFC400;color:#0b0a09;' : 'background:#0b0a09;border:1.5px solid rgba(255,255,255,.18);color:transparent;') }, cu.medallon ? '✓' : ''),
            h('div', { style: 'flex:1;' },
              h('div', { style: "font-family:'Oswald';font-weight:600;font-size:15px;color:#f3ece0;text-transform:uppercase;letter-spacing:.3px;" }, 'Medallón extra'),
              h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12px;color:#9a9186;" }, 'Doble carne en esta hamburguesa')
            ),
            h('div', { style: "font-family:'Oswald';font-weight:700;font-size:16px;color:#FFC400;" }, '+' + money(MEDALLON))
          )
        ),
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'ACLARACIÓN'),
          h('textarea', { value: cu.nota, onChange: customSetNota, rows: '2', placeholder: 'Ej: sin tomate, cortada al medio, poca sal…', 'data-field': 'customNota', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;color:#f3ece0;font-size:14px;font-weight:300;resize:none;' })
        )
      ),
      h('div', { style: 'position:sticky;bottom:0;z-index:20;padding:14px 16px 18px;background:linear-gradient(0deg,#0b0a09 72%,rgba(11,10,9,0));' },
        h('button', { onClick: addCustomToCart, style: "width:100%;background:#FFC400;color:#0b0a09;border:none;border-radius:15px;padding:17px;font-family:'Anton';font-size:18px;letter-spacing:.4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;" },
          'AGREGAR AL PEDIDO', h('span', { style: 'flex:1' }), money(cuLine))
      )
    );
  }

  // ---------- screen: CARRITO ----------
  function renderCarrito() {
    var cart = state.cart;
    var bTotal = burgerTotal(cart);
    var subtotal = cart.reduce(function (a, l) { return a + lineUnit(l) * l.cantidad; }, 0);

    var lineRows = cart.map(function (l) {
      var hasNota = !!(l.nota && l.nota.trim());
      var hasMeta = !!l.medallon || hasNota;
      return h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;' },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px;' },
          h('div', { style: "font-family:'Anton';font-size:17px;letter-spacing:.3px;text-transform:uppercase;" }, l.nombre),
          h('button', { onClick: function () { removeLine(l.lineId); }, style: 'background:none;border:none;color:#6f6860;font-size:15px;cursor:pointer;padding:0;' }, '✕')
        ),
        h('div', { style: 'display:flex;align-items:center;gap:12px;margin-top:10px;' },
          h('div', { style: 'display:flex;align-items:center;gap:0;background:#0b0a09;border:1px solid rgba(255,255,255,.1);border-radius:11px;overflow:hidden;' },
            h('button', { onClick: function () { decLine(l.lineId); }, style: 'width:36px;height:36px;background:none;border:none;color:#f3ece0;font-size:20px;cursor:pointer;' }, '–'),
            h('span', { style: "min-width:26px;text-align:center;font-family:'Oswald';font-weight:700;font-size:16px;color:#FFC400;" }, l.cantidad),
            h('button', { onClick: function () { incLine(l.lineId); }, style: 'width:36px;height:36px;background:none;border:none;color:#f3ece0;font-size:20px;cursor:pointer;' }, '+')
          ),
          h('div', { style: "flex:1;text-align:right;font-family:'Oswald';font-weight:700;font-size:17px;color:#f3ece0;" }, money(lineUnit(l) * l.cantidad))
        ),
        hasMeta ? h('div', { style: 'margin-top:11px;display:flex;flex-direction:column;gap:6px;' },
          l.medallon ? h('div', { style: "font-family:'Oswald';font-weight:600;font-size:12.5px;color:#FFC400;display:flex;align-items:center;gap:6px;" }, h('span', {}, '＋'), 'Medallón extra') : null,
          hasNota ? h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12.5px;color:#b7afa2;line-height:1.4;" }, '“' + l.nota + '”') : null
        ) : null
      );
    });

    var body;
    if (cart.length === 0) {
      body = h('div', { style: "text-align:center;padding:70px 20px;color:#6f6860;font-family:'Oswald';font-weight:300;" },
        h('div', { style: 'font-size:40px;margin-bottom:12px;' }, '🛒'), 'Tu pedido está vacío.', h('br'),
        h('button', { onClick: backToCarta, style: "margin-top:20px;background:#E11B22;color:#fff;border:none;border-radius:12px;padding:12px 22px;font-family:'Oswald';font-weight:600;font-size:14px;cursor:pointer;" }, 'VER LA CARTA')
      );
    } else {
      var barColor = bTotal >= 6 ? '#E11B22' : '#FFC400';
      body = h('div', {},
        h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:11px 14px;display:flex;align-items:center;gap:12px;margin-bottom:14px;' },
          h('div', { style: 'flex:1;' },
            h('div', { style: "font-family:'Oswald';font-weight:600;font-size:13px;color:#d8cfc2;" }, bTotal + ' de 6 hamburguesas'),
            h('div', { style: 'height:6px;border-radius:4px;background:#0b0a09;margin-top:6px;overflow:hidden;' },
              h('div', { style: 'height:100%;background:' + barColor + ';width:' + Math.min(100, bTotal / 6 * 100) + '%;border-radius:4px;transition:width .2s;' }))
          )
        ),
        state.warn ? h('div', { style: "background:#2a0f0f;border:1px solid #E11B22;color:#ff9a9a;border-radius:10px;padding:9px 12px;font-family:'Oswald';font-weight:300;font-size:12.5px;margin-bottom:14px;" }, state.warn) : null,
        h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, lineRows),
        h('div', { style: 'margin-top:18px;background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;' },
          h('span', { style: "font-family:'Oswald';font-weight:300;font-size:15px;color:#9a9186;" }, 'Subtotal'),
          h('span', { style: "font-family:'Anton';font-size:24px;color:#FFC400;" }, money(subtotal))
        )
      );
    }

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;' },
      header('TU PEDIDO', backToCarta),
      h('div', { style: 'flex:1;padding:16px;' }, body),
      cart.length > 0 ? h('div', { style: 'position:sticky;bottom:0;z-index:20;padding:14px 16px 18px;background:linear-gradient(0deg,#0b0a09 72%,rgba(11,10,9,0));' },
        h('button', { onClick: goToCheckout, style: "width:100%;background:#FFC400;color:#0b0a09;border:none;border-radius:15px;padding:17px;font-family:'Anton';font-size:19px;letter-spacing:.4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;" },
          'CONTINUAR ', h('span', { style: 'font-size:19px;' }, '→'))
      ) : null
    );
  }

  // ---------- screen: CHECKOUT ----------
  function renderCheckout() {
    var s = state;
    var cart = s.cart;
    var subtotal = cart.reduce(function (a, l) { return a + lineUnit(l) * l.cantidad; }, 0);
    var bTotal = burgerTotal(cart);
    var isDelivery = s.tipoEntrega === 'delivery';
    var addrReady = isDelivery && !s.geoLoading && !!s.direccion.trim();
    var dRaw = addrReady ? deliveryCost(s.km, s.lluvia, 'delivery') : 0;
    var fueraRadio = addrReady && dRaw === null;
    var delivery = (addrReady && dRaw) ? dRaw : 0;
    var pct = s.pago === 'credito' ? 0.15 : s.pago === 'debito' ? 0.10 : 0;
    var recargo = Math.round((subtotal + delivery) * pct);
    var total = subtotal + delivery + recargo;
    var canConfirm = cart.length > 0 && bTotal <= 6 && s.nombre.trim() && s.telefono.trim() && (!isDelivery || (s.direccion.trim() && !s.geoLoading && !fueraRadio));

    var confirmHint = '';
    if (!cart.length) confirmHint = 'Tu pedido está vacío';
    else if (!s.nombre.trim()) confirmHint = 'Completá tu nombre';
    else if (!s.telefono.trim()) confirmHint = 'Completá tu teléfono';
    else if (isDelivery && !s.direccion.trim()) confirmHint = 'Completá la dirección';
    else if (isDelivery && s.geoLoading) confirmHint = 'Calculando distancia…';
    else if (fueraRadio) confirmHint = 'Dirección fuera del radio de reparto';

    var distanciaLabel = s.geoLoading ? 'Calculando…' : (!s.direccion.trim() ? 'Ingresá la dirección' : (s.km.toString().replace('.', ',') + ' km'));
    var distanciaColor = s.geoLoading ? '#9a9186' : (!s.direccion.trim() ? '#6f6860' : '#FFC400');
    var deliveryFmt = !isDelivery ? '' : (s.geoLoading ? 'Calculando…' : (!s.direccion.trim() ? '—' : (fueraRadio ? 'Fuera de radio' : money(delivery))));
    var deliveryColor = fueraRadio ? '#ff9a9a' : '#f3ece0';

    var deliverySection = isDelivery ? h('div', { style: 'margin-top:12px;display:flex;flex-direction:column;gap:10px;' },
      h('input', { value: s.direccion, onChange: setDireccion, placeholder: 'Dirección (calle y número)', 'data-field': 'direccion', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;color:#f3ece0;font-size:15px;' }),
      h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;' },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px;' },
          h('span', { style: "font-family:'Oswald';font-weight:300;font-size:14px;color:#9a9186;display:flex;align-items:center;gap:6px;" }, 'Distancia estimada'),
          h('span', { style: "font-family:'Oswald';font-weight:700;font-size:15px;color:" + distanciaColor + ';' }, distanciaLabel)
        ),
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);' },
          h('span', { style: "font-family:'Oswald';font-weight:600;font-size:14px;color:#d8cfc2;" }, 'Costo de envío'),
          h('span', { style: "font-family:'Oswald';font-weight:700;font-size:16px;color:" + deliveryColor + ';' }, deliveryFmt)
        )
      ),
      fueraRadio ? h('div', { style: "background:#2a0f0f;border:1px solid #E11B22;color:#ff9a9a;border-radius:10px;padding:9px 12px;font-family:'Oswald';font-weight:300;font-size:12.5px;" }, 'Esa dirección queda fuera del radio de reparto (máx. 3 km). Escribí otra o elegí retiro en local.') : null
    ) : null;

    return h('div', { style: 'display:flex;flex-direction:column;min-height:100vh;' },
      header('FINALIZAR', backToCarrito),
      h('div', { style: 'flex:1;padding:18px 16px;display:flex;flex-direction:column;gap:22px;' },
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'TUS DATOS'),
          h('div', { style: 'display:flex;flex-direction:column;gap:10px;' },
            h('input', { value: s.nombre, onChange: setNombre, placeholder: 'Nombre y apellido', 'data-field': 'nombre', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;color:#f3ece0;font-size:15px;' }),
            h('input', { value: s.telefono, onChange: setTelefono, inputmode: 'numeric', placeholder: 'Teléfono / WhatsApp', 'data-field': 'telefono', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;color:#f3ece0;font-size:15px;' })
          )
        ),
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'ENTREGA'),
          h('div', { style: 'display:flex;gap:10px;' },
            h('button', { onClick: setRetiro, style: 'flex:1;padding:13px;border-radius:12px;border:1.5px solid;font-family:\'Oswald\';font-weight:600;font-size:14px;letter-spacing:.5px;cursor:pointer;text-transform:uppercase;' + seg(!isDelivery) }, 'Retiro en local'),
            h('button', { onClick: setDelivery, style: 'flex:1;padding:13px;border-radius:12px;border:1.5px solid;font-family:\'Oswald\';font-weight:600;font-size:14px;letter-spacing:.5px;cursor:pointer;text-transform:uppercase;' + seg(isDelivery) }, 'Delivery')
          ),
          deliverySection
        ),
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'PAGO'),
          h('div', { style: 'display:flex;gap:8px;' },
            h('button', { onClick: setTransf, style: 'flex:1;padding:12px 4px;border-radius:12px;border:1.5px solid;font-family:\'Oswald\';font-weight:600;font-size:12.5px;cursor:pointer;text-transform:uppercase;' + seg(s.pago === 'transferencia') }, 'Transfer.'),
            h('button', { onClick: setDebito, style: 'flex:1;padding:12px 4px;border-radius:12px;border:1.5px solid;font-family:\'Oswald\';font-weight:600;font-size:12.5px;cursor:pointer;text-transform:uppercase;' + seg(s.pago === 'debito') }, 'Débito +10%'),
            h('button', { onClick: setCredito, style: 'flex:1;padding:12px 4px;border-radius:12px;border:1.5px solid;font-family:\'Oswald\';font-weight:600;font-size:12.5px;cursor:pointer;text-transform:uppercase;' + seg(s.pago === 'credito') }, 'Crédito +15%')
          )
        ),
        h('div', {},
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'NOTA GENERAL'),
          h('textarea', { value: s.notaGeneral, onChange: setNotaGeneral, placeholder: 'Horario deseado, referencias del domicilio, etc.', rows: '2', 'data-field': 'notaGeneral', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;color:#f3ece0;font-size:14px;font-weight:300;resize:none;' })
        ),
        h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;' },
          h('div', { style: 'display:flex;justify-content:space-between;margin-bottom:9px;' }, h('span', { style: "font-family:'Oswald';font-weight:300;color:#9a9186;font-size:14px;" }, 'Subtotal'), h('span', { style: "font-family:'Oswald';font-weight:600;font-size:15px;" }, money(subtotal))),
          isDelivery ? h('div', { style: 'display:flex;justify-content:space-between;margin-bottom:9px;' }, h('span', { style: "font-family:'Oswald';font-weight:300;color:#9a9186;font-size:14px;" }, 'Envío'), h('span', { style: "font-family:'Oswald';font-weight:600;font-size:15px;" }, deliveryFmt)) : null,
          recargo > 0 ? h('div', { style: 'display:flex;justify-content:space-between;margin-bottom:9px;' }, h('span', { style: "font-family:'Oswald';font-weight:300;color:#9a9186;font-size:14px;" }, 'Recargo ' + (s.pago === 'credito' ? 'crédito (15%)' : 'débito (10%)')), h('span', { style: "font-family:'Oswald';font-weight:600;font-size:15px;" }, money(recargo))) : null,
          h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);' }, h('span', { style: "font-family:'Anton';font-size:18px;" }, 'TOTAL'), h('span', { style: "font-family:'Anton';font-size:28px;color:#FFC400;" }, money(total)))
        )
      ),
      h('div', { style: 'position:sticky;bottom:0;z-index:20;padding:14px 16px 18px;background:linear-gradient(0deg,#0b0a09 72%,rgba(11,10,9,0));' },
        h('button', { onClick: confirmar, disabled: !canConfirm, style: 'width:100%;border:none;border-radius:15px;padding:17px;font-family:\'Anton\';font-size:19px;letter-spacing:.4px;cursor:pointer;' + (canConfirm ? 'background:#FFC400;color:#0b0a09;' : 'background:#2a2723;color:#6f6860;') }, 'CONFIRMAR PEDIDO · ' + money(total)),
        !canConfirm ? h('div', { style: "text-align:center;margin-top:8px;font-family:'Oswald';font-weight:300;font-size:12px;color:#6f6860;" }, confirmHint) : null
      )
    );
  }

  // ---------- screen: OK ----------
  function renderOk() {
    var lo = state.lastOrder;
    var okItems = lo ? lo.items.map(function (it) {
      var det = [it.medallon ? 'medallón extra' : '', it.nota].filter(Boolean).join(', ');
      return { label: it.cantidad + 'x ' + it.nombre + (det ? (' (' + det + ')') : ''), sub: money((it.precio + (it.medallon ? MEDALLON : 0)) * it.cantidad) };
    }) : [];

    return h('div', { style: 'min-height:100vh;display:flex;flex-direction:column;padding:40px 22px;' },
      h('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px;' },
        h('div', { style: 'width:88px;height:88px;border-radius:50%;background:#39b34a;display:flex;align-items:center;justify-content:center;box-shadow:0 0 44px rgba(57,179,74,.4);' },
          (function () {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '44'); svg.setAttribute('height', '44'); svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', '#fff'); svg.setAttribute('stroke-width', '3'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
            svg.innerHTML = '<path d="M5 13l4 4L19 7"/>';
            return svg;
          })()
        ),
        h('div', { style: "font-family:'Anton';font-size:32px;letter-spacing:.5px;" }, '¡PEDIDO LISTO!'),
        h('div', { style: "font-family:'Oswald';font-weight:300;font-size:14.5px;color:#9a9186;line-height:1.6;max-width:300px;" }, 'Tu pedido ', h('b', { style: 'color:#FFC400;font-weight:600;' }, lo ? lo.num : ''), ' quedó registrado. Enviálo por WhatsApp para confirmar con el local.'),
        h('div', { style: 'width:100%;max-width:340px;background:#161311;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;text-align:left;margin-top:8px;' },
          okItems.map(function (it) { return h('div', { style: "display:flex;justify-content:space-between;gap:10px;font-family:'Oswald';font-weight:300;font-size:13.5px;color:#d8cfc2;margin-bottom:6px;" }, h('span', {}, it.label), h('span', { style: 'color:#9a9186;' }, it.sub)); }),
          h('div', { style: 'display:flex;justify-content:space-between;margin-top:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);' }, h('span', { style: "font-family:'Anton';font-size:17px;" }, 'TOTAL'), h('span', { style: "font-family:'Anton';font-size:22px;color:#FFC400;" }, lo ? money(lo.total) : ''))
        )
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:11px;' },
        h('a', { href: lo ? lo.waLink : '#', target: '_blank', style: "text-decoration:none;width:100%;background:#25D366;color:#04310f;border:none;border-radius:15px;padding:17px;font-family:'Anton';font-size:18px;letter-spacing:.4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;" },
          (function () {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', '#04310f');
            svg.innerHTML = '<path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .3-3.4-.7-2.9-1.2-4.7-4.1-4.8-4.3-.2-.2-1.2-1.6-1.2-3 0-1.4.8-2.1 1-2.4.3-.3.6-.3.8-.3h.6c.2 0 .5-.1.7.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.2.2-.4.4-.2.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.6-.1l2.1 1c.3.1.5.2.5.4.1.2.1.9-.1 1.4Z"/>';
            return svg;
          })(),
          'ENVIAR POR WHATSAPP'
        ),
        h('button', { onClick: nuevoPedido, style: "width:100%;background:transparent;color:#f3ece0;border:1.5px solid rgba(255,255,255,.2);border-radius:15px;padding:15px;font-family:'Anton';font-size:16px;letter-spacing:.4px;cursor:pointer;" }, 'HACER OTRO PEDIDO')
      )
    );
  }

  function renderCliente() {
    switch (state.cStep) {
      case 'custom': return renderCustom();
      case 'carrito': return renderCarrito();
      case 'checkout': return renderCheckout();
      case 'ok': return renderOk();
      default: return renderCarta();
    }
  }

  // ---------- PANEL: PEDIDOS ----------
  function renderPanelPedidos() {
    var orders = state.orders.map(function (o) {
      var est = EST_MAP[o.estado] || EST_MAP.nuevo;
      var d = new Date(o.fecha);
      return {
        num: o.num,
        horaFmt: d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        cliente: o.cliente || '—',
        tipoLabel: o.tipo === 'delivery' ? ('Delivery · ' + (o.direccion || '')) : 'Retiro en local',
        totalFmt: money(o.total),
        pagoLabel: pagoLabel(o.pago),
        estadoLabel: est.l,
        chipStyle: 'background:' + est.c + '26;color:' + est.c + ';border:1px solid ' + est.c + '66;',
        id: o.id,
        itemsView: o.items.map(function (it) {
          var det = [it.medallon ? 'medallón extra' : '', it.nota].filter(Boolean).join(', ');
          return { qtyLabel: it.cantidad + 'x', nombre: it.nombre, notaLabel: det ? (' — ' + det) : '' };
        })
      };
    });

    var rows = orders.map(function (o) {
      return h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;' },
        h('div', { style: 'display:flex;align-items:center;gap:10px;' },
          h('div', { style: "font-family:'Anton';font-size:17px;color:#FFC400;" }, o.num),
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12px;color:#6f6860;" }, o.horaFmt),
          h('div', { style: 'flex:1' }),
          h('button', { onClick: function () { advanceEstado(o.id); }, style: 'padding:5px 11px;border-radius:9px;font-family:\'Oswald\';font-weight:700;font-size:11px;letter-spacing:.5px;cursor:pointer;' + o.chipStyle }, o.estadoLabel)
        ),
        h('div', { style: "display:flex;gap:8px;align-items:center;margin-top:9px;font-family:'Oswald';font-weight:600;font-size:14px;color:#f3ece0;" },
          h('span', {}, o.cliente), h('span', { style: 'color:#3a352f;' }, '·'), h('span', { style: 'font-weight:300;color:#9a9186;font-size:13px;' }, o.tipoLabel)
        ),
        h('div', { style: 'margin-top:8px;display:flex;flex-direction:column;gap:3px;' },
          o.itemsView.map(function (it) { return h('div', { style: "font-family:'Oswald';font-weight:300;font-size:13px;color:#b7afa2;line-height:1.4;" }, h('span', { style: 'color:#FFC400;font-weight:600;' }, it.qtyLabel), ' ' + it.nombre, h('span', { style: 'color:#6f6860;' }, it.notaLabel)); })
        ),
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:11px;padding-top:11px;border-top:1px solid rgba(255,255,255,.07);' },
          h('span', { style: "font-family:'Oswald';font-weight:300;font-size:12px;color:#6f6860;" }, o.pagoLabel),
          h('span', { style: "font-family:'Anton';font-size:20px;color:#f3ece0;" }, o.totalFmt)
        )
      );
    });

    return h('div', { style: 'flex:1;padding:16px;' },
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;' },
        h('div', { style: "font-family:'Oswald';font-weight:300;font-size:13px;color:#9a9186;" }, 'Tocá el estado para avanzarlo'),
        h('div', { style: "font-family:'Oswald';font-weight:600;font-size:13px;color:#FFC400;" }, state.orders.length + ' pedidos')
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, rows)
    );
  }

  // ---------- PANEL: OFERTA ----------
  function renderPanelOferta() {
    var s = state;
    var savedRows = s.savedOffers.map(function (o) {
      return h('div', { style: 'background:#161311;border:1.5px solid;border-radius:14px;padding:12px 13px;display:flex;align-items:center;gap:11px;' + (o.id === s.editingId ? 'border-color:#FFC400;' : 'border-color:rgba(255,255,255,.06);') },
        h('div', { style: 'flex:1;min-width:0;' },
          h('div', { style: "font-family:'Oswald';font-weight:600;font-size:14.5px;color:#f3ece0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" }, o.titulo || '(sin título)'),
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12px;color:#9a9186;" }, money(o.precio) + ' · ' + (o.vigencia || ''))
        ),
        o.id === s.editingId ? h('span', { style: "font-family:'Oswald';font-weight:700;font-size:10px;color:#FFC400;letter-spacing:.5px;" }, 'EN EDICIÓN') : null,
        h('button', { onClick: function () { usarOferta(o); }, style: "background:#FFC400;color:#0b0a09;border:none;border-radius:9px;padding:8px 14px;font-family:'Oswald';font-weight:700;font-size:12px;letter-spacing:.4px;cursor:pointer;" }, 'USAR'),
        h('button', { onClick: function () { eliminarOferta(o.id); }, style: 'width:32px;height:32px;flex-shrink:0;border-radius:9px;background:#0b0a09;border:1px solid rgba(255,255,255,.1);color:#6f6860;font-size:14px;cursor:pointer;' }, '✕')
      );
    });

    var offerPrecioFmt = money(s.offer.precio);
    var offerVigenciaUp = String(s.offer.vigencia || 'Solo hoy').toUpperCase();

    return h('div', { style: 'flex:1;padding:16px;' },
      h('div', { style: "font-family:'Oswald';font-weight:300;font-size:13px;color:#9a9186;margin-bottom:14px;line-height:1.5;" }, 'Armá la oferta del día y descargá la imagen 9:16 lista para tu estado de WhatsApp.'),
      s.savedOffers.length > 0 ? h('div', { style: 'margin-bottom:20px;' },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;' },
          h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;" }, 'MIS OFERTAS'),
          h('button', { onClick: nuevaOferta, style: "background:#1a1613;color:#f3ece0;border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:6px 13px;font-family:'Oswald';font-weight:600;font-size:11.5px;letter-spacing:.4px;cursor:pointer;text-transform:uppercase;white-space:nowrap;" }, '＋ Nueva')
        ),
        h('div', { style: 'display:flex;flex-direction:column;gap:9px;' }, savedRows)
      ) : null,
      h('div', { style: 'display:flex;flex-direction:column;gap:10px;margin-bottom:18px;' },
        h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:-2px;" }, s.editingId ? 'EDITAR OFERTA' : 'NUEVA OFERTA'),
        h('div', {},
          h('div', { style: "font-family:'Oswald';font-weight:600;font-size:12px;color:#E11B22;letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;" }, 'Título'),
          h('input', { value: s.offer.titulo, onChange: setOfferTitulo, placeholder: '2x Queso Simple', 'data-field': 'offerTitulo', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;color:#f3ece0;font-size:15px;' })
        ),
        h('div', {},
          h('div', { style: "font-family:'Oswald';font-weight:600;font-size:12px;color:#E11B22;letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;" }, 'Descripción'),
          h('textarea', { value: s.offer.desc, onChange: setOfferDesc, rows: '2', placeholder: 'Dos hamburguesas Queso Simple con papas', 'data-field': 'offerDesc', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;color:#f3ece0;font-size:14px;font-weight:300;resize:none;' })
        ),
        h('div', { style: 'display:flex;gap:10px;' },
          h('div', { style: 'flex:1;' },
            h('div', { style: "font-family:'Oswald';font-weight:600;font-size:12px;color:#E11B22;letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;" }, 'Precio $'),
            h('input', { value: s.offer.precio, onChange: setOfferPrecio, inputmode: 'numeric', 'data-field': 'offerPrecio', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;color:#FFC400;font-weight:700;font-size:16px;' })
          ),
          h('div', { style: 'flex:1;' },
            h('div', { style: "font-family:'Oswald';font-weight:600;font-size:12px;color:#E11B22;letter-spacing:.5px;text-transform:uppercase;margin-bottom:5px;" }, 'Vigencia'),
            h('input', { value: s.offer.vigencia, onChange: setOfferVigencia, placeholder: 'Solo hoy', 'data-field': 'offerVigencia', style: 'width:100%;background:#161311;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px;color:#f3ece0;font-size:14px;' })
          )
        )
      ),
      h('div', { style: 'display:flex;justify-content:center;margin-bottom:16px;' },
        h('div', { style: 'width:270px;height:480px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.12);position:relative;background:#0b0a09;background-image:repeating-linear-gradient(135deg,#111 0 14px,#0a0908 14px 28px);display:flex;flex-direction:column;align-items:center;padding:22px 18px;' },
          h('div', { style: 'width:96px;height:96px;border-radius:20px;overflow:hidden;border:2px solid #E11B22;box-shadow:0 0 24px rgba(225,27,34,.45);' }, h('img', { src: 'assets/logo.png', style: 'width:100%;height:100%;object-fit:cover;display:block;' })),
          h('div', { style: "margin-top:14px;background:#E11B22;color:#fff;font-family:'Oswald';font-weight:700;font-size:12px;letter-spacing:1.5px;padding:6px 16px;border-radius:20px;" }, 'OFERTA DEL DÍA'),
          h('div', { style: "margin-top:14px;font-family:'Anton';font-size:30px;line-height:.95;color:#FFC400;text-align:center;text-transform:uppercase;" }, s.offer.titulo),
          h('div', { style: "margin-top:10px;font-family:'Oswald';font-weight:300;font-size:12.5px;line-height:1.4;color:#e8e0d4;text-align:center;" }, s.offer.desc),
          h('div', { style: 'flex:1' }),
          h('div', { style: "font-family:'Anton';font-size:60px;line-height:1;color:#FFC400;" }, offerPrecioFmt),
          h('div', { style: 'flex:1' }),
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:10px;color:#9a9186;text-align:center;" }, 'Mediodía 11:30–15h · Noche 20–00h'),
          h('div', { style: "font-family:'Oswald';font-weight:700;font-size:15px;color:#fff;margin-top:3px;" }, 'WhatsApp 3548 574081'),
          h('div', { style: "font-family:'Oswald';font-weight:600;font-size:10px;color:#E11B22;letter-spacing:1px;margin-top:4px;text-transform:uppercase;" }, offerVigenciaUp)
        )
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:10px;' },
        h('button', { onClick: descargarOferta, style: "width:100%;background:#FFC400;color:#0b0a09;border:none;border-radius:14px;padding:16px;font-family:'Anton';font-size:17px;letter-spacing:.4px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;" },
          (function () {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '20'); svg.setAttribute('height', '20'); svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', '#0b0a09'); svg.setAttribute('stroke-width', '2.4'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
            svg.innerHTML = '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>';
            return svg;
          })(),
          'DESCARGAR IMAGEN'
        ),
        h('button', { onClick: publicarOferta, style: "width:100%;background:transparent;color:#f3ece0;border:1.5px solid rgba(255,255,255,.2);border-radius:14px;padding:14px;font-family:'Anton';font-size:15px;letter-spacing:.4px;cursor:pointer;" }, s.editingId ? 'GUARDAR CAMBIOS' : 'GUARDAR EN MIS OFERTAS'),
        s.offerSaved ? h('div', { style: "text-align:center;font-family:'Oswald';font-weight:300;font-size:12.5px;color:#39b34a;" }, '✓ Guardada en mis ofertas') : null
      )
    );
  }

  // ---------- PANEL: INFORMES ----------
  function renderPanelInformes() {
    var all = state.orders;
    var now = new Date();
    function sameDay(f) { var x = new Date(f); return x.getDate() === now.getDate() && x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); }
    var hoy = all.filter(function (o) { return sameDay(o.fecha); });
    var hoyTotal = hoy.reduce(function (a, o) { return a + o.total; }, 0);
    var ticket = hoy.length ? hoyTotal / hoy.length : 0;

    var tally = {};
    all.forEach(function (o) { o.items.forEach(function (it) { if (it.tipo !== 'burger') return; tally[it.nombre] = (tally[it.nombre] || 0) + it.cantidad; }); });
    var ranking = Object.entries(tally).map(function (e) { return { nombre: e[0], cantidad: e[1] }; }).sort(function (a, b) { return b.cantidad - a.cantidad; });
    var maxC = ranking.length ? ranking[0].cantidad : 1;
    ranking = ranking.map(function (r, i) { return { nombre: r.nombre, cantidad: r.cantidad, rank: i + 1, pct: Math.round(r.cantidad / maxC * 100) + '%' }; });

    var groups = {};
    all.forEach(function (o) {
      var x = new Date(o.fecha); var k, label;
      if (state.histView === 'dia') { k = x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); label = x.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }); }
      else if (state.histView === 'semana') { k = x.getFullYear() + '-W' + isoWeek(x); label = 'Semana ' + isoWeek(x); }
      else { k = x.getFullYear() + '-' + x.getMonth(); label = x.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }); }
      if (!groups[k]) groups[k] = { label: label, total: 0, pedidos: 0, sort: x.getTime() };
      groups[k].total += o.total; groups[k].pedidos++; if (x.getTime() > groups[k].sort) groups[k].sort = x.getTime();
    });
    var hist = Object.values(groups).sort(function (a, b) { return b.sort - a.sort; }).slice(0, 8);
    var maxT = hist.length ? Math.max.apply(null, hist.map(function (g) { return g.total; })) : 1;
    var historial = hist.map(function (g) { return { label: g.label, totalFmt: money(g.total), pedidosLabel: g.pedidos + (g.pedidos === 1 ? ' pedido' : ' pedidos'), pct: Math.round(g.total / maxT * 100) + '%' }; });

    return h('div', { style: 'flex:1;padding:16px;' },
      h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:10px;" }, 'HOY'),
      h('div', { style: 'display:flex;gap:10px;margin-bottom:22px;' },
        h('div', { style: 'flex:1.4;background:linear-gradient(140deg,#1c1712,#161311);border:1px solid rgba(255,196,0,.25);border-radius:16px;padding:15px;' },
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12px;color:#9a9186;" }, 'Vendido hoy'),
          h('div', { style: "font-family:'Anton';font-size:30px;color:#FFC400;margin-top:4px;line-height:1;" }, money(hoyTotal))
        ),
        h('div', { style: 'flex:1;background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:15px;' },
          h('div', { style: "font-family:'Oswald';font-weight:300;font-size:12px;color:#9a9186;" }, 'Pedidos'),
          h('div', { style: "font-family:'Anton';font-size:30px;color:#f3ece0;margin-top:4px;line-height:1;" }, hoy.length)
        )
      ),
      h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:13px 15px;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;' },
        h('span', { style: "font-family:'Oswald';font-weight:300;font-size:13px;color:#9a9186;" }, 'Ticket promedio'),
        h('span', { style: "font-family:'Oswald';font-weight:700;font-size:17px;color:#f3ece0;" }, money(ticket))
      ),
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;' },
        h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;" }, 'HISTORIAL'),
        h('div', { style: 'display:flex;gap:4px;background:#161311;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:3px;' },
          h('button', { onClick: setHistDia, style: 'padding:5px 12px;border:none;border-radius:8px;font-family:\'Oswald\';font-weight:600;font-size:11.5px;cursor:pointer;text-transform:uppercase;' + pillStyle(state.histView === 'dia') }, 'Día'),
          h('button', { onClick: setHistSemana, style: 'padding:5px 12px;border:none;border-radius:8px;font-family:\'Oswald\';font-weight:600;font-size:11.5px;cursor:pointer;text-transform:uppercase;' + pillStyle(state.histView === 'semana') }, 'Semana'),
          h('button', { onClick: setHistMes, style: 'padding:5px 12px;border:none;border-radius:8px;font-family:\'Oswald\';font-weight:600;font-size:11.5px;cursor:pointer;text-transform:uppercase;' + pillStyle(state.histView === 'mes') }, 'Mes')
        )
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin-bottom:24px;' },
        historial.map(function (hg) {
          return h('div', { style: 'background:#161311;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:11px 14px;' },
            h('div', { style: 'display:flex;justify-content:space-between;align-items:center;' },
              h('span', { style: "font-family:'Oswald';font-weight:600;font-size:13.5px;color:#f3ece0;text-transform:capitalize;" }, hg.label),
              h('span', { style: "font-family:'Oswald';font-weight:700;font-size:15px;color:#FFC400;" }, hg.totalFmt)
            ),
            h('div', { style: 'display:flex;align-items:center;gap:10px;margin-top:7px;' },
              h('div', { style: 'flex:1;height:6px;border-radius:4px;background:#0b0a09;overflow:hidden;' }, h('div', { style: 'height:100%;width:' + hg.pct + ';background:#E11B22;border-radius:4px;' })),
              h('span', { style: "font-family:'Oswald';font-weight:300;font-size:11px;color:#6f6860;white-space:nowrap;" }, hg.pedidosLabel)
            )
          );
        })
      ),
      h('div', { style: "font-family:'Anton';font-size:15px;letter-spacing:1px;color:#E11B22;margin-bottom:12px;" }, 'RANKING DE HAMBURGUESAS'),
      h('div', { style: 'display:flex;flex-direction:column;gap:11px;margin-bottom:24px;' },
        ranking.map(function (r) {
          return h('div', {},
            h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;' },
              h('span', { style: "font-family:'Oswald';font-weight:600;font-size:13.5px;color:#f3ece0;" }, h('span', { style: 'color:#6f6860;' }, r.rank + '.'), ' ' + r.nombre),
              h('span', { style: "font-family:'Oswald';font-weight:700;font-size:13px;color:#FFC400;" }, r.cantidad)
            ),
            h('div', { style: 'height:8px;border-radius:5px;background:#161311;overflow:hidden;' }, h('div', { style: 'height:100%;width:' + r.pct + ';background:linear-gradient(90deg,#E11B22,#FFC400);border-radius:5px;' }))
          );
        })
      ),
      h('button', { onClick: resetDemo, style: "margin-top:22px;width:100%;background:transparent;color:#6f6860;border:1px dashed rgba(255,255,255,.14);border-radius:12px;padding:12px;font-family:'Oswald';font-weight:500;font-size:12px;letter-spacing:.5px;cursor:pointer;text-transform:uppercase;" }, 'Reiniciar datos de ejemplo')
    );
  }

  function renderPanel() {
    var s = state;
    var tabsRow = h('div', { style: 'display:flex;padding:0 10px 0;gap:4px;' },
      h('button', { onClick: tabPedidos, style: 'flex:1;background:none;border:none;padding:11px 4px 12px;font-family:\'Oswald\';font-weight:600;font-size:13px;letter-spacing:.4px;text-transform:uppercase;cursor:pointer;border-bottom:2.5px solid;' + tabStyle(s.panelTab === 'pedidos') }, 'Pedidos'),
      h('button', { onClick: tabOferta, style: 'flex:1;background:none;border:none;padding:11px 4px 12px;font-family:\'Oswald\';font-weight:600;font-size:13px;letter-spacing:.4px;text-transform:uppercase;cursor:pointer;border-bottom:2.5px solid;' + tabStyle(s.panelTab === 'oferta') }, 'Oferta'),
      h('button', { onClick: tabInformes, style: 'flex:1;background:none;border:none;padding:11px 4px 12px;font-family:\'Oswald\';font-weight:600;font-size:13px;letter-spacing:.4px;text-transform:uppercase;cursor:pointer;border-bottom:2.5px solid;' + tabStyle(s.panelTab === 'informes') }, 'Informes')
    );
    var topBar = h('div', { style: 'position:sticky;top:0;z-index:20;background:rgba(11,10,9,.96);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.07);' },
      h('div', { style: 'padding:13px 16px;display:flex;align-items:center;gap:12px;' },
        h('button', { onClick: goHome, style: 'width:38px;height:38px;border-radius:11px;background:#1a1613;border:1px solid rgba(255,255,255,.08);color:#f3ece0;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;' }, '‹'),
        h('div', { style: "font-family:'Anton';font-size:22px;letter-spacing:.5px;" }, 'PANEL ', h('span', { style: 'color:#E11B22;' }, '· STICKY'))
      ),
      tabsRow
    );

    var content = s.panelTab === 'oferta' ? renderPanelOferta() : s.panelTab === 'informes' ? renderPanelInformes() : renderPanelPedidos();

    return h('div', { class: 'scr', style: 'display:flex;flex-direction:column;min-height:100vh;' }, topBar, content);
  }

  // ---------- root ----------
  function renderApp() {
    var screen;
    if (state.view === 'panel') screen = renderPanel();
    else if (state.view === 'cliente') screen = h('div', { class: 'scr' }, renderCliente());
    else screen = renderHome();

    return h('div', { style: 'width:100%;max-width:460px;min-height:100vh;background:#0b0a09;position:relative;overflow:hidden;box-shadow:0 0 90px rgba(0,0,0,.7);border-left:1px solid rgba(255,255,255,.05);border-right:1px solid rgba(255,255,255,.05);' }, screen);
  }

  function render() {
    var root = document.getElementById('app');
    var active = document.activeElement;
    var focusInfo = null;
    if (active && active.dataset && active.dataset.field) {
      focusInfo = { field: active.dataset.field, start: active.selectionStart, end: active.selectionEnd };
    }
    root.innerHTML = '';
    root.appendChild(renderApp());
    if (focusInfo) {
      var el = root.querySelector('[data-field="' + focusInfo.field + '"]');
      if (el) {
        el.focus();
        try { el.setSelectionRange(focusInfo.start, focusInfo.end); } catch (e) {}
      }
    }
  }

  loadPersisted();
  render();
})();
