require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;


// ==================================================
// НАЛАШТУВАННЯ EXPRESS
// ==================================================

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,OPTIONS"
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json({ limit: "1mb" }));


// ==================================================
// ГОЛОВНА СТОРІНКА
// ==================================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "index.html")
    );
});


// ==================================================
// БАЗА ЗАЯВОК
// ==================================================

const DB_FILE = path.join(
    __dirname,
    "applications.json"
);

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
        DB_FILE,
        "[]",
        "utf8"
    );
}


function getApplications() {
    try {
        const content = fs.readFileSync(
            DB_FILE,
            "utf8"
        );

        return JSON.parse(content);

    } catch (error) {

        console.error(
            "Помилка читання applications.json:",
            error
        );

        return [];
    }
}


function saveApplications(applications) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
            applications,
            null,
            2
        ),
        "utf8"
    );
}


// ==================================================
// TELEGRAM
// ==================================================

async function sendTelegram(method, data) {

    if (!BOT_TOKEN) {
        throw new Error(
            "BOT_TOKEN не налаштований."
        );
    }

    const url =
        "https://api.telegram.org/bot" +
        BOT_TOKEN +
        "/" +
        method;

    const response = await fetch(
        url,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        }
    );

    return await response.json();
}


// ==================================================
// ГЕНЕРАЦІЯ НОМЕРА
// ==================================================

function generateApplicationId() {

    const applications = getApplications();

    let id;

    do {

        id =
            "FIB-" +
            Math.floor(
                10000 +
                Math.random() * 90000
            );

    } while (
        applications.some(
            application =>
                application.id === id
        )
    );

    return id;
}


// ==================================================
// ДОПОМІЖНА ФУНКЦІЯ
// ==================================================

function value(data, field) {

    if (
        data[field] === undefined ||
        data[field] === null
    ) {
        return "";
    }

    return String(data[field]).trim();
}


// ==================================================
// НОВА ЗАЯВКА
// ==================================================

