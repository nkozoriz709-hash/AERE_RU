// ============================================
// ГЛАВНЫЙ САЙТ AÉRÉ - С ИНТЕГРАЦИЕЙ JSONBin
// ============================================

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let cart = [];
let currentUser = null;
let currentTypeFilter = "parfum";
let currentGenderFilter = "all";
let products = [];
let users = [];
let orders = [];
let globalNotifications = [];
let nextProductId = 1;

// ===== DOM ЭЛЕМЕНТЫ =====
let productsGrid, cartIcon, cartOverlay, cartSidebar, closeCartBtn, cartItemsContainer;
let cartTotalPriceSpan, cartCountSpan, checkoutBtn, toastMsg, themeToggle;
let modalOverlay, modalContent, modalCloseBtn;
let accountIcon, accountOverlay, accountSidebar, closeAccountBtn;
let loginForm, registerForm, userDashboard, adminPanel;
let showRegisterLink, showLoginLink, doLoginBtn, doRegisterBtn, logoutBtn;
let userNameDisplay, userEmailDisplay, userTelegramDisplay, userOrdersList, notificationsList;
let notificationBadge, markAllReadBtn, sendNotificationBtn, adminSyncBtn;
let totalUsersCount, totalOrdersCount;
let orderModalOverlay, orderModalClose, orderForm, deliveryAddress, deliveryPhone, deliveryComment;
let orderSummary, confirmOrderBtn;
let loadingIndicator;

// ============================================
// ЗАГРУЗКА ДАННЫХ
// ============================================

async function loadDataFromCloud() {
    try {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (productsGrid) productsGrid.style.display = 'none';
        
        const data = await JSONBinAPI.getData();
        
        if (data) {
            products = data.products || [];
            users = data.users || [];
            orders = data.orders || [];
            globalNotifications = data.notifications || [];
            
            localStorage.setItem('aere_products', JSON.stringify(products));
            localStorage.setItem('aere_users', JSON.stringify(users));
            localStorage.setItem('aere_orders', JSON.stringify(orders));
            localStorage.setItem('aere_notifications', JSON.stringify(globalNotifications));
            
            if (data.partners) localStorage.setItem('crm_partners', JSON.stringify(data.partners));
            
            if (products.length > 0) {
                nextProductId = Math.max(...products.map(p => p.id)) + 1;
            }
            
            console.log('✅ Данные загружены из облака');
            console.log('📦 Товаров:', products.length);
            console.log('👤 Пользователей:', users.length);
            console.log('📋 Заказов:', orders.length);
            console.log('🤝 Партнеров:', (data.partners || []).length);
            return true;
        } else {
            console.warn('⚠️ Не удалось загрузить данные из облака, используем localStorage');
            loadFromLocalStorage();
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        loadFromLocalStorage();
        return false;
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (productsGrid) {
            productsGrid.style.display = 'grid';
            renderProducts();
        }
        initTabs();
        updateCartUI();
        updateCartCounter();
    }
}

function loadFromLocalStorage() {
    const savedProducts = localStorage.getItem('aere_products');
    const savedUsers = localStorage.getItem('aere_users');
    const savedOrders = localStorage.getItem('aere_orders');
    const savedNotifications = localStorage.getItem('aere_notifications');
    
    products = savedProducts ? JSON.parse(savedProducts) : [];
    users = savedUsers ? JSON.parse(savedUsers) : [];
    orders = savedOrders ? JSON.parse(savedOrders) : [];
    globalNotifications = savedNotifications ? JSON.parse(savedNotifications) : [];
    
    if (products.length > 0) {
        nextProductId = Math.max(...products.map(p => p.id)) + 1;
    }
    
    ensureAdminExists();
    
    if (!localStorage.getItem('crm_partners')) localStorage.setItem('crm_partners', JSON.stringify([]));
}

function ensureAdminExists() {
    const adminExists = users.find(u => u.email === 'admin@aere.com');
    if (!adminExists) {
        users.push({
            id: 1,
            name: "Администратор",
            email: "admin@aere.com",
            telegram: "",
            password: "admin123",
            partnerId: null,
            registeredAt: new Date().toLocaleString()
        });
        saveUsersToCloud();
    }
}

async function syncAllDataToCloud() {
    try {
        const crmPartners = JSON.parse(localStorage.getItem('crm_partners') || '[]');
        
        await JSONBinAPI.syncAll(
            products, 
            users, 
            orders, 
            crmPartners, 
            globalNotifications
        );
        console.log('✅ Все данные синхронизированы с облаком');
        return true;
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        return false;
    }
}

function saveProductsToCloud() {
    JSONBinAPI.syncProducts(products);
}

function saveUsersToCloud() {
    JSONBinAPI.syncUsers(users);
}

function saveOrdersToCloud() {
    JSONBinAPI.syncOrders(orders);
}

function saveNotificationsToCloud() {
    JSONBinAPI.syncNotifications(globalNotifications);
}

// ============================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ТОВАРАМИ
// ============================================

function getProductById(id) {
    return products.find(p => p.id === id);
}

// ============================================
// ОСНОВНЫЕ ФУНКЦИИ САЙТА
// ============================================

function showToast(message, duration = 2000) {
    if (!toastMsg) return;
    toastMsg.textContent = message;
    toastMsg.classList.add('show');
    setTimeout(() => toastMsg.classList.remove('show'), duration);
}

function addToCart(productId, quantity = 1) {
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity += quantity;
    else cart.push({ id: productId, quantity: quantity });
    saveCartToLocal();
    updateCartUI();
    updateCartCounter();
    const product = getProductById(productId);
    if (product) showToast(`${product.name} добавлен в корзину ✨`);
}

function saveCartToLocal() {
    localStorage.setItem('perfume_cart', JSON.stringify(cart));
}

function loadCartFromLocal() {
    const saved = localStorage.getItem('perfume_cart');
    cart = saved ? JSON.parse(saved) : [];
    updateCartUI();
    updateCartCounter();
}

function updateCartCounter() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountSpan) cartCountSpan.innerText = totalItems;
}

