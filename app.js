const STORAGE_KEYS = {
  auth: "pos_auth",
  customers: "pos_customers",
  items: "pos_items",
  orders: "pos_orders"
};

const DEMO_USER = {
  username: "malith",
  password: "2004"
};

let state = {
  customers: [],
  items: [],
  orders: [],
  cart: []
};

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function escapeHtml(value) {
  return $("<div>").text(value ?? "").html();
}

function setAuthenticated(isAuthenticated) {
  if (isAuthenticated) {
    sessionStorage.setItem(STORAGE_KEYS.auth, "true");
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.auth);
  }
}

function isAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.auth) === "true";
}

function loadState() {
  const defaultCustomers = [
    { id: "CUS-01", name: "Malith Bhagya", phone: "0771234567", address: "Pallekale, Kandy" }
  ];

  const defaultItems = [
    { id: generateId("ITEM"), code: "COF-001", name: "Cappuccino", price: 4.5, qty: 30 },
    { id: generateId("ITEM"), code: "COF-002", name: "Latte", price: 5.25, qty: 28 },
    { id: generateId("ITEM"), code: "SNK-001", name: "Butter Croissant", price: 3.75, qty: 18 }
  ];

  state.customers = readStorage(STORAGE_KEYS.customers, defaultCustomers);
  state.items = readStorage(STORAGE_KEYS.items, defaultItems);
  state.orders = readStorage(STORAGE_KEYS.orders, []);

  if (!localStorage.getItem(STORAGE_KEYS.customers)) {
    writeStorage(STORAGE_KEYS.customers, state.customers);
  }
  if (!localStorage.getItem(STORAGE_KEYS.items)) {
    writeStorage(STORAGE_KEYS.items, state.items);
  }
  if (!localStorage.getItem(STORAGE_KEYS.orders)) {
    writeStorage(STORAGE_KEYS.orders, state.orders);
  }
}

function persistState() {
  writeStorage(STORAGE_KEYS.customers, state.customers);
  writeStorage(STORAGE_KEYS.items, state.items);
  writeStorage(STORAGE_KEYS.orders, state.orders);
}

function toggleViews() {
  const auth = isAuthenticated();
  $("#landingView").toggleClass("d-none", auth);
  $("#loginView").toggleClass("d-none", !$("#loginView").hasClass("active-view") || auth);
  $("#dashboardView").toggleClass("d-none", !auth);
}

function showLanding() {
  $("#landingView").removeClass("d-none");
  $("#loginView").addClass("d-none").removeClass("active-view");
  $("#dashboardView").addClass("d-none");
}

function showLogin() {
  $("#landingView").addClass("d-none");
  $("#loginView").removeClass("d-none").addClass("active-view");
  $("#dashboardView").addClass("d-none");
}

function showSection(sectionId) {
  $(".page-section").addClass("d-none");
  $(`#${sectionId}`).removeClass("d-none");
  $(".nav-section-link").removeClass("active");
  $(`.nav-section-link[data-section='${sectionId}']`).addClass("active");
}

function renderCustomers(filterText = "") {
  const query = filterText.trim().toLowerCase();
  const rows = state.customers.filter((customer) =>
    [customer.id, customer.name, customer.phone, customer.address]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );

  const tbody = $("#customersTable tbody");
  tbody.empty();

  if (!rows.length) {
    tbody.append(`<tr><td colspan="5" class="empty-state">No Customers Found.</td></tr>`);
    return;
  }

  rows.forEach((customer) => {
    tbody.append(`
      <tr>
        <td>${escapeHtml(customer.id)}</td>
        <td>${escapeHtml(customer.name)}</td>
        <td>${escapeHtml(customer.phone)}</td>
        <td>${escapeHtml(customer.address)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary edit-customer" data-id="${customer.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-customer ms-2" data-id="${customer.id}">Delete</button>
        </td>
      </tr>
    `);
  });
}

function renderItems(filterText = "") {
  const query = filterText.trim().toLowerCase();
  const rows = [...state.items].sort((a, b) => a.code.localeCompare(b.code)).filter((item) =>
    [item.code, item.name].join(" ").toLowerCase().includes(query)
  );

  const tbody = $("#itemsTable tbody");
  tbody.empty();

  if (!rows.length) {
    tbody.append(`<tr><td colspan="5" class="empty-state">No items found.</td></tr>`);
    return;
  }

  rows.forEach((item) => {
    tbody.append(`
      <tr>
        <td>${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${formatCurrency(item.price)}</td>
        <td><span class="badge-soft">${item.qty} in stock</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary edit-item" data-id="${item.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-item ms-2" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `);
  });
}

