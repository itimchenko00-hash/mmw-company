require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const https = require('https');
const { Resend } = require('resend');
const journal = require('./journal');

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

function sendTelegram(text) {
    return new Promise((resolve, reject) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!token || !chatId) {
            return reject(new Error('Telegram credentials are not configured'));
        }

        const body = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });

        const request = https.request({
            hostname: 'api.telegram.org',
            path: `/bot${token}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, response => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (!result.ok) {
                        return reject(
                            new Error(result.description || 'Telegram API error')
                        );
                    }

                    resolve(result);
                } catch {
                    reject(new Error('Invalid Telegram response'));
                }
            });
        });

        request.on('error', reject);

        request.write(body);
        request.end();
    });
}

function escapeHtml(value) {
    return String(value || 'не указано')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

app.get('/api/status', (req, res) => {
    res.json({
        ok: true,
        service: 'MMW-COMPANY',
        email: 'Resend API',
        telegram: Boolean(
            process.env.TELEGRAM_BOT_TOKEN &&
            process.env.TELEGRAM_CHAT_ID
        ),
        message: 'Server is running'
    });
});

app.post('/api/lead', async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            company,
            project,
            region,
            packageName,
            packagePrice,
            extras,
            budget,
            message
        } = req.body;

        if (!name || !phone || !packageName) {
            return res.status(400).json({
                ok: false,
                message: 'Заполните имя, телефон и выберите пакет.'
            });
        }

        const lead = journal.createLead({ name, phone, email, company, project, region, packageName, packagePrice, extras, budget, message });
        const extrasText = Array.isArray(extras)
            ? extras.join(', ')
            : (extras || 'Нет');

        const date = new Date().toLocaleString('uk-UA');

        const emailHtml = `
<!DOCTYPE html>
<html lang="ru">
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
<h2>Новая заявка MMW-COMPANY</h2>

<h3>Клиент</h3>
<p><b>Имя:</b> ${escapeHtml(name)}</p>
<p><b>Телефон:</b> ${escapeHtml(phone)}</p>
<p><b>Email:</b> ${escapeHtml(email)}</p>
<p><b>Компания:</b> ${escapeHtml(company)}</p>

<h3>Проект</h3>
<p><b>Направление:</b> ${escapeHtml(project)}</p>
<p><b>Регион:</b> ${escapeHtml(region)}</p>

<h3>Пакет</h3>
<p><b>${escapeHtml(packageName)}</b></p>
<p><b>Стоимость:</b> ${escapeHtml(packagePrice)}</p>

<h3>Дополнительные услуги</h3>
<p>${escapeHtml(extrasText)}</p>

<h3>Бюджет</h3>
<p>${escapeHtml(budget)}</p>

<h3>Описание</h3>
<p>${escapeHtml(message)}</p>

<hr>
<p><small>Дата: ${escapeHtml(date)}</small></p>
</body>
</html>
`;

        const telegramText = `
<b>🚀 НОВАЯ ЗАЯВКА MMW-COMPANY #${escapeHtml(lead.number)}</b>

<b>👤 Клиент</b>
Имя: ${escapeHtml(name)}
Телефон: ${escapeHtml(phone)}
Email: ${escapeHtml(email)}
Компания: ${escapeHtml(company)}

<b>💼 Проект</b>
Направление: ${escapeHtml(project)}
Регион: ${escapeHtml(region)}

<b>📦 Пакет</b>
${escapeHtml(packageName)}
Стоимость: ${escapeHtml(packagePrice)}

<b>➕ Дополнительные услуги</b>
${escapeHtml(extrasText)}

<b>💰 Бюджет</b>
${escapeHtml(budget)}

<b>📝 Описание</b>
${escapeHtml(message)}

<b>🕐 Дата</b>
${escapeHtml(date)}
`;

        // Отправляем email
        const emailResult = await resend.emails.send({
            from: 'MMW-COMPANY <onboarding@resend.dev>',
            to: [process.env.MAIL_TO],
            subject: `Новая заявка MMW-COMPANY — ${lead.number} — ${packageName}`,
            html: emailHtml
        });

        if (emailResult.error) {
            console.error('RESEND ERROR:', emailResult.error);

            return res.status(502).json({
                ok: false,
                message: 'Не удалось отправить email.'
            });
        }

        // Отправляем Telegram
        try {
            await sendTelegram(telegramText);
            console.log('TELEGRAM SENT');
        } catch (telegramError) {
            console.error('TELEGRAM ERROR:', telegramError.message);
        }

        console.log('EMAIL SENT:', emailResult.data);

        res.json({
            ok: true,
            message: 'Заявка успешно отправлена.',
            lead: {
                number: lead.number,
                accessToken: lead.accessToken,
                status: lead.status,
                createdAt: lead.createdAt
            }
        });

    } catch (error) {
        console.error('SERVER ERROR:', error);

        res.status(500).json({
            ok: false,
            message: 'Не удалось обработать заявку.'
        });
    }
});


app.get('/api/my-lead', (req, res) => {
    const token = String(req.query.token || '');

    if (!token || !/^\d{5}$/.test(token)) {
        return res.status(401).json({
            ok: false,
            message: 'Доступ запрещён.'
        });
    }

    const leads = journal.getLeads();
    const lead = leads.find(item => item.accessToken === token || item.number?.slice(-5) === token);

    if (!lead) {
        return res.status(404).json({
            ok: false,
            message: 'Заявка не найдена.'
        });
    }

    res.json({
        ok: true,
        lead: {
            number: lead.number,
            createdAt: lead.createdAt,
            status: lead.status,
            client: lead.client,
            project: lead.project,
            package: lead.package,
            extras: lead.extras,
            budget: lead.budget,
            message: lead.message,
            history: lead.history
        }
    });
});


app.get('/api/my-lead/pdf', (req, res) => {
    try {
        const token = String(req.query.token || '');

        if (!token || !/^\d{5}$/.test(token)) {
            return res.status(401).json({
                ok: false,
                message: 'Доступ запрещён.'
            });
        }

        const leads = journal.getLeads();
        const lead = leads.find(item => item.accessToken === token || item.number?.slice(-5) === token);

        if (!lead) {
            return res.status(404).json({
                ok: false,
                message: 'Заявка не найдена.'
            });
        }

        const client = lead.client || {};
        const project = lead.project || {};
        const packageData = lead.package || {};
        const extras = Array.isArray(lead.extras) ? lead.extras : [];
        const history = Array.isArray(lead.history) ? lead.history : [];

        const statusMap = {
            new: 'Новая',
            in_progress: 'В работе',
            completed: 'Завершена',
            cancelled: 'Отменена'
        };

        const statusText =
            statusMap[lead.status] || lead.status || 'Новая';

        const createdAt = lead.createdAt
            ? new Date(lead.createdAt).toLocaleString('ru-RU')
            : '—';

        const fontCandidates = [
            '/system/fonts/Roboto-Regular.ttf',
            '/system/fonts/Roboto-Medium.ttf'
        ];

        const fontPath = fontCandidates.find(file =>
            fs.existsSync(file)
        );

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: `Выписка по заявке ${lead.number}`,
                Author: 'MMW-COMPANY'
            }
        });

        res.setHeader(
            'Content-Type',
            'application/pdf'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="MMW-${lead.number}.pdf"`
        );

        doc.pipe(res);

        if (fontPath) {
            doc.font(fontPath);
        }

        doc.fontSize(22)
            .text('MMW-COMPANY', { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(18)
            .text('ВЫПИСКА ПО ЗАЯВКЕ', { align: 'center' });

        doc.moveDown();

        doc.fontSize(12)
            .text(`Номер заявки: ${lead.number}`);

        doc.text(`Дата оформления: ${createdAt}`);
        doc.text(`Статус: ${statusText}`);

        doc.moveDown();

        doc.fontSize(15).text('Клиент');
        doc.fontSize(11);
        doc.text(`Имя: ${client.name || '—'}`);
        doc.text(`Телефон: ${client.phone || '—'}`);

        if (client.email) {
            doc.text(`Email: ${client.email}`);
        }

        if (client.company) {
            doc.text(`Компания: ${client.company}`);
        }

        doc.moveDown();

        doc.fontSize(15).text('Проект');
        doc.fontSize(11);
        doc.text(`Направление: ${project.name || '—'}`);

        if (project.region) {
            doc.text(`Регион: ${project.region}`);
        }

        doc.moveDown();

        doc.fontSize(15).text('Услуги');
        doc.fontSize(11);
        doc.text(`Основной пакет: ${packageData.name || '—'}`);
        doc.text(`Стоимость пакета: ${packageData.price || '—'}`);

        doc.moveDown();

        doc.text('Дополнительные услуги:');

        if (extras.length) {
            extras.forEach(extra => {
                const name = typeof extra === 'string'
                    ? extra
                    : (
                        extra.name ||
                        extra.title ||
                        'Дополнительная услуга'
                    );

                doc.text(`• ${name}`, {
                    indent: 15
                });
            });
        } else {
            doc.text('Нет дополнительных услуг.');
        }

        if (lead.budget) {
            doc.moveDown();
            doc.text(`Бюджет: ${lead.budget}`);
        }

        if (lead.message) {
            doc.moveDown();
            doc.fontSize(15).text('Описание проекта');
            doc.fontSize(11).text(lead.message);
        }

        doc.moveDown();

        doc.fontSize(15).text('История заявки');
        doc.fontSize(11);

        if (history.length) {
            history.forEach(item => {
                const historyDate = item.date
                    ? new Date(item.date).toLocaleString('ru-RU')
                    : '';

                const historyStatus =
                    statusMap[item.status] ||
                    item.status ||
                    '';

                doc.moveDown(0.4);
                doc.text(
                    `${historyDate} — ${historyStatus}`
                );

                if (item.comment) {
                    doc.text(item.comment, {
                        indent: 15
                    });
                }
            });
        } else {
            doc.text('История пока пуста.');
        }

        doc.moveDown(2);

        doc.fontSize(9)
            .text(
                'Документ сформирован автоматически системой MMW-COMPANY.',
                { align: 'center' }
            );

        doc.end();

    } catch (error) {
        console.error('PDF ERROR:', error);

        if (!res.headersSent) {
            res.status(500).json({
                ok: false,
                message: 'Не удалось сформировать PDF.'
            });
        }
    }
});


app.listen(PORT, () => {
    console.log('');
    console.log('=================================');
    console.log(' MMW-COMPANY SERVER');
    console.log('=================================');
    console.log(`Server: http://localhost:${PORT}`);
    console.log('Mail: Resend API');
    console.log('Telegram: ENABLED');
    console.log('Status: ONLINE');
    console.log('=================================');
    console.log('');
});