function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity <= 0) cart = cart.filter(item => item.id !== productId);
    else {
        const item = cart.find(item => item.id === productId);
        if (item) item.quantity = newQuantity;
    }
    saveCartToLocal();
    updateCartUI();
    updateCartCounter();
}

function renderCartItems() {
    if (!cartItemsContainer || !cartTotalPriceSpan) return;
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Ваша корзина пуста</div>';
        cartTotalPriceSpan.innerText = '0 ₽';
        return;
    }
    let itemsHtml = '', total = 0;
    cart.forEach(item => {
        const product = getProductById(item.id);
        if (!product) return;
        total += product.price * item.quantity;
        itemsHtml += `<div class="cart-item" data-id="${item.id}">
            <div class="cart-item-info"><h4>${product.name}</h4><p>${product.price.toLocaleString()} ₽</p><small style="color: var(--text-muted);">${product.typeName} • ${product.genderName}</small></div>
            <div class="cart-item-actions">
                <button class="decrease-qty" data-id="${item.id}">−</button>
                <span>${item.quantity}</span>
                <button class="increase-qty" data-id="${item.id}">+</button>
                <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    });
    cartItemsContainer.innerHTML = itemsHtml;
    cartTotalPriceSpan.innerText = `${total.toLocaleString()} ₽`;
    document.querySelectorAll('.decrease-qty, .increase-qty, .remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('decrease-qty')) {
                const item = cart.find(i => i.id === id);
                if (item) updateCartItemQuantity(id, item.quantity - 1);
            } else if (btn.classList.contains('increase-qty')) {
                const item = cart.find(i => i.id === id);
                if (item) updateCartItemQuantity(id, item.quantity + 1);
            } else if (btn.classList.contains('remove-item')) {
                updateCartItemQuantity(id, 0);
                showToast('Товар удалён');
            }
        });
    });
}

function updateCartUI() {
    renderCartItems();
}

function renderProducts() {
    if (!productsGrid) return;
    let filtered = products.filter(p => p.type === currentTypeFilter);
    if (currentGenderFilter !== 'all') filtered = filtered.filter(p => p.gender === currentGenderFilter);
    if (filtered.length === 0) {
        productsGrid.innerHTML = '<div class="empty-products" style="text-align: center; padding: 60px; color: var(--text-muted);">Нет товаров в этой категории</div>';
        return;
    }
    productsGrid.innerHTML = filtered.map(product => `
        <div class="product-card" data-id="${product.id}">
            <div class="product-img"><img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/300x300/e8dfd9/8b5a42?text=${encodeURIComponent(product.name)}'"></div>
            <div class="product-info">
                <div class="product-title">${product.name}</div>
                <div class="product-desc" style="font-size:0.75rem;color:var(--text-muted);">${product.desc} • ${product.typeName} • ${product.genderName}</div>
                <div class="price">${product.price.toLocaleString()} ₽</div>
                <button class="add-to-cart" data-id="${product.id}"><i class="fas fa-shopping-bag"></i> В корзину</button>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.add-to-cart').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(parseInt(btn.dataset.id), 1);
    }));
    document.querySelectorAll('.product-card').forEach(card => card.addEventListener('click', (e) => {
        if (!e.target.closest('.add-to-cart')) openProductModal(parseInt(card.dataset.id));
    }));
}

