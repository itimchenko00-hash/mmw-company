const packages = [
    {id:1,name:"BUSINESS CONCEPT",price:49000,description:"Анализ идеи, продукта, аудитории, рынка, конкурентов, бизнес-модели и стратегии."},
    {id:2,name:"BUSINESS PROJECT",price:119000,description:"Полный бизнес-проект: рынок, конкуренты, стратегия, организация, финансовая модель и Roadmap."},
    {id:3,name:"BUSINESS SYSTEM",price:249000,description:"Полная архитектура бизнеса с операционными процессами, документацией, управлением и продажами."},
    {id:4,name:"INVESTMENT PROJECT",price:169000,description:"Структурированный инвестиционный проект с экономикой, финансовой моделью и инвестиционной упаковкой."},
    {id:5,name:"BUSINESS RESTART",price:99000,description:"Анализ и перезапуск существующего бизнеса, оптимизация модели, продаж, расходов и процессов."},
    {id:6,name:"BUSINESS SALE",price:129000,description:"Подготовка бизнеса или проекта к продаже и переговорам с потенциальным покупателем."},
    {id:7,name:"BUSINESS + INVESTOR",price:229000,description:"Разработка бизнеса плюс подготовка проекта к поиску инвестора."},
    {id:8,name:"CUSTOM BUSINESS PROJECT",price:299000,description:"Индивидуальные сложные проекты. Финальная стоимость определяется после анализа задачи."},
    {id:9,name:"LARGE SCALE",price:499000,description:"Комплексная разработка для крупных компаний и инвестиционных групп."}
];

const extras = [
    {name:"Финансовая модель",price:24900},
    {name:"Бизнес-план",price:39900},
    {name:"Инвестиционная презентация",price:19900},
    {name:"Investment Memorandum",price:29900},
    {name:"Executive Summary",price:14900},
    {name:"Data Room",price:29900},
    {name:"Business Documentation Package",price:49900},
    {name:"Анализ рынка",price:29900},
    {name:"Конкурентный анализ",price:19900}
];

const $ = id => document.getElementById(id);

let selectedPackage = packages[1];

function money(value) {
    return new Intl.NumberFormat("uk-UA").format(value) + " грн";
}

function renderPackages() {
    $("packageGrid").innerHTML = packages.map(item => `
        <article class="package-card">
            <div class="package-number">0${item.id}</div>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
            <div class="package-price">
                ${item.id >= 8 ? "от " : ""}${money(item.price)}
            </div>
            <button class="btn secondary package-button" data-id="${item.id}">
                Выбрать пакет
            </button>
        </article>
    `).join("");

    document.querySelectorAll(".package-button").forEach(button => {
        button.addEventListener("click", () => {
            selectPackage(Number(button.dataset.id));
        });
    });
}

function renderSelect() {
    $("packageSelect").innerHTML = packages.map(item => `
        <option value="${item.id}">
            ${item.name} — ${item.id >= 8 ? "от " : ""}${money(item.price)}
        </option>
    `).join("");

    $("packageSelect").value = selectedPackage.id;
}

function renderExtras() {
    $("extras").innerHTML = extras.map((item,index) => `
        <label class="extra-item">
            <input type="checkbox" class="extra-checkbox" data-index="${index}">
            <span>${item.name} — ${money(item.price)}</span>
        </label>
    `).join("");

    document.querySelectorAll(".extra-checkbox").forEach(box => {
        box.addEventListener("change", calculateTotal);
    });
}

function selectPackage(id) {
    selectedPackage = packages.find(item => item.id === id);

    $("packageSelect").value = id;

    calculateTotal();

    $("calculator").scrollIntoView({
        behavior: "smooth"
    });
}

function calculateTotal() {
    selectedPackage = packages.find(
        item => item.id === Number($("packageSelect").value)
    );

    if (!selectedPackage) return;

    $("packageInfo").textContent = selectedPackage.description;

    let total = selectedPackage.price;

    document.querySelectorAll(".extra-checkbox:checked").forEach(box => {
        total += extras[Number(box.dataset.index)].price;
    });

    $("total").textContent =
        `${selectedPackage.id >= 8 ? "от " : ""}${money(total)}`;
}

