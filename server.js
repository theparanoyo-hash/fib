```js
require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

app.use(express.json());


// =========================
// ГОЛОВНА СТОРІНКА
// =========================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// =========================
// БАЗА ЗАЯВОК
// =========================

const DB_FILE = path.join(__dirname, "applications.json");

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, "[]", "utf8");
}

function getApplications() {
    return JSON.parse(
        fs.readFileSync(DB_FILE, "utf8")
    );
}

function saveApplications(applications) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(applications, null, 2),
        "utf8"
    );
}


// =========================
// TELEGRAM
// =========================

async function sendTelegram(method, data) {
    const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }
);

    return response.json();
}


// =========================
// НОМЕР ЗАЯВКИ
// =========================

function generateApplicationId() {
    return "FIB-" + Math.floor(
        10000 + Math.random() * 90000
    );
}


// =========================
// НОВА ЗАЯВКА
// =========================

app.post("/api/applications", async (req, res) => {

    try {

        const data = req.body;

        if (!data.name || !data.motivation) {
            return res.status(400).json({
                success: false,
                message: "Заповніть обов'язкові поля."
            });
        }

        if (!BOT_TOKEN || !ADMIN_ID) {
            console.error("BOT_TOKEN або ADMIN_ID не налаштовані.");

            return res.status(500).json({
                success: false,
                message: "Telegram не налаштований на сервері."
            });
        }

        const applications = getApplications();

        const id = generateApplicationId();

        const application = {
            id: id,
            type: data.type || "",
            name: data.name || "",
            age: data.age || "",
            callsign: data.callsign || "",
            position: data.position || "",
            currentUnit: data.currentUnit || "",
            targetUnit: data.targetUnit || "",
            unit: data.unit || "",
            education: data.education || "",
            experience: data.experience || "",
            skills: data.skills || "",
            motivation: data.motivation || "",
            status: "Очікує розгляду",
            answer: "",
            createdAt: new Date().toISOString()
        };

        applications.push(application);

        saveApplications(applications);


        // =========================
        // ФОРМУЄМО TELEGRAM
        // =========================

        let message = "";

        message += "🆕 НОВА ЗАЯВКА\n\n";

        message += `📌 Номер: ${id}\n\n`;

        message += `👤 Тип: ${application.type || "Не вказано"}\n`;
        message += `👤 Ім'я: ${application.name}\n`;

        if (application.age) {
            message += `🎂 Вік: ${application.age}\n`;
        }

        if (application.callsign) {
            message += `🎖 Позивний: ${application.callsign}\n`;
        }

        if (application.position) {
            message += `💼 Посада: ${application.position}\n`;
        }

        if (application.currentUnit) {
            message += `🏢 Поточний підрозділ: ${application.currentUnit}\n`;
        }

        if (application.targetUnit) {
            message += `🎯 Бажаний підрозділ: ${application.targetUnit}\n`;
        }

        if (application.unit) {
            message += `🏢 Підрозділ: ${application.unit}\n`;
        }

        if (application.education) {
            message += `🎓 Освіта: ${application.education}\n`;
        }

        if (application.experience) {
            message += `\n📋 Досвід:\n${application.experience}\n`;
        }

        if (application.skills) {
            message += `\n🛠 Навички:\n${application.skills}\n`;
        }

        message += `\n📝 Мотиваційний лист:\n${application.motivation}\n`;

        message += "\n━━━━━━━━━━━━━━\n";

        message += `Відповідь:\n`;
        message += `/answer ${id} Ваша відповідь`;


        // =========================
        // ВІДПРАВКА В TELEGRAM
        // =========================

        const telegramResult = await sendTelegram(
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
                message: "Telegram не прийняв заявку."
            });
        }


        // =========================
        // ВІДПОВІДЬ САЙТУ
        // =========================

        res.json({
            success: true,
            id: id
        });

    } catch (error) {

        console.error(
            "Application error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Помилка сервера."
        });

    }

});


// =========================
// ПЕРЕВІРКА ЗАЯВКИ
// =========================

app.get("/api/applications/:id", (req, res) => {

    try {

        const applications = getApplications();

        const id =
            req.params.id.toUpperCase();

        const application =
            applications.find(
                item =>
                    item.id.toUpperCase() === id
            );

        if (!application) {

            return res.status(404).json({
                success: false,
                message: "Заявку не знайдено."
            });

        }

        res.json({

            success: true,

            id: application.id,

            status: application.status,

            answer: application.answer

        });

    } catch (error) {

        console.error(
            "Check application error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Помилка сервера."

        });

    }

});


// =========================
// TELEGRAM WEBHOOK
// =========================

app.post("/telegram/webhook", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message || !message.text) {
            return res.sendStatus(200);
        }

        if (
            String(message.chat.id) !==
            String(ADMIN_ID)
        ) {
            return res.sendStatus(200);
        }

        const text =
            message.text.trim();

        if (!text.startsWith("/answer ")) {
            return res.sendStatus(200);
        }

        const parts =
            text.split(" ");

        const id =
            parts[1];

        const answer =
            parts.slice(2).join(" ");

        if (!id || !answer) {

            await sendTelegram(
                "sendMessage",
                {
                    chat_id: ADMIN_ID,
                    text:
                        "Формат:\n\n" +
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
                    item.id.toUpperCase() ===
                    id.toUpperCase()
            );

        if (!application) {

            await sendTelegram(
                "sendMessage",
                {
                    chat_id: ADMIN_ID,
                    text:
                        `❌ Заявку ${id} не знайдено.`
                }
            );

            return res.sendStatus(200);
        }

        application.answer =
            answer;

        application.status =
            "Відповідь надана";

        saveApplications(applications);

        await sendTelegram(
            "sendMessage",
            {
                chat_id: ADMIN_ID,
                text:
                    `✅ Відповідь для ${application.id} збережена.`
            }
        );

        res.sendStatus(200);

    } catch (error) {

        console.error(
            "Webhook error:",
            error
        );

        res.sendStatus(500);
    }

});


// =========================
// ЗАПУСК СЕРВЕРА
// =========================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `FIB Portal running on port ${PORT}`
        );

    }
);
```