function renderCustomerOptions() {
  const select = $("#orderCustomer");
  select.empty();

  if (!state.customers.length) {
    select.append(`<option value="">No guests available</option>`);
    return;
  }

  select.append(`<option value="">Choose a guest</option>`);
  state.customers.forEach((customer) => {
    select.append(`<option value="${customer.id}">${escapeHtml(customer.name)} (${escapeHtml(customer.phone)})</option>`);
  });
}

function renderItemOptions() {
  const select = $("#orderItem");
  select.empty();

  const availableItems = state.items.filter((item) => item.qty > 0);

  if (!availableItems.length) {
    select.append(`<option value="">No items in stock</option>`);
    $("#selectedItemMeta").text("Add menu Items before creating an order.");
    return;
  }

  select.append(`<option value="">Choose a menu item</option>`);
  availableItems.forEach((item) => {
    select.append(`<option value="${item.id}">${escapeHtml(item.code)} - ${escapeHtml(item.name)}</option>`);
  });
}

function renderCart() {
  const tbody = $("#cartTable tbody");
  tbody.empty();

  if (!state.cart.length) {
    tbody.append(`<tr><td colspan="6" class="empty-state">No Drinks or Snacks added yet.</td></tr>`);
  } else {
    state.cart.forEach((line) => {
      tbody.append(`
        <tr>
          <td>${escapeHtml(line.code)}</td>
          <td>${escapeHtml(line.name)}</td>
          <td>${formatCurrency(line.price)}</td>
          <td>${line.qty}</td>
          <td>${formatCurrency(line.subtotal)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger remove-cart-item" data-id="${line.itemId}">Remove</button>
          </td>
        </tr>
      `);
    });
  }

  const total = state.cart.reduce((sum, line) => sum + line.subtotal, 0);
  $("#grandTotal").text(formatCurrency(total));
  $("#currentOrderMeta").text(`Current cafe order draft: ${generateDisplayOrderId()}`);
}