function showForm() {
    const formSection = $("leadForm");

    formSection.classList.remove("hidden");

    formSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

async function submitLead(event) {
    event.preventDefault();

    const status = $("formStatus");
    const form = event.target;

    status.textContent = "Отправляем заявку...";

    const selectedExtras = [];

    document.querySelectorAll(".extra-checkbox:checked").forEach(box => {
        selectedExtras.push(
            extras[Number(box.dataset.index)].name
        );
    });

    const formData = new FormData(form);

    // Получаем актуальный состав корзины
    const cartItems = window.MMWCart ? window.MMWCart.get() : [];

    const cartTotal = cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0
    );

    // Формируем описание заказа из корзины
    let cartMessage = "";

    if (cartItems.length) {
        cartMessage =
            "\\n\\nЗаказ из корзины:\\n" +
            cartItems.map((item, index) =>
                (index + 1) + ". " + item.name +
                " — " + (Number(item.price) || 0) + " грн"
            ).join("\\n") +
            "\\nИтого: " + cartTotal + " грн";
    }

    const originalMessage = formData.get("message") || "";

    const data = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        company: formData.get("company"),
        project: formData.get("project"),
        region: formData.get("region"),
        budget: formData.get("budget"),
        message: originalMessage + cartMessage,
        packageName: cartItems.length
            ? cartItems.map(item => item.name).join(", ")
            : selectedPackage.name,
        packagePrice: cartItems.length
            ? cartTotal + " грн"
            : $("total").textContent,
        extras: selectedExtras
    };

    try {
        const response = await fetch("/api/lead", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Ошибка сервера");
        }

        status.textContent =
            "✓ Заявка успешно отправлена.";

        // Сохраняем доступ клиента к его заявке
        if (result.lead && result.lead.accessToken) {
            localStorage.setItem(
                "mmw_access_token",
                result.lead.accessToken
            );
        }

        // Показываем клиенту полноценную выписку
        if (result.lead) {
            const lead = result.lead;

            const extras = Array.isArray(lead.extras)
                ? lead.extras
                : [];

            status.innerHTML = `
                <div class="lead-card lead-success">
                    <h3>✓ Заявка успешно оформлена</h3>

                    <p>
                        <strong>Номер заявки:</strong><br>
                        ${escapeHtml(lead.number)}
                    </p>

                    <p>
                        <strong>Статус:</strong>
                        ${escapeHtml(lead.status || "new")}
                    </p>

                    <hr>

                    <h4>Выписка по заявке</h4>

                    <p>
                        <strong>Клиент:</strong><br>
                        ${escapeHtml(lead.client?.name || lead.name || "")}
                    </p>

                    <p>
                        <strong>Пакет:</strong><br>
                        ${escapeHtml(lead.package?.name || "")}
                    </p>

                    <p>
                        <strong>Стоимость пакета:</strong><br>
                        ${escapeHtml(lead.package?.price || "")}
                    </p>

                    ${
                        extras.length
                        ? `
                            <p><strong>Дополнительные услуги:</strong></p>
                            ${extras.map(extra => `
                                <div class="history-item">
                                    ${escapeHtml(
                                        extra.name ||
                                        extra.title ||
                                        extra
                                    )}
                                </div>
                            `).join("")}
                        `
                        : ""
                    }

                    <hr>

                    <p>
                        <strong>Проект:</strong><br>
                        ${escapeHtml(lead.project?.name || "")}
                    </p>

                    ${
                        lead.budget
                        ? `
                            <p>
                                <strong>Бюджет:</strong><br>
                                ${escapeHtml(lead.budget)}
                            </p>
                        `
                        : ""
                    }

                    ${
                        lead.description
                        ? `
                            <p>
                                <strong>Описание:</strong><br>
                                ${escapeHtml(lead.description)}
                            </p>
                        `
                        : ""
                    }

                    <hr>

                    <p>
                        🔐 Доступ к заявке сохранён.
                    </p>

                    <button
                        type="button"
                        class="btn primary full"
                        id="openMyLeadAfterSubmit"
                    >
                        📋 Открыть «Мои заявки»
                    </button>
                </div>
            `;

            const openMyLeadButton =
                document.getElementById("openMyLeadAfterSubmit");

            if (openMyLeadButton) {
                openMyLeadButton.addEventListener("click", () => {
                    const myLeadsButton =
                        document.getElementById("myLeadsButton");

                    if (myLeadsButton) {
                        myLeadsButton.click();
                    }
                });
            }
        }

        form.reset();

        document.querySelectorAll(".extra-checkbox").forEach(box => {
            box.checked = false;
        });

        calculateTotal();

        // Очищаем корзину после успешной отправки
        if (window.MMWCart) {
            window.MMWCart.clear();
        }

        const cartCount = document.getElementById("cartCount");
        const cartFloatingCount =
            document.getElementById("cartFloatingCount");

        if (cartCount) cartCount.textContent = "0";
        if (cartFloatingCount) {
            cartFloatingCount.textContent = "0";
        }

    } catch (error) {
        console.error("MMW FORM ERROR:", error);

        status.textContent =
            "Ошибка отправки: " + error.message;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {

    renderPackages();
    renderSelect();
    renderExtras();
    calculateTotal();

    $("packageSelect").addEventListener(
        "change",
        calculateTotal
    );

    $("prepareButton").addEventListener(
        "click",
        () => {
            const cartButton = document.getElementById("cartButton");

            if (cartButton) {
                cartButton.click();
            }
        }
    );

    $("leadFormElement").addEventListener(
        "submit",
        submitLead
    );

    console.log("MMW-COMPANY frontend loaded");
});

