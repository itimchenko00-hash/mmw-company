(() => {
    const tokenKey = 'mmw_access_token';

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function loadLead(token) {
        const response = await fetch(
            `/api/my-lead?token=${encodeURIComponent(token)}`
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error('Сервер вернул некорректный ответ.');
        }

        if (!response.ok || !data.ok) {
            throw new Error(data.message || 'Заявка не найдена.');
        }

        return data.lead;
    }

    function showPanel() {
        let panel = document.getElementById('clientPanel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'clientPanel';
            panel.className = 'client-panel';
            document.body.appendChild(panel);
        }

        const savedToken = localStorage.getItem(tokenKey) || '';

        panel.innerHTML = `
            <div class="client-panel-overlay" data-close-client-panel></div>

            <div class="client-panel-box">

                <button
                    class="client-panel-close"
                    type="button"
                    data-close-client-panel
                    aria-label="Закрыть"
                >×</button>

                <h2>📋 Мои заявки</h2>

                <p>
                    Введите 5-значный код доступа к вашей заявке.
                    Это последние 5 цифр 12-значного номера заявки.
                </p>

                <label for="leadAccessToken">
                    Код доступа
                </label>

                <input
                    id="leadAccessToken"
                    type="text"
                    inputmode="numeric"
                    maxlength="5"
                    pattern="[0-9]{5}"
                    autocomplete="one-time-code"
                    placeholder="Например: 61399"
                    value="${escapeHtml(savedToken)}"
                >

                <button
                    id="saveLeadToken"
                    class="btn primary full"
                    type="button"
                >
                    Открыть мою заявку
                </button>

                <button
                    id="clearLeadToken"
                    class="btn full"
                    type="button"
                    style="margin-top:10px;"
                >
                    Сбросить код
                </button>

                <div id="myLeadResult"></div>

            </div>
        `;

        document
            .querySelectorAll('[data-close-client-panel]')
            .forEach(element => {
                element.addEventListener('click', closePanel);
            });

        const input = document.getElementById('leadAccessToken');
        const saveButton = document.getElementById('saveLeadToken');
        const clearButton = document.getElementById('clearLeadToken');

        if (input) {
            input.addEventListener('input', () => {
                input.value = input.value
                    .replace(/\D/g, '')
                    .slice(0, 5);
            });

            input.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();

                    if (saveButton) {
                        saveButton.click();
                    }
                }
            });
        }

        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                const newToken = input
                    ? input.value.trim()
                    : '';

                if (!/^\d{5}$/.test(newToken)) {
                    showResult(`
                        <div class="client-error">
                            ❌ Введите ровно 5 цифр кода доступа.
                        </div>
                    `);

                    if (input) {
                        input.focus();
                        input.select();
                    }

                    return;
                }

                saveButton.disabled = true;
                saveButton.textContent = 'Проверяем...';

                try {
                    const lead = await loadLead(newToken);

                    localStorage.setItem(tokenKey, newToken);

                    renderLead(lead, newToken);

                } catch (error) {
                    localStorage.removeItem(tokenKey);

                    showResult(`
                        <div class="client-error">
                            ❌ ${escapeHtml(error.message)}
                        </div>
                    `);

                    if (input) {
                        input.focus();
                        input.select();
                    }
                } finally {
                    saveButton.disabled = false;
                    saveButton.textContent = 'Открыть мою заявку';
                }
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                localStorage.removeItem(tokenKey);

                if (input) {
                    input.value = '';
                    input.focus();
                }

                showResult(`
                    <div style="margin-top:15px;">
                        Код доступа сброшен.
                    </div>
                `);
            });
        }

        if (savedToken && /^\d{5}$/.test(savedToken)) {
            setTimeout(() => {
                openLead(savedToken);
            }, 100);
        }
    }

    async function openLead(token) {
        if (!/^\d{5}$/.test(String(token || ''))) {
            showResult(`
                <div class="client-error">
                    ❌ Введите ровно 5 цифр кода доступа.
                </div>
            `);
            return;
        }

        try {
            showResult(`
                <div style="margin-top:15px;">
                    Загрузка заявки...
                </div>
            `);

            const lead = await loadLead(token);

            renderLead(lead, token);

        } catch (error) {
            localStorage.removeItem(tokenKey);

            showResult(`
                <div class="client-error">
                    ❌ ${escapeHtml(error.message)}
                </div>
            `);
        }
    }

    function renderLead(lead, token) {
        const history = Array.isArray(lead.history)
            ? lead.history
            : [];

        const extras = Array.isArray(lead.extras)
            ? lead.extras
            : [];

        const createdAt = lead.createdAt
            ? new Date(lead.createdAt).toLocaleString('ru-RU')
            : '—';

        const statusMap = {
            new: 'Новая',
            in_progress: 'В работе',
            completed: 'Завершена',
            cancelled: 'Отменена'
        };

        const statusText =
            statusMap[lead.status] ||
            lead.status ||
            'Новая';

        const client = lead.client || {};
        const project = lead.project || {};
        const packageData = lead.package || {};

        showResult(`
            <div class="lead-card">

                <div style="margin-bottom:18px;">
                    <button
                        id="downloadLeadPdf"
                        class="btn primary full"
                        type="button"
                    >
                        📄 Скачать выписку PDF
                    </button>
                </div>

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:12px;
                    margin-bottom:18px;
                ">

                    <div>
                        <div style="
                            font-size:12px;
                            opacity:.65;
                            margin-bottom:4px;
                        ">
                            НОМЕР ЗАЯВКИ
                        </div>

                        <h3 style="margin:0;">
                            ${escapeHtml(lead.number)}
                        </h3>
                    </div>

                    <div style="
                        padding:7px 11px;
                        border-radius:20px;
                        background:#e8f7ed;
                        color:#176b35;
                        font-size:13px;
                        font-weight:700;
                        white-space:nowrap;
                    ">
                        ${escapeHtml(statusText)}
                    </div>

                </div>

                <p>
                    <strong>📅 Дата оформления:</strong><br>
                    ${escapeHtml(createdAt)}
                </p>

                <hr>

                <h4>👤 Клиент</h4>

                <p>
                    <strong>Имя:</strong>
                    ${escapeHtml(client.name || '—')}
                </p>

                <p>
                    <strong>Телефон:</strong>
                    ${escapeHtml(client.phone || '—')}
                </p>

                ${
                    client.email
                    ? `
                        <p>
                            <strong>Email:</strong>
                            ${escapeHtml(client.email)}
                        </p>
                    `
                    : ''
                }

                ${
                    client.company
                    ? `
                        <p>
                            <strong>Компания:</strong>
                            ${escapeHtml(client.company)}
                        </p>
                    `
                    : ''
                }

                <hr>

                <h4>💼 Проект</h4>

                <p>
                    <strong>Направление:</strong><br>
                    ${escapeHtml(project.name || '—')}
                </p>

                ${
                    project.region
                    ? `
                        <p>
                            <strong>Регион:</strong><br>
                            ${escapeHtml(project.region)}
                        </p>
                    `
                    : ''
                }

                <hr>

                <h4>📦 Услуги</h4>

                <p>
                    <strong>Основной пакет:</strong><br>
                    ${escapeHtml(packageData.name || '—')}
                </p>

                <p>
                    <strong>Стоимость пакета:</strong><br>
                    ${escapeHtml(packageData.price || '—')}
                </p>

                <p>
                    <strong>Дополнительные услуги:</strong>
                </p>

                ${
                    extras.length
                    ? `
                        <ul style="padding-left:20px;">
                            ${extras.map(extra => `
                                <li>
                                    ${escapeHtml(
                                        typeof extra === 'string'
                                            ? extra
                                            : (
                                                extra.name ||
                                                extra.title ||
                                                'Дополнительная услуга'
                                            )
                                    )}
                                </li>
                            `).join('')}
                        </ul>
                    `
                    : '<p>Нет дополнительных услуг.</p>'
                }

                ${
                    lead.budget
                    ? `
                        <p>
                            <strong>💰 Бюджет:</strong><br>
                            ${escapeHtml(lead.budget)}
                        </p>
                    `
                    : ''
                }

                ${
                    lead.message &&
                    lead.message.trim()
                    ? `
                        <hr>

                        <h4>📝 Описание проекта</h4>

                        <p>
                            ${escapeHtml(lead.message)}
                        </p>
                    `
                    : ''
                }

                <hr>

                <h4>🕘 История заявки</h4>

                ${
                    history.length
                    ? history.map(item => {

                        const historyDate = item.date
                            ? new Date(item.date)
                                .toLocaleString('ru-RU')
                            : '';

                        const historyStatus =
                            statusMap[item.status] ||
                            item.status ||
                            '';

                        return `
                            <div class="history-item">

                                <strong>
                                    ${escapeHtml(historyStatus)}
                                </strong>

                                ${
                                    historyDate
                                    ? `
                                        <br>
                                        <small>
                                            ${escapeHtml(historyDate)}
                                        </small>
                                    `
                                    : ''
                                }

                                ${
                                    item.comment
                                    ? `
                                        <br>
                                        ${escapeHtml(item.comment)}
                                    `
                                    : ''
                                }

                            </div>
                        `;
                    }).join('')
                    : '<p>История пока пуста.</p>'
                }

            </div>
        `);

        const pdfButton =
            document.getElementById('downloadLeadPdf');

        if (pdfButton) {
            pdfButton.addEventListener('click', () => {
                const pdfUrl =
                    `/api/my-lead/pdf?token=${encodeURIComponent(token)}`;

                window.open(pdfUrl, '_blank');
            });
        }
    }

    function showResult(html) {
        const result =
            document.getElementById('myLeadResult');

        if (result) {
            result.innerHTML = html;
        }
    }

    function closePanel() {
        const panel =
            document.getElementById('clientPanel');

        if (panel) {
            panel.remove();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const button =
            document.getElementById('myLeadsButton');

        if (button) {
            button.addEventListener('click', showPanel);
        }
    });
})();