app.post(
    "/api/applications",
    async (req, res) => {

        try {

            const data = req.body || {};

            const type =
                value(data, "type");


            // ==================================================
            // ПЕРЕВІРКА TELEGRAM
            // ==================================================

            if (!BOT_TOKEN || !ADMIN_ID) {

                console.error(
                    "BOT_TOKEN або ADMIN_ID не налаштовані."
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Telegram не налаштований на сервері."
                });
            }


            // ==================================================
            // ВИЗНАЧАЄМО ТИП ЗАЯВКИ
            // ==================================================

            const isEmployee =
                type === "Співробітник ФІБ";

            const isCivilian =
                type === "Цивільний кандидат";


            if (!isEmployee && !isCivilian) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Невідомий тип заявки."
                });
            }


            // ==================================================
            // ЗАГАЛЬНІ ПОЛЯ
            // ==================================================

            const name =
                value(data, "name");

            const age =
                value(data, "age");


            if (!name || !age) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Заповніть ім'я та вік."
                });
            }


            // ==================================================
            // СТВОРЕННЯ НОМЕРА
            // ==================================================

            const applications =
                getApplications();

            const id =
                generateApplicationId();


            // ==================================================
            // ЗБЕРІГАЄМО СПІВРОБІТНИКА
            // ==================================================

            if (isEmployee) {

                const application = {

                    id,

                    type,

                    name,

                    age,

                    phone:
                        value(data, "phone"),

                    contact:
                        value(data, "contact"),

                    timezone:
                        value(data, "timezone"),

                    license:
                        value(data, "license"),

                    targetUnit:
                        value(data, "targetUnit"),

                    why:
                        value(data, "why"),

                    experience:
                        value(data, "experience"),

                    fibTime:
                        value(data, "fibTime"),

                    management:
                        value(data, "management"),

                    law:
                        value(data, "law"),

                    statute:
                        value(data, "statute"),

                    workTime:
                        value(data, "workTime"),

                    training:
                        value(data, "training"),

                    discipline:
                        value(data, "discipline"),

                    additional:
                        value(data, "additional"),

                    goals:
                        value(data, "goals"),

                    knowledgeCheck:
                        value(data, "knowledgeCheck"),

                    personnel:
                        value(data, "personnel"),

                    status:
                        "Очікує розгляду",

                    answer:
                        "",

                    createdAt:
                        new Date().toISOString()
                };


                // ==================================================
                // ПЕРЕВІРКА ОБОВ'ЯЗКОВИХ ПОЛІВ
                // ==================================================

                const requiredFields = [

                    ["Номер телефону", application.phone],
                    ["Discord / Telegram", application.contact],
                    ["Часовий пояс", application.timezone],
                    ["Водійське посвідчення", application.license],
                    ["Бажаний підрозділ", application.targetUnit],
                    ["Чому підходите", application.why],
                    ["Досвід роботи", application.experience],
                    ["Час роботи у FIB", application.fibTime],
                    ["Досвід керування підрозділом", application.management],
                    ["Знання законодавства", application.law],
                    ["Знання статуту FIB", application.statute],
                    ["Час роботи", application.workTime],
                    ["Готовність до навчання", application.training],
                    ["Дисциплінарні стягнення", application.discipline],
                    ["Цілі", application.goals],
                    ["Перевірка знань", application.knowledgeCheck],
                    ["Досвід керування особовим складом", application.personnel]

                ];


                for (
                    const [fieldName, fieldValue]
                    of requiredFields
                ) {

                    if (!fieldValue) {

                        return res.status(400).json({
                            success: false,
                            message:
                                "Заповніть поле: " +
                                fieldName
                        });
                    }
                }


                applications.push(
                    application
                );


                saveApplications(
                    applications
                );


                // ==================================================
                // TELEGRAM — СПІВРОБІТНИК
                // ==================================================

                let message = "";

                message +=
                    "🆕 НОВА ЗАЯВКА\n\n";

                message +=
                    "📌 Номер: " +
                    id +
                    "\n\n";

                message +=
                    "👤 Тип: Співробітник ФІБ\n";

                message +=
                    "👤 Ім'я та прізвище: " +
                    application.name +
                    "\n";

                message +=
                    "🎂 Вік: " +
                    application.age +
                    "\n";

                message +=
                    "📞 Номер телефону: " +
                    application.phone +
                    "\n";

                message +=
                    "💬 Discord / Telegram: " +
                    application.contact +
                    "\n";

                message +=
                    "🌐 Часовий пояс: " +
                    application.timezone +
                    "\n";

                message +=
                    "🚗 Водійське посвідчення: " +
                    application.license +
                    "\n";

                message +=
                    "🏢 Бажаний підрозділ: " +
                    application.targetUnit +
                    "\n";

                message +=
                    "\n1️⃣ Чому саме ви підходите на цю посаду?\n" +
                    application.why +
                    "\n";

                message +=
                    "\n2️⃣ Досвід роботи в організаціях:\n" +
                    application.experience +
                    "\n";

                message +=
                    "\n3️⃣ Скільки часу працюєте у FIB?\n" +
                    application.fibTime +
                    "\n";

                message +=
                    "\n4️⃣ Досвід керування підрозділом:\n" +
                    application.management +
                    "\n";

                message +=
                    "\n5️⃣ Знання законодавства штату:\n" +
                    application.law +
                    "\n";

                message +=
                    "\n6️⃣ Знання внутрішнього статуту FIB:\n" +
                    application.statute +
                    "\n";

                message +=
                    "\n7️⃣ Скільки часу можете приділяти роботі?\n" +
                    application.workTime +
                    "\n";

                message +=
                    "\n8️⃣ Чи готові проходити навчання?\n" +
                    application.training +
                    "\n";

                message +=
                    "\n9️⃣ Чи були дисциплінарні стягнення / догани?\n" +
                    application.discipline +
                    "\n";

                message +=
                    "\n🔟 Додаткова інформація:\n" +
                    (
                        application.additional ||
                        "Не вказано"
                    ) +
                    "\n";

                message +=
                    "\n1️⃣1️⃣ Які ваші цілі на новій посаді?\n" +
                    application.goals +
                    "\n";

                message +=
                    "\n1️⃣2️⃣ Чи готові виконувати обов'язки та проходити перевірку знань?\n" +
                    application.knowledgeCheck +
                    "\n";

                message +=
                    "\n1️⃣3️⃣ Чи маєте досвід керування особовим складом?\n" +
                    application.personnel +
                    "\n";

                message +=
                    "\n━━━━━━━━━━━━━━\n";

                message +=
                    "Відповідь:\n";

                message +=
                    "/answer " +
                    id +
                    " Ваша відповідь";


                const telegramResult =
                    await sendTelegram(
                        "sendMessage",
                        {
                            chat_id: ADMIN_ID,
                            text: message
                        }
                    );


                console.log(
                    "Telegram result:",
                    telegramResult
                );


                if (!telegramResult.ok) {

                    console.error(
                        "Telegram error:",
                        telegramResult
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Заявку збережено, але Telegram не прийняв повідомлення."
                    });
                }


                return res.json({
                    success: true,
                    id
                });
            }


            // ==================================================
            // ЗБЕРІГАЄМО ЦИВІЛЬНОГО
            // ==================================================

            if (isCivilian) {

                const application = {

                    id,

                    type,

                    name,

                    age,

                    unit:
                        value(data, "unit"),

                    telegram:
                        value(data, "telegram"),

                    discord:
                        value(data, "discord"),

                    driving:
                        value(data, "driving"),

                    lawExperience:
                        value(data, "lawExperience"),

                    availableTime:
                        value(data, "availableTime"),

                    experience:
                        value(data, "experience"),

                    skills:
                        value(data, "skills"),

                    strengths:
                        value(data, "strengths"),

                    motivation:
                        value(data, "motivation"),

                    status:
                        "Очікує розгляду",

                    answer:
                        "",

                    createdAt:
                        new Date().toISOString()
                };


                // ==================================================
                // ПЕРЕВІРКА ОБОВ'ЯЗКОВИХ ПОЛІВ
                // ==================================================

                const requiredFields = [

                    ["Бажаний підрозділ", application.unit],
                    ["Telegram", application.telegram],
                    ["Discord", application.discord],
                    ["Водійське посвідчення", application.driving],
                    [
                        "Досвід роботи в державних / правоохоронних структурах",
                        application.lawExperience
                    ],
                    [
                        "Час, який готові приділяти FIB",
                        application.availableTime
                    ],
                    [
                        "Сильні сторони",
                        application.strengths
                    ],
                    [
                        "Мотивація",
                        application.motivation
                    ]

                ];


                for (
                    const [fieldName, fieldValue]
                    of requiredFields
                ) {

                    if (!fieldValue) {

                        return res.status(400).json({
                            success: false,
                            message:
                                "Заповніть поле: " +
                                fieldName
                        });
                    }
                }


                applications.push(
                    application
                );


                saveApplications(
                    applications
                );


                // ==================================================
                // TELEGRAM — ЦИВІЛЬНИЙ КАНДИДАТ
                // ==================================================

                let message = "";

                message +=
                    "🆕 НОВА ЗАЯВКА\n\n";

                message +=
                    "📌 Номер: " +
                    id +
                    "\n\n";

                message +=
                    "👤 Тип: Цивільний кандидат\n";

                message +=
                    "👤 Ім'я та прізвище: " +
                    application.name +
                    "\n";

                message +=
                    "🎂 Вік: " +
                    application.age +
                    "\n";

                message +=
                    "🏢 Бажаний підрозділ: " +
                    application.unit +
                    "\n";

                message +=
                    "💬 Telegram: " +
                    application.telegram +
                    "\n";

                message +=
                    "🎮 Discord: " +
                    application.discord +
                    "\n";

                message +=
                    "🚗 Водійське посвідчення: " +
                    application.driving +
                    "\n";

                message +=
                    "⚖️ Досвід роботи в державних / правоохоронних структурах: " +
                    application.lawExperience +
                    "\n";

                message +=
                    "⏱ Час, який готові приділяти FIB: " +
                    application.availableTime +
                    "\n";

                message +=
                    "\n📋 9. Попередній досвід:\n" +
                    (
                        application.experience ||
                        "Не вказано"
                    ) +
                    "\n";

                message +=
                    "\n🛠 10. Навички:\n" +
                    (
                        application.skills ||
                        "Не вказано"
                    ) +
                    "\n";

                message +=
                    "\n💪 11. Ваші сильні сторони:\n" +
                    application.strengths +
                    "\n";

                message +=
                    "\n📝 12. Чому ви хочете вступити?\n" +
                    application.motivation +
                    "\n";

                message +=
                    "\n━━━━━━━━━━━━━━\n";

                message +=
                    "Відповідь:\n";

                message +=
                    "/answer " +
                    id +
                    " Ваша відповідь";


                const telegramResult =
                    await sendTelegram(
                        "sendMessage",
                        {
                            chat_id: ADMIN_ID,
                            text: message
                        }
                    );


                console.log(
                    "Telegram result:",
                    telegramResult
                );


                if (!telegramResult.ok) {

                    console.error(
                        "Telegram error:",
                        telegramResult
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Заявку збережено, але Telegram не прийняв повідомлення."
                    });
                }


                return res.json({
                    success: true,
                    id
                });
            }

        } catch (error) {

            console.error(
                "Application error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Помилка сервера."
            });
        }
    }
);