function openProductModal(productId) {
    const product = getProductById(productId);
    if (!product || !modalContent) return;

    const parseNotes = (notesStr) => {
        const topMatch = notesStr.match(/Верхние?:?\s*([^;]+)/i);
        const heartMatch = notesStr.match(/Сердце?:?\s*([^;]+)/i);
        const baseMatch = notesStr.match(/База?:?\s*([^;]+)/i);
        return {
            top: topMatch ? topMatch[1].trim() : '—',
            heart: heartMatch ? heartMatch[1].trim() : '—',
            base: baseMatch ? baseMatch[1].trim() : '—'
        };
    };

    const parsed = parseNotes(product.notes);

    modalContent.innerHTML = `
        <div class="modal-image"><img src="${product.image}" alt="${product.name}" onerror="this.src='https://placehold.co/300x300/e8dfd9/8b5a42?text=${encodeURIComponent(product.name)}'"></div>
        <div class="modal-info">
            <h2>${product.name}</h2>
            <div class="modal-type">${product.typeName} • ${product.genderName}</div>
            <div class="modal-desc-full">${product.fullDesc}</div>
            <div class="modal-details">
                <div><span>Объем</span><strong>${product.volume}</strong></div>
                <div><span>Стойкость</span><strong>8-12 часов</strong></div>
                <div><span>Сходство</span><strong>99%</strong></div>
            </div>
            <div class="modal-notes">
                <div class="notes-title"><i class="fas fa-chart-line"></i><span>Пирамида аромата</span></div>
                <div class="notes-pyramid">
                    <div class="note-tier"><div class="note-badge top">Верхние ноты</div><div class="note-list">${parsed.top.split(',').map(n => `<span class="note-item">${n.trim()}</span>`).join('')}</div></div>
                    <div class="note-tier"><div class="note-badge heart">Сердце</div><div class="note-list">${parsed.heart.split(',').map(n => `<span class="note-item">${n.trim()}</span>`).join('')}</div></div>
                    <div class="note-tier"><div class="note-badge base">База</div><div class="note-list">${parsed.base.split(',').map(n => `<span class="note-item">${n.trim()}</span>`).join('')}</div></div>
                </div>
            </div>
            <div class="modal-price">${product.price.toLocaleString()} ₽</div>
            <button class="modal-add-btn" data-id="${product.id}"><i class="fas fa-shopping-bag"></i> Добавить в корзину</button>
        </div>
    `;
    if (modalOverlay) modalOverlay.classList.add('active');
    const addBtn = modalContent.querySelector('.modal-add-btn');
    if (addBtn) addBtn.addEventListener('click', (e) => {
        addToCart(product.id, 1);
        if (modalOverlay) modalOverlay.classList.remove('active');
    });
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTypeFilter = btn.dataset.type;
            renderProducts();
        });
    });
    document.querySelectorAll('.gender-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gender-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGenderFilter = btn.dataset.gender;
            renderProducts();
        });
    });
}

// ============================================
// АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
// ============================================

