(() => {

const tokenKey="mmw_access_token";

function escapeHtml(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

async function loadLead(token){

    const response=await fetch(
        "/api/my-lead?token="+
        encodeURIComponent(token)
    );

    const data=await response.json();

    if(!response.ok || !data.ok){
        throw new Error(
            data.message ||
            "Заявка не найдена"
        );
    }

    return data.lead;
}

function showResult(html){

    const result=
        document.getElementById(
            "myLeadResult"
        );

    if(result){
        result.innerHTML=html;
    }
}

function closePanel(){

    const panel=
        document.getElementById(
            "clientPanel"
        );

    if(panel){
        panel.remove();
    }
}

function showPanel(){

    let panel=
        document.getElementById(
            "clientPanel"
        );

    if(!panel){

        panel=document.createElement("div");

        panel.id="clientPanel";

        panel.style.cssText=`
            position:fixed;
            inset:0;
            z-index:99999;
            overflow:auto;
            background:rgba(0,0,0,.78);
            padding:30px 15px;
        `;

        document.body.appendChild(panel);
    }

    const token=
        localStorage.getItem(tokenKey) || "";

    panel.innerHTML=`

        <div
            style="
                max-width:560px;
                margin:4vh auto;
                background:#101318;
                color:#fff;
                border:1px solid #d7b56d;
                border-radius:16px;
                padding:25px;
                position:relative;
            "
        >

            <button
                id="closeClientPanel"
                type="button"
                style="
                    position:absolute;
                    right:14px;
                    top:10px;
                    background:none;
                    border:0;
                    color:#fff;
                    font-size:28px;
                    cursor:pointer;
                "
            >×</button>

            <h2>Мои заявки</h2>

            <p style="color:#9ca3ad">
                Введите 5-значный код доступа,
                полученный после оформления заявки.
            </p>

            <label for="leadAccessToken">
                Код доступа
            </label>

            <input
                id="leadAccessToken"
                type="text"
                inputmode="numeric"
                maxlength="5"
                autocomplete="off"
                placeholder="Например: 61399"
                value="${escapeHtml(token)}"
                style="
                    width:100%;
                    padding:14px;
                    margin:8px 0 12px;
                    box-sizing:border-box;
                    background:#0b0e12;
                    color:#fff;
                    border:1px solid #303640;
                    border-radius:9px;
                    font-size:20px;
                    letter-spacing:4px;
                "
            >

            <button
                id="saveLeadToken"
                type="button"
                style="
                    width:100%;
                    padding:14px;
                    background:#d7b56d;
                    color:#111;
                    border:0;
                    border-radius:9px;
                    font-weight:800;
                    cursor:pointer;
                "
            >
                Открыть заявку
            </button>

            <button
                id="clearLeadToken"
                type="button"
                style="
                    width:100%;
                    padding:11px;
                    margin-top:9px;
                    background:#15191f;
                    color:#fff;
                    border:1px solid #303640;
                    border-radius:9px;
                    cursor:pointer;
                "
            >
                Очистить код
            </button>

            <div
                id="myLeadResult"
                style="margin-top:20px"
            ></div>

        </div>
    `;

    document
        .getElementById("closeClientPanel")
        .addEventListener(
            "click",
            closePanel
        );

    const input=
        document.getElementById(
            "leadAccessToken"
        );

    input.addEventListener(
        "input",
        ()=>{
            input.value=
                input.value
                    .replace(/\D/g,"")
                    .slice(0,5);
        }
    );

    document
        .getElementById("saveLeadToken")
        .addEventListener(
            "click",
            ()=>{
                const value=
                    input.value.trim();

                if(!/^\d{5}$/.test(value)){

                    showResult(`
                        <div style="
                            padding:14px;
                            color:#ff9b9b;
                            border:1px solid #663535;
                            border-radius:9px;
                        ">
                            Введите ровно 5 цифр.
                        </div>
                    `);

                    input.focus();
                    return;
                }

                localStorage.setItem(
                    tokenKey,
                    value
                );

                openLead(value);
            }
        );

    document
        .getElementById("clearLeadToken")
        .addEventListener(
            "click",
            ()=>{
                localStorage.removeItem(
                    tokenKey
                );

                input.value="";

                showResult("");
                input.focus();
            }
        );

    if(token && /^\d{5}$/.test(token)){
        openLead(token);
    }
}

async function openLead(token){

    try{

        showResult(
            "<p>Загрузка заявки...</p>"
        );

        const lead=
            await loadLead(token);

        const statusMap={
            new:"Новая",
            in_progress:"В работе",
            completed:"Завершена",
            cancelled:"Отменена"
        };

        const status=
            statusMap[lead.status] ||
            lead.status ||
            "Новая";

        const client=lead.client || {};
        const project=lead.project || {};
        const packageData=lead.package || {};

        const extras=
            Array.isArray(lead.extras)
            ? lead.extras
            : [];

        const history=
            Array.isArray(lead.history)
            ? lead.history
            : [];

        const createdAt=
            lead.createdAt
            ? new Date(
                lead.createdAt
              ).toLocaleString("ru-RU")
            : "—";

        showResult(`

            <div style="
                border:1px solid #303640;
                border-radius:12px;
                padding:18px;
                background:#0b0e12;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                    flex-wrap:wrap;
                ">

                    <div>
                        <small style="color:#777f89">
                            НОМЕР ЗАЯВКИ
                        </small>

                        <h3 style="
                            margin:4px 0 0;
                            color:#d7b56d;
                        ">
                            ${escapeHtml(lead.number)}
                        </h3>
                    </div>

                    <strong>
                        ${escapeHtml(status)}
                    </strong>

                </div>

                <hr>

                <p>
                    <strong>Дата:</strong><br>
                    ${escapeHtml(createdAt)}
                </p>

                <h3>Клиент</h3>

                <p>
                    <strong>Имя:</strong>
                    ${escapeHtml(client.name || "—")}
                </p>

                <p>
                    <strong>Телефон:</strong>
                    ${escapeHtml(client.phone || "—")}
                </p>

                ${
                    client.email
                    ? `<p>
                        <strong>Email:</strong>
                        ${escapeHtml(client.email)}
                    </p>`
                    : ""
                }

                ${
                    client.company
                    ? `<p>
                        <strong>Компания:</strong>
                        ${escapeHtml(client.company)}
                    </p>`
                    : ""
                }

                <h3>Проект</h3>

                <p>
                    <strong>Направление:</strong><br>
                    ${escapeHtml(project.name || "—")}
                </p>

                ${
                    project.region
                    ? `<p>
                        <strong>Регион:</strong>
                        ${escapeHtml(project.region)}
                    </p>`
                    : ""
                }

                <h3>Услуги</h3>

                <p>
                    <strong>Пакет:</strong><br>
                    ${escapeHtml(packageData.name || "—")}
                </p>

                <p>
                    <strong>Стоимость:</strong><br>
                    ${escapeHtml(packageData.price || "—")}
                </p>

                ${
                    extras.length
                    ? `
                        <p><strong>
                            Дополнительные услуги:
                        </strong></p>

                        <ul>
                            ${extras.map(extra=>`
                                <li>
                                    ${escapeHtml(
                                        typeof extra==="string"
                                        ? extra
                                        : extra.name ||
                                          extra.title ||
                                          "Дополнительная услуга"
                                    )}
                                </li>
                            `).join("")}
                        </ul>
                    `
                    : ""
                }

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
                    lead.message
                    ? `
                        <h3>Описание</h3>
                        <p>
                            ${escapeHtml(lead.message)}
                        </p>
                    `
                    : ""
                }

                <h3>История заявки</h3>

                ${
                    history.length
                    ? history.map(item=>`
                        <div style="
                            padding:10px 0;
                            border-bottom:1px solid #252b33;
                        ">
                            <strong>
                                ${escapeHtml(
                                    statusMap[item.status] ||
                                    item.status ||
                                    ""
                                )}
                            </strong>

                            ${
                                item.date
                                ? `<br>
                                   <small>
                                    ${escapeHtml(
                                        new Date(
                                            item.date
                                        ).toLocaleString(
                                            "ru-RU"
                                        )
                                    )}
                                   </small>`
                                : ""
                            }

                            ${
                                item.comment
                                ? `<br>
                                   ${escapeHtml(
                                       item.comment
                                   )}`
                                : ""
                            }
                        </div>
                    `).join("")
                    : "<p>История пока пуста.</p>"
                }

                <button
                    id="downloadLeadPdf"
                    type="button"
                    style="
                        width:100%;
                        margin-top:20px;
                        padding:14px;
                        background:#d7b56d;
                        color:#111;
                        border:0;
                        border-radius:9px;
                        font-weight:800;
                        cursor:pointer;
                    "
                >
                    Скачать выписку PDF
                </button>

            </div>
        `);

        document
            .getElementById("downloadLeadPdf")
            .addEventListener(
                "click",
                ()=>{
                    window.open(
                        "/api/my-lead/pdf?token="+
                        encodeURIComponent(token),
                        "_blank"
                    );
                }
            );

    }catch(error){

        showResult(`
            <div style="
                padding:14px;
                color:#ff9b9b;
                border:1px solid #663535;
                border-radius:9px;
            ">
                ❌ ${escapeHtml(error.message)}
            </div>
        `);
    }
}

document.addEventListener(
    "DOMContentLoaded",
    ()=>{
        const button=
            document.getElementById(
                "myLeadsButton"
            );

        if(button){
            button.addEventListener(
                "click",
                showPanel
            );
        }
    }
);

})();
