/* ============================================================
   ORGÁNICOS DEL NORTE · Demo de tienda
   Carrito con localStorage, filtros, cajón lateral y detalles.
   Sin dependencias. Los datos y precios son de demostración.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Datos de demostración ---------- */
  var PRODUCTS = {
    'queso-fresco':   { name: 'Queso fresco',            size: '500 g', category: 'quesos', categoryLabel: 'Quesos', price: 18, img: 'imagenes/queso-fresco.svg',   url: 'queso-fresco.html',   tone: 'cheese' },
    'queso-semiduro': { name: 'Queso semiduro',          size: '500 g', category: 'quesos', categoryLabel: 'Quesos', price: 25, img: 'imagenes/queso-semiduro.svg', url: 'queso-semiduro.html', tone: 'cheese' },
    'queso-familiar': { name: 'Queso fresco familiar',   size: '1 kg',  category: 'quesos', categoryLabel: 'Quesos', price: 34, img: 'imagenes/queso-fresco.svg',   url: 'queso-familiar.html', tone: 'cheese' },
    'miel-250':       { name: 'Miel de abeja',           size: '250 g', category: 'miel',   categoryLabel: 'Miel',   price: 18, img: 'imagenes/miel.svg',           url: 'miel-250.html',       tone: 'honey' },
    'miel-500':       { name: 'Miel de abeja',           size: '500 g', category: 'miel',   categoryLabel: 'Miel',   price: 32, img: 'imagenes/miel-panal.svg',     url: 'miel-500.html',       tone: 'honey' },
    'miel-1000':      { name: 'Miel de abeja familiar',  size: '1 kg',  category: 'miel',   categoryLabel: 'Miel',   price: 56, img: 'imagenes/miel.svg',           url: 'miel-1000.html',      tone: 'honey' }
  };

  var STORAGE_KEY = 'odn-cart-v1';
  var ORDER_KEY = 'odn-last-order';

  /* ---------- Utilidades ---------- */
  function money(value) {
    return 'S/ ' + Number(value).toFixed(2);
  }

  function clampQty(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return 1;
    return Math.min(99, Math.max(1, n));
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  /* ---------- Estado del carrito ---------- */
  var cart = loadCart();

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw
        .filter(function (item) { return item && PRODUCTS[item.id]; })
        .map(function (item) { return { id: item.id, qty: clampQty(item.qty) }; });
    } catch (error) {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      /* modo privado: el carrito funciona solo en esta página */
    }
    syncAll();
  }

  function cartLines() {
    return cart.map(function (item) {
      var product = PRODUCTS[item.id];
      return {
        id: item.id,
        qty: item.qty,
        name: product.name,
        size: product.size,
        categoryLabel: product.categoryLabel,
        price: product.price,
        img: product.img,
        url: product.url,
        tone: product.tone,
        lineTotal: product.price * item.qty
      };
    });
  }

  function cartCount() {
    return cart.reduce(function (total, item) { return total + item.qty; }, 0);
  }

  function cartSubtotal() {
    return cart.reduce(function (total, item) {
      return total + PRODUCTS[item.id].price * item.qty;
    }, 0);
  }

  function addToCart(id, qty) {
    if (!PRODUCTS[id]) return;
    var existing = cart.find(function (item) { return item.id === id; });
    if (existing) {
      existing.qty = clampQty(existing.qty + (qty || 1));
    } else {
      cart.push({ id: id, qty: clampQty(qty || 1) });
    }
    persist();
    openCart();
    toast(PRODUCTS[id].name + ' · ' + (qty || 1) + ' × ' + PRODUCTS[id].size + ' agregado');
  }

  function changeQty(id, delta) {
    var item = cart.find(function (entry) { return entry.id === id; });
    if (!item) return;
    item.qty = clampQty(item.qty + delta);
    persist();
  }

  function setQty(id, qty) {
    var item = cart.find(function (entry) { return entry.id === id; });
    if (!item) return;
    item.qty = clampQty(qty);
    persist();
  }

  function removeFromCart(id) {
    var removed = cart.find(function (item) { return item.id === id; });
    cart = cart.filter(function (item) { return item.id !== id; });
    persist();
    if (removed) toast(PRODUCTS[id].name + ' retirado del carrito');
  }

  function clearCart(silent) {
    cart = [];
    persist();
    if (!silent) toast('Carrito vaciado');
  }

  /* ---------- Avisos ---------- */
  var toastStack;

  function getToastStack() {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastStack);
    }
    return toastStack;
  }

  function toast(message) {
    var stack = getToastStack();
    var node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML =
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>' +
      '<span></span>';
    node.querySelector('span').textContent = message;
    stack.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('leaving');
      window.setTimeout(function () { node.remove(); }, 260);
    }, 2800);
  }

  /* ---------- Cajón lateral ---------- */
  var drawer;
  var overlay;
  var lastFocused = null;

  function buildDrawer() {
    if (drawer) return;

    overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.setAttribute('data-cart-overlay', '');
    overlay.setAttribute('aria-hidden', 'true');

    drawer = document.createElement('aside');
    drawer.className = 'cart-drawer';
    drawer.id = 'cart-drawer';
    drawer.tabIndex = -1;
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'cart-drawer-title');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="cart-drawer-head">' +
        '<div><span class="eyebrow">Tu selección</span><h2 id="cart-drawer-title">Mi carrito</h2></div>' +
        '<button class="cart-close" type="button" data-cart-close aria-label="Cerrar carrito">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="cart-drawer-items" data-drawer-items></div>' +
      '<div class="cart-drawer-foot">' +
        '<div class="drawer-total"><span>Subtotal</span><strong data-drawer-total>S/ 0.00</strong></div>' +
        '<p class="micro">Entrega y pago por coordinar · Demo sin cobros</p>' +
        '<a class="btn primary full" href="checkout.html">Continuar compra</a>' +
        '<a class="text-link" href="carrito.html">Ver carrito completo</a>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    drawer.inert = true;

    overlay.addEventListener('click', closeCart);
  }

  function openCart() {
    buildDrawer();
    lastFocused = document.activeElement;
    document.body.classList.add('cart-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.inert = false;
    drawer.focus();
  }

  function closeCart() {
    if (!drawer || !document.body.classList.contains('cart-open')) return;
    document.body.classList.remove('cart-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.inert = true;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function renderDrawer() {
    if (!drawer) return;
    var items = drawer.querySelector('[data-drawer-items]');
    var total = drawer.querySelector('[data-drawer-total]');
    var checkoutLink = drawer.querySelector('.cart-drawer-foot .btn');
    var lines = cartLines();

    if (!lines.length) {
      items.innerHTML =
        '<div class="drawer-empty">' +
          '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg>' +
          '<h3>Tu carrito está vacío</h3>' +
          '<p>Agrega quesos o miel para empezar tu selección.</p>' +
          '<a class="btn outline" href="catalogo.html">Explorar tienda</a>' +
        '</div>';
      total.textContent = money(0);
      if (checkoutLink) {
        checkoutLink.setAttribute('aria-disabled', 'true');
        checkoutLink.setAttribute('tabindex', '-1');
      }
      return;
    }

    if (checkoutLink) {
      checkoutLink.removeAttribute('aria-disabled');
      checkoutLink.removeAttribute('tabindex');
    }
    items.innerHTML = lines.map(function (line) {
      return '<div class="drawer-item">' +
        '<a class="thumb ' + line.tone + '" href="' + line.url + '"><img src="' + line.img + '" alt=""></a>' +
        '<div>' +
          '<a href="' + line.url + '"><strong>' + escapeHtml(line.name) + '</strong></a>' +
          '<small>' + escapeHtml(line.size) + ' · ' + money(line.price) + '</small>' +
          '<div class="drawer-controls">' +
            '<button type="button" data-step="-1" data-id="' + line.id + '" aria-label="Quitar una unidad de ' + escapeHtml(line.name) + '">−</button>' +
            '<span aria-label="Cantidad">' + line.qty + '</span>' +
            '<button type="button" data-step="1" data-id="' + line.id + '" aria-label="Agregar una unidad de ' + escapeHtml(line.name) + '">+</button>' +
            '<button type="button" data-remove="' + line.id + '" aria-label="Eliminar ' + escapeHtml(line.name) + '" style="border:0;background:none;width:auto;font-size:11px;text-decoration:underline;color:#9b5c45;padding:0 2px">Quitar</button>' +
          '</div>' +
        '</div>' +
        '<span class="drawer-price">' + money(line.lineTotal) + '</span>' +
      '</div>';
    }).join('');

    total.textContent = money(cartSubtotal());
  }

  /* ---------- Página del carrito ---------- */
  function renderCartPage() {
    var rows = document.querySelector('[data-cart-rows]');
    if (!rows) return;

    var empty = document.querySelector('[data-cart-empty]');
    var cartHead = document.querySelector('[data-cart-head]');
    var foot = document.querySelector('[data-cart-foot]');
    var lines = cartLines();

    if (!lines.length) {
      rows.innerHTML = '';
      if (empty) empty.hidden = false;
      if (cartHead) cartHead.hidden = true;
      if (foot) foot.hidden = true;
    } else {
      if (empty) empty.hidden = true;
      if (cartHead) cartHead.hidden = false;
      if (foot) foot.hidden = false;

      rows.innerHTML = lines.map(function (line) {
        return '<div class="cart-row">' +
          '<div class="cart-product">' +
            '<a href="' + line.url + '" class="thumb ' + line.tone + '"><img src="' + line.img + '" alt=""></a>' +
            '<div>' +
              '<a href="' + line.url + '"><strong>' + escapeHtml(line.name) + '</strong></a>' +
              '<small>' + escapeHtml(line.size) + ' · ' + money(line.price) + '</small>' +
              '<button type="button" class="remove" data-remove="' + line.id + '">Eliminar</button>' +
            '</div>' +
          '</div>' +
          '<div class="stepper">' +
            '<button type="button" data-step="-1" data-id="' + line.id + '" aria-label="Quitar una unidad">−</button>' +
            '<span class="quantity-display">' + line.qty + '</span>' +
            '<button type="button" data-step="1" data-id="' + line.id + '" aria-label="Agregar una unidad">+</button>' +
          '</div>' +
          '<strong class="line-total">' + money(line.lineTotal) + '</strong>' +
        '</div>';
      }).join('');
    }

    document.querySelectorAll('[data-cart-subtotal]').forEach(function (node) {
      node.textContent = money(cartSubtotal());
    });
    document.querySelectorAll('[data-cart-total]').forEach(function (node) {
      node.textContent = money(cartSubtotal());
    });
    document.querySelectorAll('[data-cart-count-label]').forEach(function (node) {
      var n = cartCount();
      node.textContent = n === 1 ? '1 producto' : n + ' productos';
    });

    var checkoutLink = document.querySelector('[data-cart-checkout]');
    if (checkoutLink) {
      if (!lines.length) {
        checkoutLink.setAttribute('aria-disabled', 'true');
        checkoutLink.setAttribute('tabindex', '-1');
      } else {
        checkoutLink.removeAttribute('aria-disabled');
        checkoutLink.removeAttribute('tabindex');
      }
    }
  }

  /* ---------- Checkout ---------- */
  function renderCheckout() {
    var list = document.querySelector('[data-checkout-items]');
    if (!list) return;

    var lines = cartLines();
    var submit = document.querySelector('[data-checkout-submit]');
    var asideEmpty = document.querySelector('[data-checkout-empty]');

    if (!lines.length) {
      list.innerHTML = '';
      list.hidden = true;
      if (submit) { submit.disabled = true; }
      if (asideEmpty) asideEmpty.hidden = false;
    } else {
      list.hidden = false;
      list.innerHTML = lines.map(function (line) {
        return '<div>' +
          '<img src="' + line.img + '" alt="">' +
          '<span>' + escapeHtml(line.name) + '<small>' + escapeHtml(line.size) + ' × ' + line.qty + '</small></span>' +
          '<strong>' + money(line.lineTotal) + '</strong>' +
        '</div>';
      }).join('');
      if (submit) submit.disabled = false;
      if (asideEmpty) asideEmpty.hidden = true;
    }

    document.querySelectorAll('[data-checkout-subtotal]').forEach(function (node) {
      node.textContent = money(cartSubtotal());
    });
    document.querySelectorAll('[data-checkout-total]').forEach(function (node) {
      node.textContent = money(cartSubtotal());
    });
  }

  function listenCheckout() {
    var form = document.querySelector('#form-checkout');
    if (!form) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!cart.length) {
        toast('Tu carrito está vacío. Agrega un producto para continuar.');
        return;
      }

      var data = new FormData(form);
      var fullName = [data.get('nombres'), data.get('apellidos')]
        .filter(function (part) { return part && String(part).trim(); })
        .join(' ')
        .trim();

      var order = {
        number: 'ODN-' + String(Math.floor(1000 + Math.random() * 9000)),
        name: fullName,
        total: cartSubtotal(),
        items: cartLines().map(function (line) {
          return { name: line.name, size: line.size, qty: line.qty, price: line.price };
        }),
        date: new Date().toISOString()
      };

      try { sessionStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (error) { /* demo */ }
      clearCart(true);
      window.location.href = 'confirmacion.html';
    });
  }

  function renderConfirmation() {
    var orderNumber = document.querySelector('[data-order-number]');
    if (!orderNumber) return;

    var order = null;
    try { order = JSON.parse(sessionStorage.getItem(ORDER_KEY) || 'null'); } catch (error) { order = null; }

    if (!order) {
      var orderCard = document.querySelector('[data-order-card]');
      if (orderCard) orderCard.hidden = true;
      return;
    }
    var orderCardNode = document.querySelector('[data-order-card]');
    if (orderCardNode) orderCardNode.hidden = false;
    orderNumber.textContent = order.number || 'ODN-DEMO';

    document.querySelectorAll('[data-order-total]').forEach(function (node) {
      node.textContent = money(order.total || 0);
    });
    document.querySelectorAll('[data-order-name]').forEach(function (node) {
      var wrap = node.closest('[data-order-name-wrap]');
      if (order.name) {
        node.textContent = order.name;
        if (wrap) wrap.hidden = false;
      } else if (wrap) {
        wrap.hidden = true;
      }
    });

    var items = document.querySelector('[data-order-items]');
    if (items && order.items && order.items.length) {
      items.innerHTML = order.items.map(function (item) {
        return '<div><span>' + escapeHtml(item.name) + ' · ' + escapeHtml(item.size) + ' × ' + item.qty + '</span><strong>' + money(item.price * item.qty) + '</strong></div>';
      }).join('');
    } else if (items) {
      items.hidden = true;
    }
  }

  /* ---------- Sincronización general ---------- */
  function syncAll() {
    var count = cartCount();

    document.querySelectorAll('[data-cart-count]').forEach(function (node) {
      node.textContent = count;
      node.classList.toggle('is-empty', count === 0);
    });

    document.querySelectorAll('[data-cart-count-label]').forEach(function (node) {
      node.textContent = count === 1 ? '1 producto' : count + ' productos';
    });

    renderDrawer();
    renderCartPage();
    renderCheckout();
  }

  /* ---------- Eventos globales ---------- */
  function listenGlobalClicks() {
    document.addEventListener('click', function (event) {
      var addButton = event.target.closest('[data-add]');
      if (addButton) {
        event.preventDefault();
        var id = addButton.getAttribute('data-add');
        var qty = 1;
        var scope = addButton.closest('.buy-row') || addButton.closest('[data-product-detail]');
        var stepper = scope ? scope.querySelector('[data-stepper]') : null;
        if (stepper) qty = clampQty(stepper.getAttribute('data-value') || 1);

        addButton.classList.add('is-added');
        window.setTimeout(function () { addButton.classList.remove('is-added'); }, 700);
        addToCart(id, qty);
        return;
      }

      var stepButton = event.target.closest('[data-step]');
      if (stepButton) {
        event.preventDefault();
        var stepId = stepButton.getAttribute('data-id');
        var delta = parseInt(stepButton.getAttribute('data-step'), 10) || 0;

        if (stepId) {
          changeQty(stepId, delta);
        } else {
          var localStepper = stepButton.closest('[data-stepper]');
          if (!localStepper) return;
          var current = parseInt(localStepper.getAttribute('data-value') || '1', 10) || 1;
          var next = Math.min(99, Math.max(1, current + delta));
          localStepper.setAttribute('data-value', String(next));
          var display = localStepper.querySelector('[data-qty-value]');
          if (display) display.textContent = next;
        }
        return;
      }

      var removeButton = event.target.closest('[data-remove]');
      if (removeButton) {
        event.preventDefault();
        removeFromCart(removeButton.getAttribute('data-remove'));
        return;
      }

      var clearButton = event.target.closest('[data-clear-cart]');
      if (clearButton) {
        event.preventDefault();
        if (window.confirm('¿Vaciar el carrito de demostración?')) clearCart();
        return;
      }

      if (event.target.closest('[data-cart-close]')) {
        event.preventDefault();
        closeCart();
      }
    });
  }

  /* ---------- Menú móvil ---------- */
  function initNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var isOpen = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    document.querySelectorAll('.navigation nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menú');
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Cabecera y teclado ---------- */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  function initKeyboard() {
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeCart();
        if (document.body.classList.contains('nav-open')) {
          document.body.classList.remove('nav-open');
          var toggle = document.querySelector('[data-nav-toggle]');
          if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
            toggle.focus();
          }
        }
      }

      if (event.key === 'Tab' && document.body.classList.contains('cart-open') && drawer) {
        var focusable = drawer.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- Catálogo: filtros y búsqueda ---------- */
  function initCatalog() {
    var catalog = document.querySelector('[data-catalog]');
    if (!catalog) return;

    var cards = Array.prototype.slice.call(catalog.querySelectorAll('[data-product-card]'));
    var tabs = Array.prototype.slice.call(catalog.querySelectorAll('[data-filter]'));
    var search = catalog.querySelector('[data-search]');
    var count = catalog.querySelector('[data-catalog-count]');
    var empty = catalog.querySelector('[data-catalog-empty]');
    var activeFilter = 'todos';

    function apply() {
      var query = search ? search.value.trim().toLowerCase() : '';
      var visible = 0;

      cards.forEach(function (card) {
        var matchCategory = activeFilter === 'todos' || card.getAttribute('data-category') === activeFilter;
        var matchQuery = !query || (card.getAttribute('data-text') || '').indexOf(query) !== -1;
        var show = matchCategory && matchQuery;
        card.hidden = !show;
        if (show) visible++;
      });

      if (count) count.textContent = visible === 1 ? '1 producto' : visible + ' productos';
      if (empty) empty.hidden = visible !== 0;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeFilter = tab.getAttribute('data-filter') || 'todos';
        tabs.forEach(function (other) {
          var isActive = other === tab;
          other.classList.toggle('active', isActive);
          other.setAttribute('aria-pressed', String(isActive));
        });
        apply();
      });
    });

    if (search) search.addEventListener('input', apply);
    apply();
  }

  /* ---------- Revelado al hacer scroll ---------- */
  function initReveal() {
    var elements = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!elements.length) return;

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      elements.forEach(function (element) { element.classList.add('is-visible'); });
      return;
    }

    elements.forEach(function (element) {
      var parent = element.parentElement;
      if (!parent) return;
      var siblings = Array.prototype.slice.call(parent.querySelectorAll(':scope > [data-reveal]'));
      var index = siblings.indexOf(element);
      if (index > 0) element.style.transitionDelay = Math.min(index, 4) * 70 + 'ms';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (element) { observer.observe(element); });
  }

  /* ---------- Formularios de demostración ---------- */
  function initForms() {
    var contact = document.querySelector('#form-contacto');
    if (contact) {
      contact.addEventListener('submit', function (event) {
        event.preventDefault();
        var success = document.querySelector('[data-form-success]');
        if (success) {
          success.hidden = false;
          success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        contact.reset();
        toast('Mensaje de ejemplo recibido. No se enviaron datos.');
      });
    }

    var newsletter = document.querySelector('#form-news');
    if (newsletter) {
      newsletter.addEventListener('submit', function (event) {
        event.preventDefault();
        newsletter.reset();
        toast('¡Gracias! Demo: no se guardó ningún correo.');
      });
    }
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function initStorageSync() {
    window.addEventListener('storage', function (event) {
      if (event.key === STORAGE_KEY) {
        cart = loadCart();
        syncAll();
      }
    });
  }

  /* ---------- Arranque ---------- */
  function init() {
    buildDrawer();
    syncAll();
    listenGlobalClicks();
    listenCheckout();
    initNav();
    initHeader();
    initKeyboard();
    initCatalog();
    initReveal();
    initForms();
    renderConfirmation();
    initYear();
    initStorageSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