function updateAccountUI() {
    if (currentUser) {
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (userDashboard) userDashboard.classList.remove('hidden');
        if (currentUser.email === 'admin@aere.com') {
            if (adminPanel) adminPanel.classList.remove('hidden');
            updateAdminStats();
        } else {
            if (adminPanel) adminPanel.classList.add('hidden');
        }
        if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
        if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
        if (userTelegramDisplay) {
            userTelegramDisplay.textContent = currentUser.telegram ? `Telegram: ${currentUser.telegram}` : 'Telegram не указан';
        }
        renderUserOrders();
        renderNotifications();
        updateNotificationBadge();
    } else {
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (userDashboard) userDashboard.classList.add('hidden');
        if (adminPanel) adminPanel.classList.add('hidden');
        if (notificationBadge) notificationBadge.style.display = 'none';
    }
}

function updateAdminStats() {
    if (totalUsersCount) totalUsersCount.textContent = users.filter(u => u.email !== 'admin@aere.com').length;
    if (totalOrdersCount) totalOrdersCount.textContent = orders.length;
}

function renderUserOrders() {
    if (!currentUser || !userOrdersList) return;
    const userOrdersData = orders.filter(o => o.userEmail === currentUser.email);
    if (userOrdersData.length === 0) {
        userOrdersList.innerHTML = '<p class="empty-orders">У вас пока нет заказов</p>';
        return;
    }
    userOrdersList.innerHTML = userOrdersData.map(order => `
        <div class="order-item"><p><strong>${order.date}</strong></p><p>Товаров: ${order.itemsCount}</p><p class="order-total">Сумма: ${order.total.toLocaleString()} ₽</p></div>
    `).join('');
}

// ===== РЕГИСТРАЦИЯ =====
async function register(name, email, telegram, password, confirm) {
    if (password !== confirm) {
        showToast('Пароли не совпадают');
        return false;
    }
    
    const cloudData = await JSONBinAPI.getData() || {};
    const existingUsers = cloudData.users || [];
    
    if (existingUsers.find(u => u.email === email)) {
        showToast('Пользователь с таким email уже существует');
        return false;
    }
    
    const newUser = { 
        id: Date.now(),
        name, 
        email, 
        telegram: telegram || '',
        password,
        partnerId: null,
        registeredAt: new Date().toLocaleString()
    };
    
    users.push(newUser);
    cloudData.users = users;
    await JSONBinAPI.updateData(cloudData);
    localStorage.setItem('aere_users', JSON.stringify(users));
    
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    updateAccountUI();
    closeAccount();
    showToast(`Регистрация прошла успешно! Добро пожаловать, ${name}!`);
    return true;
}

// ===== ВХОД =====
async function login(email, password) {
    let user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        const cloudData = await JSONBinAPI.getData() || {};
        const cloudUsers = cloudData.users || [];
        user = cloudUsers.find(u => u.email === email && u.password === password);
        
        if (user) {
            users = cloudUsers;
            localStorage.setItem('aere_users', JSON.stringify(users));
        }
    }
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAccountUI();
        closeAccount();
        showToast(`Добро пожаловать, ${user.name}!`);
        return true;
    } else {
        showToast('Неверный email или пароль');
        return false;
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAccountUI();
    closeAccount();
    showToast('Вы вышли из аккаунта');
}

async function loadCurrentUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            const parsedUser = JSON.parse(savedUser);
            const cloudData = await JSONBinAPI.getData() || {};
            const cloudUsers = cloudData.users || [];
            const userExists = cloudUsers.find(u => u.email === parsedUser.email);
            
            if (userExists) {
                currentUser = userExists;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                users = cloudUsers;
                localStorage.setItem('aere_users', JSON.stringify(users));
            } else {
                localStorage.removeItem('currentUser');
                currentUser = null;
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
            currentUser = null;
        }
    }
    updateAccountUI();
}

// ===== УВЕДОМЛЕНИЯ =====
function sendNotificationToAll(title, message) {
    const notification = {
        id: Date.now(),
        title: title,
        message: message,
        date: new Date().toLocaleString(),
        readBy: []
    };
    globalNotifications.push(notification);
    saveNotificationsToCloud();
    showToast('Уведомление отправлено всем пользователям');
    if (currentUser && currentUser.email === 'admin@aere.com') renderNotifications();
}