// ==================================================
// ПЕРЕВІРКА ЗАЯВКИ
// ==================================================

app.get(
    "/api/applications/:id",
    (req, res) => {

        try {

            const applications =
                getApplications();

            const id =
                req.params.id
                    .trim()
                    .toUpperCase();


            const application =
                applications.find(
                    item =>
                        String(item.id)
                            .toUpperCase() === id
                );


            if (!application) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Заявку не знайдено."
                });
            }


            return res.json({

                success: true,

                id:
                    application.id,

                status:
                    application.status,

                answer:
                    application.answer || ""
            });


        } catch (error) {

            console.error(
                "Check application error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Помилка сервера."
            });
        }
    }
);


// ==================================================
// TELEGRAM WEBHOOK
// ==================================================

app.post(
    "/telegram/webhook",
    async (req, res) => {

        try {

            const message =
                req.body &&
                req.body.message;


            if (
                !message ||
                !message.text
            ) {
                return res.sendStatus(200);
            }


            // ==================================================
            // ТІЛЬКИ ADMIN_ID
            // ==================================================

            if (
                String(message.chat.id) !==
                String(ADMIN_ID)
            ) {
                return res.sendStatus(200);
            }


            const text =
                message.text.trim();


            if (
                !text.toLowerCase()
                    .startsWith("/answer ")
            ) {
                return res.sendStatus(200);
            }


            const parts =
                text.split(/\s+/);


            const id =
                parts[1];


            const answer =
                parts
                    .slice(2)
                    .join(" ")
                    .trim();


            if (!id || !answer) {

                await sendTelegram(
                    "sendMessage",
                    {
                        chat_id: ADMIN_ID,

                        text:
                            "❌ Неправильний формат.\n\n" +
                            "Використовуйте:\n" +
                            "/answer FIB-12345 Ваша відповідь"
                    }
                );

                return res.sendStatus(200);
            }


            const applications =
                getApplications();


            const application =
                applications.find(
                    item =>
                        String(item.id)
                            .toUpperCase() ===
                        String(id)
                            .toUpperCase()
                );


            if (!application) {

                await sendTelegram(
                    "sendMessage",
                    {
                        chat_id: ADMIN_ID,

                        text:
                            "❌ Заявку " +
                            id +
                            " не знайдено."
                    }
                );

                return res.sendStatus(200);
            }


            // ==================================================
            // ЗБЕРІГАЄМО ВІДПОВІДЬ
            // ==================================================

            application.answer =
                answer;

            application.status =
                "Відповідь надана";

            application.answeredAt =
                new Date().toISOString();


            saveApplications(
                applications
            );


            // ==================================================
            // ПІДТВЕРДЖЕННЯ В TELEGRAM
            // ==================================================

            await sendTelegram(
                "sendMessage",
                {
                    chat_id: ADMIN_ID,

                    text:
                        "✅ Відповідь для " +
                        application.id +
                        " збережена.\n\n" +
                        "Статус: Відповідь надана"
                }
            );


            return res.sendStatus(200);


        } catch (error) {

            console.error(
                "Webhook error:",
                error
            );

            return res.sendStatus(500);
        }
    }
);


// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({
            success: true,
            status: "online"
        });
    }
);


// ==================================================
// ЗАПУСК
// ==================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================="
        );

        console.log(
            "FIB Portal running on port " +
            PORT
        );

        console.log(
            "Telegram: " +
            (
                BOT_TOKEN
                    ? "налаштований"
                    : "НЕ НАЛАШТОВАНИЙ"
            )
        );

        console.log(
            "Admin ID: " +
            (
                ADMIN_ID
                    ? ADMIN_ID
                    : "НЕ НАЛАШТОВАНИЙ"
            )
        );

        console.log(
            "================================="
        );
    }
);