function generateDisplayOrderId() {
  return `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
}

function renderHistory(filterText = "") {
  const query = filterText.trim().toLowerCase();
  const rows = [...state.orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((order) => `${order.id} ${order.customerName}`.toLowerCase().includes(query));

  const tbody = $("#historyTable tbody");
  tbody.empty();

  if (!rows.length) {
    tbody.append(`<tr><td colspan="5" class="empty-state">No cafe orders have been placed yet.</td></tr>`);
    return;
  }

  rows.forEach((order) => {
    const itemsSummary = order.lines.map((line) => `${line.name} x${line.qty}`).join(", ");
    tbody.append(`
      <tr>
        <td>${escapeHtml(order.id)}</td>
        <td>${escapeHtml(order.customerName)}</td>
        <td>${escapeHtml(itemsSummary)}</td>
        <td>${formatCurrency(order.total)}</td>
        <td>${new Date(order.date).toLocaleString()}</td>
      </tr>
    `);
  });
}

function renderRecentOrders() {
  const tbody = $("#recentOrdersTable tbody");
  tbody.empty();

  const recent = [...state.orders]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (!recent.length) {
    tbody.append(`<tr><td colspan="4" class="empty-state">No recent cafe orders yet.</td></tr>`);
    return;
  }

  recent.forEach((order) => {
    tbody.append(`
      <tr>
        <td>${escapeHtml(order.id)}</td>
        <td>${escapeHtml(order.customerName)}</td>
        <td>${new Date(order.date).toLocaleDateString()}</td>
        <td>${formatCurrency(order.total)}</td>
      </tr>
    `);
  });
}

function updateOverview() {
  $("#customerCount").text(state.customers.length);
  $("#itemCount").text(state.items.length);
  $("#orderCount").text(state.orders.length);

  const revenue = state.orders.reduce((sum, order) => sum + order.total, 0);
  $("#revenueTotal").text(formatCurrency(revenue));
  renderRecentOrders();
}

function resetCustomerForm() {
  $("#customerForm")[0].reset();
  $("#customerId").val("");
}

function resetItemForm() {
  $("#itemForm")[0].reset();
  $("#itemId").val("");
}

function resetCart(clearMessage = false) {
  state.cart = [];
  $("#orderQty").val(1);
  if (clearMessage) {
    $("#orderConfirmation").addClass("d-none").text("");
  }
  renderCart();
}

function refreshAll() {
  renderCustomers($("#customerSearch").val() || "");
  renderItems($("#itemSearch").val() || "");
  renderCustomerOptions();
  renderItemOptions();
  renderCart();
  renderHistory($("#historySearch").val() || "");
  updateOverview();
}

function selectedItem() {
  return state.items.find((item) => item.id === $("#orderItem").val());
}

function updateSelectedItemMeta() {
  const item = selectedItem();
  if (!item) {
    $("#selectedItemMeta").text("Choose a menu item to see stock and price.");
    return;
  }

  $("#selectedItemMeta").html(`
    <strong>${escapeHtml(item.name)}</strong><br>
    Code: ${escapeHtml(item.code)} | Price: ${formatCurrency(item.price)} | Stock: ${item.qty}
  `);
}

function bindEvents() {
  $("#loginForm").on("submit", function (event) {
    event.preventDefault();
    const username = $("#username").val().trim();
    const password = $("#password").val().trim();

    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      setAuthenticated(true);
      $("#loginAlert").addClass("d-none").text("");
      toggleViews();
      showSection("overviewSection");
      return;
    }

    $("#loginAlert").removeClass("d-none").text("Invalid username or password.");
  });

  $("#logoutBtn").on("click", function () {
    setAuthenticated(false);
    $("#loginForm")[0].reset();
    showLanding();
    $("#orderConfirmation").addClass("d-none").text("");
  });

  $("#openLoginBtn, #startNowBtn").on("click", function () {
    showLogin();
  });

  $("#learnMoreBtn").on("click", function () {
    document.getElementById("featuresBlock").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $(".nav-section-link").on("click", function (event) {
    event.preventDefault();
    showSection($(this).data("section"));
  });

  $("#customerForm").on("submit", function (event) {
    event.preventDefault();
    const id = $("#customerId").val() || `CUS-${Date.now()}`;
    const customer = {
      id,
      name: $("#customerName").val().trim(),
      phone: $("#customerPhone").val().trim(),
      address: $("#customerAddress").val().trim()
    };

    if (!customer.name || !customer.phone || !customer.address) {
      return;
    }

    const existingIndex = state.customers.findIndex((entry) => entry.id === id);
    if (existingIndex >= 0) {
      state.customers[existingIndex] = customer;
    } else {
      state.customers.push(customer);
    }

    persistState();
    refreshAll();
    resetCustomerForm();
  });

  $("#itemForm").on("submit", function (event) {
    event.preventDefault();
    const id = $("#itemId").val() || generateId("ITEM");
    const item = {
      id,
      code: $("#itemCode").val().trim(),
      name: $("#itemName").val().trim(),
      price: Number($("#itemPrice").val()),
      qty: Number($("#itemQty").val())
    };

    if (!item.code || !item.name || item.price < 0 || item.qty < 0) {
      return;
    }

    const duplicateCode = state.items.find((entry) => entry.code === item.code && entry.id !== id);
    if (duplicateCode) {
      alert("Item code must be unique.");
      return;
    }

    const existingIndex = state.items.findIndex((entry) => entry.id === id);
    if (existingIndex >= 0) {
      state.items[existingIndex] = item;
    } else {
      state.items.push(item);
    }

    persistState();
    refreshAll();
    resetItemForm();
  });

  $("#customersTable").on("click", ".edit-customer", function () {
    const customer = state.customers.find((entry) => entry.id === $(this).data("id"));
    if (!customer) {
      return;
    }

    $("#customerId").val(customer.id);
    $("#customerName").val(customer.name);
    $("#customerPhone").val(customer.phone);
    $("#customerAddress").val(customer.address);
    showSection("customersSection");
  });

  $("#customersTable").on("click", ".delete-customer", function () {
    const id = $(this).data("id");
    const usedInOrders = state.orders.some((order) => order.customerId === id);
    if (usedInOrders) {
      alert("This customer is linked to an order history record and cannot be deleted.");
      return;
    }

    if (!confirm("Delete this customer?")) {
      return;
    }

    state.customers = state.customers.filter((entry) => entry.id !== id);
    persistState();
    refreshAll();
  });

  $("#itemsTable").on("click", ".edit-item", function () {
    const item = state.items.find((entry) => entry.id === $(this).data("id"));
    if (!item) {
      return;
    }

    $("#itemId").val(item.id);
    $("#itemCode").val(item.code);
    $("#itemName").val(item.name);
    $("#itemPrice").val(item.price);
    $("#itemQty").val(item.qty);
    showSection("itemsSection");
  });

  $("#itemsTable").on("click", ".delete-item", function () {
    const id = $(this).data("id");
    const usedInOrders = state.orders.some((order) => order.lines.some((line) => line.itemId === id));
    if (usedInOrders) {
      alert("This item is linked to order history and cannot be deleted.");
      return;
    }

    if (!confirm("Delete this item?")) {
      return;
    }

    state.items = state.items.filter((entry) => entry.id !== id);
    state.cart = state.cart.filter((entry) => entry.itemId !== id);
    persistState();
    refreshAll();
  });

  $("#resetCustomerBtn").on("click", resetCustomerForm);
  $("#resetItemBtn").on("click", resetItemForm);

  $("#customerSearch").on("input", function () {
    renderCustomers($(this).val());
  });

  $("#itemSearch").on("input", function () {
    renderItems($(this).val());
  });

  $("#historySearch").on("input", function () {
    renderHistory($(this).val());
  });

  $("#orderItem").on("change", updateSelectedItemMeta);

  $("#addToCartBtn").on("click", function () {
    const item = selectedItem();
    const qty = Number($("#orderQty").val());

    if (!$("#orderCustomer").val()) {
      alert("Select a guest first.");
      return;
    }

    if (!item) {
      alert("Select a menu item.");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      alert("Enter a valid quantity.");
      return;
    }

    const existingLine = state.cart.find((line) => line.itemId === item.id);
    const currentQty = existingLine ? existingLine.qty : 0;

    if (qty + currentQty > item.qty) {
      alert("Requested quantity exceeds stock on hand.");
      return;
    }

    if (existingLine) {
      existingLine.qty += qty;
      existingLine.subtotal = existingLine.qty * existingLine.price;
    } else {
      state.cart.push({
        itemId: item.id,
        code: item.code,
        name: item.name,
        price: item.price,
        qty,
        subtotal: item.price * qty
      });
    }

    $("#orderConfirmation").addClass("d-none").text("");
    renderCart();
  });

  $("#cartTable").on("click", ".remove-cart-item", function () {
    const itemId = $(this).data("id");
    state.cart = state.cart.filter((line) => line.itemId !== itemId);
    renderCart();
  });

  $("#clearCartBtn").on("click", function () {
    resetCart(true);
  });

  $("#placeOrderBtn").on("click", function () {
    const customerId = $("#orderCustomer").val();
    const customer = state.customers.find((entry) => entry.id === customerId);

    if (!customer) {
      alert("Select a valid customer.");
      return;
    }

    if (!state.cart.length) {
      alert("Add at least one item to the order.");
      return;
    }

    const invalidLine = state.cart.find((line) => {
      const inventoryItem = state.items.find((entry) => entry.id === line.itemId);
      return !inventoryItem || inventoryItem.qty < line.qty;
    });

    if (invalidLine) {
      alert("One or more order items exceed current stock.");
      return;
    }

    state.cart.forEach((line) => {
      const inventoryItem = state.items.find((entry) => entry.id === line.itemId);
      inventoryItem.qty -= line.qty;
    });

    const order = {
      id: generateId("ORD"),
      customerId: customer.id,
      customerName: customer.name,
      lines: state.cart.map((line) => ({ ...line })),
      total: state.cart.reduce((sum, line) => sum + line.subtotal, 0),
      date: new Date().toISOString()
    };

    state.orders.push(order);
    persistState();
    refreshAll();
    $("#orderConfirmation")
      .removeClass("d-none")
      .text(`Coffee order ${order.id} placed successfully for ${customer.name}.`);
    resetCart(false);
    renderItemOptions();
    updateSelectedItemMeta();
  });
}

$(function () {
  loadState();
  bindEvents();
  if (isAuthenticated()) {
    toggleViews();
  } else {
    showLanding();
  }
  refreshAll();
  updateSelectedItemMeta();

  if (isAuthenticated()) {
    showSection("overviewSection");
  }
});