/* MMW-COMPANY CART */
(() => {
    const cartKey = 'mmw_cart';

    let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');

    const cartModal = document.getElementById('cartModal');
    const cartButton = document.getElementById('cartButton');
    const cartClose = document.getElementById('cartClose');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');

    if (!cartModal || !cartButton) return;

    function saveCart() {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        renderCart();
    }

    function renderCart() {
        cartCount.textContent = cart.length;

        if (!cart.length) {
            cartItems.innerHTML =
                '<div class="cart-empty">Корзина пуста</div>';
            cartTotal.textContent = '0 грн';
            return;
        }

        let total = 0;

        cartItems.innerHTML = cart.map((item, index) => {
            const price = Number(item.price) || 0;
            total += price;

            return `
                <div class="cart-item">
                    <div>
                        <div class="cart-item-name">${item.name}</div>
                    </div>
                    <div>
                        <span class="cart-item-price">
                            ${price.toLocaleString('uk-UA')} грн
                        </span>
                        <button
                            class="cart-remove"
                            type="button"
                            data-cart-index="${index}">
                            Удалить
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        cartTotal.textContent =
            total.toLocaleString('uk-UA') + ' грн';

        cartItems.querySelectorAll('[data-cart-index]').forEach(button => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.cartIndex);
                cart.splice(index, 1);
                saveCart();
            });
        });
    }

    cartButton.addEventListener('click', () => {
        renderCart();
        cartModal.classList.add('active');
    });

    cartClose.addEventListener('click', () => {
        cartModal.classList.remove('active');
    });

    cartModal.addEventListener('click', event => {
        if (event.target === cartModal) {
            cartModal.classList.remove('active');
        }
    });

    renderCart();

    window.MMWCart = {
        add(item) {
            cart.push({
                name: item.name,
                price: Number(item.price) || 0
            });
            saveCart();
        },

        get() {
            return [...cart];
        },

        clear() {
            cart = [];
            saveCart();
        }
    };
})();

/* CONNECT CALCULATOR TO CART */
(() => {
    if (typeof window.MMWCart === "undefined") return;

    function syncCalculatorCart() {
        const items = [];

        if (selectedPackage) {
            items.push({
                name: selectedPackage.name,
                price: selectedPackage.price
            });
        }

        document.querySelectorAll(".extra-checkbox:checked").forEach(box => {
            const extra = extras[Number(box.dataset.index)];

            if (extra) {
                items.push({
                    name: extra.name,
                    price: extra.price
                });
            }
        });

        localStorage.setItem("mmw_cart", JSON.stringify(items));

        const count = document.getElementById("cartCount");
        if (count) count.textContent = items.length;
    }

    const originalCalculateTotal = window.calculateTotal;

    window.calculateTotal = function() {
        if (typeof originalCalculateTotal === "function") {
            originalCalculateTotal();
        }

        syncCalculatorCart();
    };

    document.addEventListener("change", event => {
        if (
            event.target.matches("#packageSelect") ||
            event.target.matches(".extra-checkbox")
        ) {
            setTimeout(syncCalculatorCart, 0);
        }
    });

    document.addEventListener("click", event => {
        if (event.target.closest(".package-button")) {
            setTimeout(syncCalculatorCart, 0);
        }
    });

    syncCalculatorCart();
})();

/* FLOATING CART BUTTON */
(() => {
    const floating = document.getElementById("cartFloatingButton");
    const mainCart = document.getElementById("cartButton");
    const count = document.getElementById("cartCount");
    const floatingCount = document.getElementById("cartFloatingCount");

    if (!floating) return;

    floating.addEventListener("click", () => {
        if (mainCart) {
            mainCart.click();
        }
    });

    function updateFloatingCount() {
        if (floatingCount && count) {
            floatingCount.textContent = count.textContent;
        }
    }

    updateFloatingCount();

    setInterval(updateFloatingCount, 500);
})();

/* CART CHECKOUT */
(() => {
    const checkout = document.getElementById("cartCheckout");
    const modal = document.getElementById("cartModal");

    if (!checkout) return;

    checkout.addEventListener("click", () => {
        if (modal) {
            modal.classList.remove("active");
        }

        const formSection = document.getElementById("leadForm");

        if (formSection) {
            formSection.classList.remove("hidden");

            formSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            const firstInput = formSection.querySelector(
                'input[name="name"]'
            );

            if (firstInput) {
                setTimeout(() => firstInput.focus(), 500);
            }
        }
    });
})();