function getUserNotifications() {
    return globalNotifications;
}

function updateNotificationBadge() {
    if (notificationBadge) notificationBadge.style.display = 'none';
}

function renderNotifications() {
    if (!notificationsList) return;
    const userNotifs = getUserNotifications();
    if (userNotifs.length === 0) {
        notificationsList.innerHTML = '<p class="empty-notifications">Нет уведомлений</p>';
        return;
    }
    notificationsList.innerHTML = userNotifs.map(notif => `
        <div class="notification-item" data-id="${notif.id}">
            <div class="notification-title"><span>${notif.title}</span><span class="notification-date">${notif.date}</span></div>
            <div class="notification-message">${notif.message}</div>
        </div>
    `).join('');
}

function openAccount() {
    if (accountSidebar && accountOverlay) {
        accountSidebar.classList.add('open');
        accountOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (currentUser) {
            renderNotifications();
            updateNotificationBadge();
        }
    }
}

function closeAccount() {
    if (accountSidebar && accountOverlay) {
        accountSidebar.classList.remove('open');
        accountOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function openCart() {
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeCart() {
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// ОФОРМЛЕНИЕ ЗАКАЗА
// ============================================

function openOrderModal() {
    if (cart.length === 0) {
        showToast('Корзина пуста');
        return;
    }

    if (!currentUser) {
        showToast('Пожалуйста, войдите в аккаунт');
        closeCart();
        setTimeout(openAccount, 500);
        return;
    }

    renderOrderSummary();
    if (orderModalOverlay) {
        orderModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function renderOrderSummary() {
    if (!orderSummary) return;
    let itemsHtml = '';
    let total = 0;

    cart.forEach(item => {
        const product = getProductById(item.id);
        if (!product) return;
        const subtotal = product.price * item.quantity;
        total += subtotal;
        itemsHtml += `
            <div class="order-summary-item">
                <span>${product.name} × ${item.quantity}</span>
                <span>${subtotal.toLocaleString()} ₽</span>
            </div>
        `;
    });

    orderSummary.innerHTML = `
        <h4><i class="fas fa-shopping-bag"></i> Ваш заказ</h4>
        <div class="order-summary-items">${itemsHtml}</div>
        <div class="order-summary-total">
            <span>Итого к оплате:</span>
            <span>${total.toLocaleString()} ₽</span>
        </div>
    `;
}

function closeOrderModal() {
    if (orderModalOverlay) {
        orderModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function sendOrderToTelegram(orderData) {
    const itemsList = orderData.items.map(item =>
        `• ${item.name} × ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} ₽`
    ).join('\n');

    const message = `🛍️ НОВЫЙ ЗАКАЗ!
    
👤 Клиент: ${orderData.userEmail}
📧 Email: ${orderData.userEmail}
📱 Телефон: ${orderData.phone}
📍 Адрес: ${orderData.address}
💬 Комментарий: ${orderData.comment || 'Нет'}

📦 Товары:
${itemsList}

💰 Итого: ${orderData.total.toLocaleString()} ₽

🕐 Дата: ${orderData.date}`;

    const encodedMessage = encodeURIComponent(message);
    const telegramUrl = `https://t.me/AERE_RU?text=${encodedMessage}`;
    
    window.open(telegramUrl, '_blank');
    return true;
}

// ===== СОХРАНЕНИЕ ЗАКАЗА В ОБЛАКО =====
async function saveOrderToCloud(orderData) {
    try {
        const data = await JSONBinAPI.getData() || {};
        let orders = data.orders || [];
        
        orders.push(orderData);
        data.orders = orders;
        
        await JSONBinAPI.updateData(data);
        
        localStorage.setItem('aere_orders', JSON.stringify(orders));
        
        console.log(`✅ Заказ #${orderData.id} сохранен`);
        console.log(`👤 Клиент: ${orderData.userEmail}`);
        console.log(`💰 Сумма: ${orderData.total} ₽`);
        console.log(`🤝 Партнер: ${orderData.partnerId ? 'ID: ' + orderData.partnerId : 'Не привязан'}`);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения заказа:', error);
        throw error;
    }
}

// ===== ОБРАБОТКА ЗАКАЗА =====
async function processOrder(event) {
    event.preventDefault();

    const address = deliveryAddress.value.trim();
    const phone = deliveryPhone.value.trim();
    const comment = deliveryComment.value.trim();

    if (!address) {
        showToast('Пожалуйста, введите адрес доставки');
        deliveryAddress.focus();
        return;
    }

    if (!phone) {
        showToast('Пожалуйста, введите телефон для связи');
        deliveryPhone.focus();
        return;
    }

    confirmOrderBtn.disabled = true;
    confirmOrderBtn.innerHTML = '<span class="loading-spinner"></span> Отправка...';

    try {
        const orderItems = cart.map(item => {
            const product = getProductById(item.id);
            return {
                name: product.name,
                quantity: item.quantity,
                price: product.price
            };
        });

        const total = cart.reduce((sum, item) => {
            const product = getProductById(item.id);
            return sum + (product.price * item.quantity);
        }, 0);

        // Находим пользователя и его партнера
        const user = users.find(u => u.email === currentUser.email);
        const partnerId = user ? user.partnerId : null;

        // СОЗДАЕМ ЗАКАЗ В ЕДИНОЙ БАЗЕ
        const orderData = {
            id: Date.now(),
            userEmail: currentUser.email,
            userTelegram: currentUser.telegram || '',
            partnerId: partnerId || null,
            items: orderItems,
            total: total,
            itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
            address: address,
            phone: phone,
            comment: comment || '',
            date: new Date().toLocaleString(),
            status: 'completed'
        };

        // Сохраняем заказ в единую базу
        await saveOrderToCloud(orderData);

        // Отправляем в Telegram
        sendOrderToTelegram(orderData);

        cart = [];
        saveCartToLocal();
        updateCartUI();
        updateCartCounter();

        closeOrderModal();

        showToast(`✅ Заказ успешно оформлен! Сумма: ${total.toLocaleString()} ₽`, 3000);

        deliveryAddress.value = '';
        deliveryPhone.value = '';
        deliveryComment.value = '';

    } catch (error) {
        console.error('Ошибка при оформлении заказа:', error);
        showToast('❌ Произошла ошибка при оформлении заказа. Попробуйте еще раз.');
    } finally {
        confirmOrderBtn.disabled = false;
        confirmOrderBtn.innerHTML = '<i class="fas fa-check"></i> Подтвердить заказ';
    }
}

// ============================================
// ТЕМА
// ============================================

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    else document.documentElement.setAttribute('data-theme', window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    productsGrid = document.getElementById('productsGrid');
    cartIcon = document.getElementById('cartIcon');
    cartOverlay = document.getElementById('cartOverlay');
    cartSidebar = document.getElementById('cartSidebar');
    closeCartBtn = document.getElementById('closeCartBtn');
    cartItemsContainer = document.getElementById('cartItemsContainer');
    cartTotalPriceSpan = document.getElementById('cartTotalPrice');
    cartCountSpan = document.getElementById('cartCount');
    checkoutBtn = document.getElementById('checkoutBtn');
    toastMsg = document.getElementById('toastMsg');
    themeToggle = document.getElementById('themeToggle');
    modalOverlay = document.getElementById('productModal');
    modalContent = document.getElementById('modalContent');
    modalCloseBtn = document.querySelector('.modal-close');
    accountIcon = document.getElementById('accountIcon');
    accountOverlay = document.getElementById('accountOverlay');
    accountSidebar = document.getElementById('accountSidebar');
    closeAccountBtn = document.getElementById('closeAccountBtn');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    userDashboard = document.getElementById('userDashboard');
    adminPanel = document.getElementById('adminPanel');
    showRegisterLink = document.getElementById('showRegister');
    showLoginLink = document.getElementById('showLogin');
    doLoginBtn = document.getElementById('doLoginBtn');
    doRegisterBtn = document.getElementById('doRegisterBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userNameDisplay = document.getElementById('userNameDisplay');
    userEmailDisplay = document.getElementById('userEmailDisplay');
    userTelegramDisplay = document.getElementById('userTelegramDisplay');
    userOrdersList = document.getElementById('userOrdersList');
    notificationsList = document.getElementById('notificationsList');
    notificationBadge = document.getElementById('notificationBadge');
    markAllReadBtn = document.getElementById('markAllReadBtn');
    sendNotificationBtn = document.getElementById('sendNotificationBtn');
    adminSyncBtn = document.getElementById('adminSyncBtn');
    totalUsersCount = document.getElementById('totalUsersCount');
    totalOrdersCount = document.getElementById('totalOrdersCount');
    orderModalOverlay = document.getElementById('orderModalOverlay');
    orderModalClose = document.getElementById('orderModalClose');
    orderForm = document.getElementById('orderForm');
    deliveryAddress = document.getElementById('deliveryAddress');
    deliveryPhone = document.getElementById('deliveryPhone');
    deliveryComment = document.getElementById('deliveryComment');
    orderSummary = document.getElementById('orderSummary');
    confirmOrderBtn = document.getElementById('confirmOrderBtn');
    loadingIndicator = document.getElementById('loadingIndicator');

    loadTheme();

    await loadDataFromCloud();

    loadCartFromLocal();
    await loadCurrentUser();

    if (cartIcon) cartIcon.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
    if (checkoutBtn) checkoutBtn.addEventListener('click', openOrderModal);
    if (accountIcon) accountIcon.addEventListener('click', openAccount);
    if (closeAccountBtn) closeAccountBtn.addEventListener('click', closeAccount);
    if (accountOverlay) accountOverlay.addEventListener('click', closeAccount);

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm && registerForm) {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
            }
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerForm && loginForm) {
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
            }
        });
    }

    if (doLoginBtn) {
        doLoginBtn.addEventListener('click', async () => {
            await login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
        });
    }

    if (doRegisterBtn) {
        doRegisterBtn.addEventListener('click', async () => {
            await register(
                document.getElementById('regName').value,
                document.getElementById('regEmail').value,
                document.getElementById('regTelegram').value,
                document.getElementById('regPassword').value,
                document.getElementById('regConfirm').value
            );
        });
    }

    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            showToast('Все уведомления прочитаны');
            updateNotificationBadge();
        });
    }

    if (sendNotificationBtn) {
        sendNotificationBtn.addEventListener('click', () => {
            const title = document.getElementById('notificationTitle').value;
            const message = document.getElementById('notificationMessage').value;
            if (title && message) {
                sendNotificationToAll(title, message);
                document.getElementById('notificationTitle').value = '';
                document.getElementById('notificationMessage').value = '';
            } else {
                showToast('Заполните заголовок и текст');
            }
        });
    }

    if (adminSyncBtn) {
        adminSyncBtn.addEventListener('click', async () => {
            const btn = adminSyncBtn;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Синхронизация...';
            btn.disabled = true;

            try {
                await syncAllDataToCloud();
                showToast('✅ Все данные успешно синхронизированы с облаком!');
            } catch (error) {
                showToast('❌ Ошибка синхронизации');
            } finally {
                btn.innerHTML = '<i class="fas fa-sync"></i> Синхронизировать с облаком';
                btn.disabled = false;
            }
        });
    }

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    if (orderModalClose) orderModalClose.addEventListener('click', closeOrderModal);
    if (orderModalOverlay) orderModalOverlay.addEventListener('click', (e) => {
        if (e.target === orderModalOverlay) closeOrderModal();
    });
    if (orderForm) orderForm.addEventListener('submit', processOrder);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (cartSidebar?.classList.contains('open')) closeCart();
            if (accountSidebar?.classList.contains('open')) closeAccount();
            if (modalOverlay?.classList.contains('active')) closeModal();
            if (orderModalOverlay?.classList.contains('active')) closeOrderModal();
        }
    });

    if (products.length > 0 || users.length > 0) {
        try {
            await syncAllDataToCloud();
            console.log('✅ Данные синхронизированы с облаком при запуске');
        } catch (error) {
            console.warn('⚠️ Автоматическая синхронизация не удалась');
        }
    }
});