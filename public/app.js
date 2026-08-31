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

function money(value){
    return new Intl.NumberFormat("uk-UA").format(value) + " грн";
}

function escapeHtml(value){
    return String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function renderPackages(){

    $("packageGrid").innerHTML = packages.map(item => `
        <article class="package-card">

            <div class="package-number">
                ${String(item.id).padStart(2,"0")}
            </div>

            <h3>${escapeHtml(item.name)}</h3>

            <p>${escapeHtml(item.description)}</p>

            <div class="package-price">
                ${item.id >= 8 ? "от " : ""}
                ${money(item.price)}
            </div>

            <button
                type="button"
                class="btn secondary package-button"
                data-id="${item.id}">
                Выбрать
            </button>

        </article>
    `).join("");

    document.querySelectorAll(".package-button").forEach(button=>{
        button.addEventListener("click",()=>{
            selectPackage(Number(button.dataset.id));
        });
    });
}

function renderSelect(){

    $("packageSelect").innerHTML = packages.map(item => `
        <option value="${item.id}">
            ${item.name} — ${item.id >= 8 ? "от " : ""}${money(item.price)}
        </option>
    `).join("");

    $("packageSelect").value = selectedPackage.id;
}

function renderExtras(){

    $("extras").innerHTML = extras.map((item,index)=>`
        <label class="extra-item">
            <input
                type="checkbox"
                class="extra-checkbox"
                data-index="${index}">
            <span>${escapeHtml(item.name)} — ${money(item.price)}</span>
        </label>
    `).join("");

    document.querySelectorAll(".extra-checkbox").forEach(box=>{
        box.addEventListener("change",calculateTotal);
    });
}

function selectPackage(id){

    selectedPackage = packages.find(item=>item.id===id);

    if(!selectedPackage)return;

    $("packageSelect").value=id;

    calculateTotal();

    $("calculator").scrollIntoView({
        behavior:"smooth"
    });
}

function calculateTotal(){

    selectedPackage = packages.find(
        item=>item.id===Number($("packageSelect").value)
    );

    if(!selectedPackage)return;

    $("packageInfo").textContent =
        selectedPackage.description;

    let total=selectedPackage.price;

    document.querySelectorAll(
        ".extra-checkbox:checked"
    ).forEach(box=>{
        total += extras[Number(box.dataset.index)].price;
    });

    $("total").textContent =
        `${selectedPackage.id>=8 ? "от " : ""}${money(total)}`;
}

async function submitLead(event){

    event.preventDefault();

    const form=event.target;
    const status=$("formStatus");

    status.innerHTML =
        '<div>Отправляем заявку...</div>';

    const selectedExtras=[];

    document.querySelectorAll(
        ".extra-checkbox:checked"
    ).forEach(box=>{
        selectedExtras.push(
            extras[Number(box.dataset.index)].name
        );
    });

    const formData=new FormData(form);

    const data={
        name:formData.get("name"),
        phone:formData.get("phone"),
        email:formData.get("email"),
        company:formData.get("company"),
        project:formData.get("project"),
        region:formData.get("region"),
        budget:formData.get("budget"),
        message:formData.get("message") || "",
        packageName:selectedPackage.name,
        packagePrice:$("total").textContent,
        extras:selectedExtras
    };

    try{

        const response=await fetch("/api/lead",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify(data)
        });

        const result=await response.json();

        if(!response.ok || !result.ok){
            throw new Error(
                result.message || "Ошибка сервера"
            );
        }

        if(result.lead?.accessToken){
            localStorage.setItem(
                "mmw_access_token",
                result.lead.accessToken
            );
        }

        status.innerHTML=`
            <div class="success">

                <h3>Заявка отправлена</h3>

                <p>
                    <strong>Номер заявки:</strong><br>
                    ${escapeHtml(result.lead?.number || "—")}
                </p>

                <p>
                    <strong>Код доступа:</strong><br>
                    <span style="font-size:28px;color:#d7b56d">
                        ${escapeHtml(result.lead?.accessToken || "—")}
                    </span>
                </p>

                <p>
                    Сохраните этот 5-значный код.
                    С его помощью можно открыть заявку
                    в разделе «Мои заявки».
                </p>

                <button
                    id="openMyLeadAfterSubmit"
                    class="btn primary full"
                    type="button">
                    Открыть мою заявку
                </button>

            </div>
        `;

        const openButton=
            $("openMyLeadAfterSubmit");

        if(openButton){
            openButton.addEventListener(
                "click",
                ()=>{
                    const button=$("myLeadsButton");

                    if(button){
                        button.click();
                    }
                }
            );
        }

        form.reset();

        document.querySelectorAll(
            ".extra-checkbox"
        ).forEach(box=>{
            box.checked=false;
        });

        calculateTotal();

    }catch(error){

        console.error(error);

        status.innerHTML=`
            <div class="error">
                Ошибка отправки: ${escapeHtml(error.message)}
            </div>
        `;
    }
}

async function openTelegram(){

    try{

        const response=await fetch(
            "/api/telegram-link"
        );

        const data=await response.json();

        if(data.ok && data.url){
            window.open(
                data.url,
                "_blank",
                "noopener"
            );
            return;
        }

        window.open(
            "https://t.me/",
            "_blank",
            "noopener"
        );

    }catch(error){

        window.open(
            "https://t.me/",
            "_blank",
            "noopener"
        );
    }
}

document.addEventListener("DOMContentLoaded",()=>{

    renderPackages();
    renderSelect();
    renderExtras();
    calculateTotal();

    $("packageSelect").addEventListener(
        "change",
        calculateTotal
    );

    $("leadFormElement").addEventListener(
        "submit",
        submitLead
    );

    [
        "telegramButton",
        "telegramButtonBottom"
    ].forEach(id=>{
        const button=$(id);

        if(button){
            button.addEventListener(
                "click",
                openTelegram
            );
        }
    });

    const bottomMyLeads=
        $("myLeadsButtonBottom");

    if(bottomMyLeads){
        bottomMyLeads.addEventListener(
            "click",
            ()=>{
                const button=$("myLeadsButton");

                if(button){
                    button.click();
                }
            }
        );
    }

    console.log(
        "MMW-COMPANY technical frontend loaded"
    );
});
