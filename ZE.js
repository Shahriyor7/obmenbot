const TeleBot = require('telebot')
var config = require('./ZE_config');
const mongoose = require('mongoose')
const requestify = require('requestify') 
mongoose.connect(config.mongodb);

const bot = new TeleBot({
    token: "Токен бота",
    polling: {
        interval: 75,
        timeout: 0,
        limit: 100,
        retryTimeout: 250,
    },
})

const User = mongoose.model('EX_users', {
    id: Number,
    username: String,
    name: String,
    username: String,
    ref_balance: Number,
    ref: Number,
    ref2: Number,
    ref3: Number,
    ref_profit: Number,
    reg_time: Number,
    info:
    {
        ref1earnings: Number,
        ref1count: Number,
        ref2earnings: Number,
        ref2count: Number,
        ref3earnings: Number,
        ref3count: Number,
    },
    walletQIWI: String,
    walletPayeer: String,
    state: Number,
    data: String,
    ban: Boolean,
})

const Ex = mongoose.model('EX_withdrawals', {
    creator_id: Number,
    creator_name: String,
    creator_username: String,
    id: Number,
    type: String,
    time: String,
    amount: Number,
    from: String,
    to: String,
    comms: Number
})

const Core = mongoose.model("core", { parameter: String, value: String })
async function getParam(parameter) { var val = (await Core.findOne({ parameter })).value; if (!isNaN(val)) val = Number(val); return val }
function setParam(parameter, value) { Core.findOneAndUpdate({ parameter }, { value }, { upsert: true }).then() }
async function incParam(parameter, value) { var val = (await Core.findOne({ parameter })).value; if (!isNaN(val)) val = Number(val); val += value; await Core.updateOne({ parameter }, { value: val }, { upsert: true }) }

const Config = mongoose.model("FM_configs", { parameter: String, value: Number, description: String })

console.log('\nWelcome!\n\nDeveloper: @inffix\n\nInitializing...\n\nLogs:')

function roundPlus(number) { if (isNaN(number)) return false; var m = Math.pow(10, 2); return Math.round(number * m) / m; }
function addBal(user_id, sum) { User.findOneAndUpdate({ id: user_id }, { $inc: { buy_balance: sum } }, {}).then((e) => { }) }
function setBal(user_id, sum) { User.findOneAndUpdate({ id: user_id }, { balance: sum }).then((e) => { }) }
async function getBal(user_id) { var u = await User.findOne({ id: user_id }); return u.balance }
async function getRoundedBal(user_id) { var u = await User.findOne({ id: user_id }); return roundPlus(u.balance) }
function isAdmin(user_id) { return ~config.admin_list.indexOf(user_id) }
function sendAdmins(text, params) { for (var i = 0; i < config.admin_list.length; i++) bot.sendMessage(config.admin_list[i], text, params) }
function sendAdminsPhoto(text, img, params) { if (!params) params = { caption: text }; else params.caption = text; for (var i = 0; i < config.admin_list.length; i++) bot.sendPhoto(config.admin_list[i], img, params) }
function setState(user_id, state) { User.findOneAndUpdate({ id: user_id }, { state: Number(state) }).then((e) => { }) }
async function getState(user_id) { var u = await User.findOne({ id: user_id }); if (u != null) return u.state; else return 0 }
function setData(user_id, data) { User.findOneAndUpdate({ id: user_id }, { data: String(data) }).then((e) => { }) }
async function getData(user_id) { var u = await User.findOne({ id: user_id }); return u.data }
async function getInfo(user_id) { var u = await User.findOne({ id: user_id }); return u.info }
async function getReferer(user_id, level) { var u = await User.findOne({ id: user_id }); var u2 = await User.findOne({ id: u.ref }); if (level == 1) return u2.id; else if (level == 2) return u2.ref }
async function getUser(user_id) { var u = await User.findOne({ id: user_id }); return u }
function startOfWeek(date) { var now = date ? new Date(date) : new Date(); now.setHours(0, 0, 0, 0); var monday = new Date(now); monday.setDate(monday.getDate() - monday.getDay() + 1); return monday; }

const RM_default = bot.keyboard([
    [bot.button('🔄 Обмен'), bot.button("📊 Комиссия")],
    [bot.button('💳 Реквизиты'), bot.button('💰 Резервы')],
    [bot.button('🤝 Партнёры'), bot.button('📂 История')],
    [bot.button("📌 Информация")],
], { resize: true })

const RM_backToMenu = bot.keyboard([
    [bot.button('◀️ Назад')],
], { resize: true })

const RM_admin = bot.inlineKeyboard([
    [bot.inlineButton("✉️ Рассылка", { callback: "admin_1" }), bot.inlineButton("🔎 Управление", { callback: "admin_8" })],
    [bot.inlineButton("▫️ Перевод на QIWI", { callback: "admin_pay" }), bot.inlineButton("▫️ Перевод на Payeer", { callback: "admin_pay2" }),],
    [bot.inlineButton("🔄 Перезапуск", { callback: "admin_reboot" }), bot.inlineButton("🔽 Последние 5 переводов", { callback: "admin_pay3" })],
])

const RM_admin_return = bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "admin_return" })],])

const RM_mm1 = bot.inlineKeyboard([[bot.inlineButton("⏹ Стоп", { callback: "admin_mm_stop" }), bot.inlineButton("⏸ Пауза", { callback: "admin_mm_pause" })],
[bot.inlineButton("-5 смс/с", { callback: "admin_mm_-5" }), bot.inlineButton("+5 смс/с", { callback: "admin_mm_+5" })]])
const RM_mm2 = bot.inlineKeyboard([[bot.inlineButton("⏹ Стоп", { callback: "admin_mm_stop" }), bot.inlineButton("▶️ Продолжить", { callback: "admin_mm_play" })],])
const RM_back = bot.keyboard([[bot.button('◀️ Назад')]], { resize: true });

async function initConfig() {
    var cfg = await Config.find()
    cfg.map((o) => { config[o.parameter] = o.value; console.log(`Parameter ${o.parameter} setted to ${o.value}`) })
}
initConfig()

bot.on('text', async function (msg) {
    if (msg.from != undefined) {
        if (msg.from.id == msg.chat.id) {
            let dt = new Date
            console.log("[" + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + "] Пользователь " + msg.from.id + " отправил: " + msg.text)
            var uid = msg.from.id
            var text = msg.text
            var u = await getUser(uid)
            if (u != null)
                if (u.ban)
                    return 0
            if (text.indexOf("/start") == 0 || u == null || ~text.indexOf("◀️")) {
                if (!u) {
                    var ref = 0
                    var ref2 = 0
                    var ref3 = 0
                    if (text.split("/start")[1] && text.split("/start")[1].length > 2) {
                        ref = Number(text.split("/start ")[1])
                        if (!isNaN(ref) && ref != uid) {
                            var referer = await User.findOne({ id: ref })
                            await referer.updateOne({ $inc: { "info.ref1count": 1 } })
                            bot.sendMessage(referer.id, '👤 У Вас новый <a href="tg://user?id=' + uid + '">реферал</a> на <b>1 уровне</b>!', { parseMode: html })

                            if (referer.ref != 0) {
                                ref2 = referer.ref
                                bot.sendMessage(ref2, '👤 У Вас новый <a href="tg://user?id=' + uid + '">реферал</a> на <b>2 уровне</b>!', { parseMode: html })
                                await User.updateOne({ id: ref2 }, { $inc: { "info.ref2count": 1 } })
                            }
                            if (referer.ref2 != 0) {
                                ref3 = referer.ref2
                                bot.sendMessage(ref3, '👤 У Вас новый <a href="tg://user?id=' + uid + '">реферал</a> на <b>3 уровне</b>!', { parseMode: html })
                                await User.updateOne({ id: ref3 }, { $inc: { "info.ref3count": 1 } })
                            }
                        }

                    }
                    u = new User({
                        id: uid,
                        username: msg.from.username,
                        name: msg.from.first_name,
                        ref_balance: 0,
                        ref,
                        ref2,
                        ref3,
                        reg_time: Date.now(),
                        info:
                        {
                            ref1earnings: 0,
                            ref1count: 0,
                            ref2earnings: 0,
                            ref2count: 0,
                            ref3earnings: 0,
                            ref3count: 0,
                        },
                        state: 0,
                        data: "",
                        ban: false,
                        walletQIWI: "",
                        walletPayeer: "",
                    })
                    await u.save()
                } else setState(uid, 0)

                if (text != "/start" && text.split("/start ")[1].startsWith("EX")) {
                    var id = Number(text.split("/start EX")[1])
                    var ex = await Ex.findOne({ id })
                    if (!isAdmin(uid))
                        bot.sendMessage(uid, `
🆔 <b>Идентификатор обмена:</b> ${ex.id}
👤 <b>Пользователь:</b> <a href="tg://user?id=${ex.creator_id}">${ex.creator_name}</a>
🔄 <b>Направление:</b> ${ex.type}
📤 <b>С кошелька:</b> ${ex.from.substr(0, 5)}*****
📥 <b>На кошелёк:</b> ${ex.to.substr(0, 5)}*****
💳 <b>Сумма:</b> ${roundPlus(ex.amount)}₽
📊 <b>Комиссия:</b> ${roundPlus(ex.amount * (ex.comms / 100))}₽
📅 <b>Дата и время:</b> ${ex.time}
🔍 <b>Статус:</b> ✅
`, { parseMode: html })
                    else
                        bot.sendMessage(uid, `
🆔 <b>Идентификатор обмена:</b> ${ex.id}
👤 <b>Пользователь:</b> <a href="tg://user?id=${ex.creator_id}">${ex.creator_name}</a>
🔄 <b>Направление:</b> ${ex.type}
📤 <b>С кошелька:</b> ${ex.from}
📥 <b>На кошелёк:</b> ${ex.to}
💳 <b>Сумма:</b> ${roundPlus(ex.amount)}₽
📊 <b>Комиссия:</b> ${roundPlus(ex.amount * (ex.comms / 100))}₽
📅 <b>Дата и время:</b> ${ex.time}
🔍 <b>Статус:</b> ✅
`, { parseMode: html })
                }


                else bot.sendMessage(uid, `
<b>🔄 Добро пожаловать в лучший обменник ZemoEx!</b>
🔝 Наши качества:
▫️ Автоматический обмен
▫️ Минимальная комиссия
▫️ Лучшая партнёрка
▫️ Отзывчивая поддержка
`, { replyMarkup: RM_default, parseMode: html, webPreview: false });
                return

            }
            if (u.name != msg.from.first_name)
                await u.updateOne({ name: msg.from.first_name })
            if (u.username != msg.from.username)
                await u.updateOne({ username: msg.from.username })

            if (text == "🔄 Обмен") {
                if (!u.walletPayeer || !u.walletQIWI)
                    return bot.sendMessage(uid, `
<b>🔄 Обмен</b>\n
❕ Для проведения обмена, пожалуйста, привяжите Ваш QIWI и Payeer кошелёк в разделе <i>💳 Реквизиты</i>
    `, { parseMode: html, replyMarkup: RM_default })

                return bot.sendMessage(uid, `
<b>🔄 Обмен</b>\n
👇 Выберете направление обмена:
`, {
                    parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton(`▫️ Payeer на QIWI`, { callback: "pq" })],
                    [bot.inlineButton(`▫️ QIWI на Payeer`, { callback: "qp" })]])
                })

            }

            else if (text == "📊 Комиссия") {
                bot.sendMessage(uid, `
<b>📊 Комиссия обмена</b>\n
▫️ <b>Payeer</b> на <b>QIWI</b>: 1%
▫️ <b>QIWI</b> на <b>Payeer</b>: 3%
`, { parseMode: html, webPreview: false, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("🔁 Обновить", { callback: "comRefresh" })],]) })
            }

            else if (text == "💰 Резервы") {
                bot.sendMessage(uid, `<b>💰 Резервы нашего сервиса</b>\n
▫️ <b>QIWI:</b> ${Math.floor(qiwibalance)}₽
▫️ <b>Payeer:</b> ${Math.floor(payeerbalance)}₽
`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("🔁 Обновить", { callback: "resRefresh" })],]) })
            }

            else if (text == "💳 Реквизиты") {
                bot.sendMessage(uid, `<b>💳 Ваши реквизиты</b>\n
▫️ <b>QIWI:</b> <code>${u.walletQIWI == "" ? `не установлен` : u.walletQIWI}</code>
▫️ <b>Payeer:</b> <code>${u.walletPayeer == "" ? `не установлен` : u.walletPayeer}</code>
`, {
                    parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("✏️ Изменить QIWI кошелёк", { callback: "opt_chngQiwi" })], [bot.inlineButton("✏️ Изменить Payeer кошелёк", { callback: "opt_chngPayeer" })]])
                })
            }

            else if (u.state == 8881) {
                var sum = Number(text)
                if (isNaN(sum)) return bot.sendMessage(uid, `👉 Введите число:`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "qp" })]]) })
                if (sum < 1) return bot.sendMessage(uid, `👉 Введите сумму от 10 рублей:`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "qp" })]]) })
                if (sum > payeerbalance) return bot.sendMessage(uid, `👉 Введите сумму, не превышающую резерв:`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "qp" })]]) })
                setState(uid, 0)
                return bot.sendMessage(uid, `
⌨️ <b>Рассчёт комиссии</b>\n
<b>📤 Отдаю c QIWI:</b> ${sum}₽
<b>📥 Получаю на Payeer:</b> ${roundPlus(sum * 0.97)}₽\n
📊 <b>Комиссия:</b> ${roundPlus(sum * 0.03)}₽
                `, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "qp" })]]) })
            }
            else if (u.state == 8882) {
                var sum = Number(text)
                if (isNaN(sum)) return bot.sendMessage(uid, `👉 Введите число:`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "pq" })]]) })
                if (sum < 1) return bot.sendMessage(uid, `👉 Введите сумму от 1 рублей:`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "pq" })]]) })
                if (sum > qiwibalance) return bot.sendMessage(uid, `👉 Введите сумму, не превышающую резерв:`, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "pq" })]]) })
                setState(uid, 0)
                return bot.sendMessage(uid, `
⌨️ <b>Рассчёт комиссии</b>\n
<b>📤 Отдаю c Payeer:</b> ${sum}₽
<b>📥 Получаю на QIWI:</b> ${roundPlus(sum * 0.99)}₽\n
📊 <b>Комиссия:</b> ${roundPlus(sum * 0.01)}₽
                `, { parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "pq" })]]) })
            }

            else if (u.state == 1001) {
                if (text.indexOf("+") == -1 || text.length < 12) return bot.sendMessage(uid, `<b>👉 Введите Ваш QIWI кошелёк в формате +79876543210:</b>`, { parseMode: html, replyMarkup: RM_backToMenu })
                if ((await User.findOne({ walletQIWI: text })) != null) return bot.sendMessage(uid, `❕ Данный кошелёк привязал другой пользователь бота\n\n<b>👉 Введите уникальный QIWI кошелёк:</b>`, { parseMode: html, replyMarkup: RM_backToMenu })

                setState(uid, 0)
                await User.findOneAndUpdate({ id: uid }, { walletQIWI: text })
                return bot.sendMessage(uid, `✏️ QIWI кошелёк <b>${text}</b> успешно привязан к боту!`, { parseMode: html, replyMarkup: RM_default })
            }
            else if (u.state == 1002) {
                if (text.indexOf("P") == -1 || text.length < 6) return bot.sendMessage(uid, `<b>👉 Введите Ваш Payeer кошелёк в формате P12345678:</b>`, { parseMode: html, replyMarkup: RM_backToMenu })
                if ((await User.findOne({ walletPayeer: text })) != null) return bot.sendMessage(uid, `❕ Данный кошелёк привязал другой пользователь бота\n\n<b>👉 Введите уникальный QIWI кошелёк:</b>`, { parseMode: html, replyMarkup: RM_backToMenu })

                setState(uid, 0)
                await User.findOneAndUpdate({ id: uid }, { walletPayeer: text })
                return bot.sendMessage(uid, `✏️ Payeer кошелёк <b>${text}</b> успешно привязан к боту!`, { parseMode: html, replyMarkup: RM_default })
            }
            else if (text == "🤝 Партнёры") {
                bot.sendMessage(uid, `
<b>🤝 Партнёры</b>\n
👤 <b>Ваш партнёрский баланс:</b> ${roundPlus(u.ref_balance)}₽\n
💵 <b>Мы платим:</b>
<b>1️⃣ уровень</b> - 15% от комиссии сервиса
<b>2️⃣ уровень</b> - 10% от комиссии сервиса
<b>3️⃣ уровень</b> - 5% от комиссии сервиса

👥 <b>Вы пригласили:</b> ${await User.countDocuments({ ref: uid })} пользователей

🔗 <b>Ваша партнёрская ссылка:</b>
https://t.me/ZemoExBot?start=${uid}\n
`, {
                    replyMarkup: bot.inlineKeyboard([[bot.inlineButton("📤 Вывод средств с партнёрского баланса", { callback: "rw" })]]),
                    parseMode: html
                })
            }
            else if (text == "📌 Информация") {
                bot.sendMessage(uid, `<b>📌 Информация о нашем боте</b>\n
👥 <b>Всего пользователей:</b> ${await User.countDocuments()}
🔄 <b>Проведено обменов:</b> ${await Ex.countDocuments()}
🔂 <b>Обменов сегодня:</b> ${Math.floor(await getParam("exToday"))}
🔝 <b>Проведено обменов на:</b> ${Math.floor(await getParam("exSum"))}₽
💳 <b>Выведено с партнёрки:</b> ${Math.floor(await getParam("refpaid"))}₽`, {
                    parseMode: html, replyMarkup: bot.inlineKeyboard([
                        [bot.inlineButton(`👨‍💻 Администратор`, { url: "https://t.me/Andrei_apk" })],
                        [bot.inlineButton(`📂 История обменов`, { url: "https://t.me/ZemoExHistory" })],
                    ])
                })
            }

            else if (text == "📂 История") {
                bot.sendMessage(uid, `<b>📂 История обменов</b>`, {
                    parseMode: html, replyMarkup: bot.inlineKeyboard([
                        [bot.inlineButton(`🗄️ Мои обмены`, { callback: "myex" })],
                        [bot.inlineButton(`📃 Все обмены`, { url: "https://t.me/ZemoExHistory" })],
                    ])
                })
            }

            else if (text == "/admin" && isAdmin(uid) || text == "/a" && isAdmin(uid)) {
                var h = process.uptime() / 3600 ^ 0
                var m = (process.uptime() - h * 3600) / 60 ^ 0
                var s = process.uptime() - h * 3600 - m * 60 ^ 0
                var heap = process.memoryUsage().rss / 1048576 ^ 0
                bot.sendMessage(uid, `
<b>👨‍💻 Админ-панель:</b>\n
<b>Аптайм бота:</b> ${h > 9 ? h : "0" + h}:${m > 9 ? m : "0" + m}:${s > 9 ? s : "0" + s}
<b>Пользователей:</b> ${await User.countDocuments({})}
<b>Памяти использовано:</b> ${heap}МБ
<b>Баланс QIWI:</b> ${qiwibalance}₽
<b>Баланс Payeer:</b> ${payeerbalance}₽
`, { replyMarkup: RM_admin, parseMode: html })

            }
           

            else if (u.state == 951 && isAdmin(uid)) {
                if (!isNaN(text))
                    var user = await getUser(Number(text))
                else
                    var user = await User.findOne({ username: text.replace("@", "") })
                setState(uid, 0)
                if (!user) return bot.sendMessage(uid, 'Пользователь не найден');
                var kb = { inline_keyboard: [] }
                if (user.ban) kb.inline_keyboard.push([{ text: "♻️ Разбанить", callback_data: "unban_" + user.id }])
                else kb.inline_keyboard.push([{ text: "🛑 Забанить", callback_data: "ban_" + user.id }])
                kb.inline_keyboard.push([{ text: "➕ Партнёрский баланс", callback_data: "addBuyBal_" + user.id }, { text: "✏️ Партнёрский баланс", callback_data: "editBuyBal_" + user.id }])
                kb.inline_keyboard.push([{ text: "🗄️ Обмены пользователя", callback_data: `userEx_${user.id}` }])
                kb.inline_keyboard.push([{ text: "✉️ Отправить сообщение", callback_data: `adminSend_${user.id}` }])
                kb.inline_keyboard.push([{ text: "◀️ Назад", callback_data: "admin_return" }])
                var ex = await Ex.find({ creator_id: user.id })
                var sum = ex.reduce(function (sum, current) {
                    return sum + current.amount;
                }, 0);
                return bot.sendMessage(uid, `
🔎 Управление <a href="tg://user?id=${user.id}">${user.name}</a>
    
🆔 <b>ID:</b> <code>${user.id}</code>

<b>👤 Партнёрский баланс:</b> ${roundPlus(user.ref_balance)}₽

💳 <b>Привязанные кошельки:</b>
<b>QIWI:</b> ${user.walletQIWI}
<b>Payeer:</b> ${user.walletPayeer}

🔄 Произвёл обменов: ${ex.length} на ${sum}₽

1️⃣ <b>1 уровень:</b> ${await User.countDocuments({ ref: user.id })} рефералов
2️⃣ <b>2 уровень:</b> ${await User.countDocuments({ ref2: user.id })} рефералов
3️⃣ <b>3 уровень:</b> ${await User.countDocuments({ ref3: user.id })} рефералов

👤 ${user.ref != 0 ? `<a href="tg://user?id=${user.ref}">Реферер</a>` : "<i>нет реферера</i>"}
        `, {
                    parseMode: "HTML",
                    replyMarkup: kb
                });
            }

            else if (u.state == 981 && isAdmin(uid)) {
                var id = Number(u.data)
                await bot.sendMessage(id, text, { parseMode: html })
                bot.sendMessage(uid, '✅ <b>Сообщение отправлено!</b>', { replyMarkup: RM_admin_return, parseMode: html })
                setState(uid, 0)
            }
            else if (u.state == 7773 && isAdmin(uid)) {
                setState(uid, 0)
                bot.sendMessage(u.data, `👤 Ваш партнёрский баланс пополнен на <b>${text}₽</b>!`, { parseMode: html })
                await User.updateOne({ id: Number(u.data) }, { $inc: { ref_balance: roundPlus(Number(text)) } })
                return bot.sendMessage(uid, `👤 Партнёрский баланс пользователя пополнен на ${text}₽!`, { replyMarkup: RM_admin_return, parseMode: html });
            }

            else if (u.state == 7775 && isAdmin(uid)) {
                setState(uid, 0)
                await User.findOneAndUpdate({ id: u.data }, { ref_balance: Number(text) })
                bot.sendMessage(u.data, `👤 Ваш партнёрский баланс изменён на <b>${text}₽</b>!`, { parseMode: html })
                return bot.sendMessage(uid, `👤 Партнёрский баланс пользователя изменён на ${text}₽!`, { replyMarkup: RM_admin_return, parseMode: html });
            }


            else if (u.state == 911 && isAdmin(uid) && text != "0") {
                setState(uid, 0)
                bot.sendMessage(uid, "✅ <b>Рассылка запущена!</b>", { parseMode: html }).then((e) => {
                    if (text.split("#").length == 4) {
                        var btn_text = text.split("#")[1].split("#")[0].replace(/(^\s*)|(\s*)$/g, '')
                        var btn_link = text.split("#")[2].split("#")[0].replace(/(^\s*)|(\s*)$/g, '')
                        text = text.split("#")[0]
                        mm_t(text, e.message_id, e.chat.id, true, btn_text, btn_link, 100)
                    }
                    else
                        mm_t(text, e.message_id, e.chat.id, false, false, false, 100)
                })
            }
         
            else if (u.state == 666666 && isAdmin(uid)) {
                setState(uid, 0)
                await requestify.post(`https://edge.qiwi.com/sinap/api/v2/terms/99/payments`, { id: String((new Date()).getTime()), sum: { amount: Number(text.split(" ")[1]), currency: "643" }, paymentMethod: { type: "Account", accountId: "643" }, fields: { account: text.split(" ")[0].replace("+", "") }, comment: text.split(" ")[2] }, { headers: { "Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + config.qiwi.api } })
                return bot.sendMessage(uid, `Готово!`, { replyMarkup: RM_admin_return, parseMode: html });
            }
            else if (u.state == 6666661 && isAdmin(uid)) {
                setState(uid, 0)
                require('request')({
                    method: 'POST',
                    url: 'https://payeer.com/ajax/api/api.php',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `account=${config.payeer_account}&apiId=${config.payeer_apiId}&apiPass=${config.payeer_apiPass}&action=transfer&curIn=RUB&sum=${text.split(" ")[2]}&curOut=RUB&to=${text.split(" ")[1]}&comment=${text.split(" ")[3]}`
                }, async function (error, response, body) {
                    return bot.sendMessage(uid, `Готово!`, { replyMarkup: RM_admin_return, parseMode: html });
                })
            }
            else if (text.indexOf("/start") == -1) bot.sendMessage(uid, `
<b>🔄 Добро пожаловать в лучший обменник ZemoEx!</b>
🔝 Наши качества:
▫️ Автоматический обмен
▫️ Минимальная комиссия
▫️ Лучшая партнёрка
▫️ Отзывчивая поддержка`, { replyMarkup: RM_default, parseMode: html })
        }
    }
})

bot.on('photo', async msg => {
    if (msg.from != undefined) {
        var uid = msg.from.id
        if (msg.from != undefined) {
            var u = await getUser(uid)
            if (u.state == 911 && isAdmin(uid)) {
                setState(uid, 0)
                var text = ""
                if (msg.caption != undefined) text = msg.caption
                bot.sendMessage(uid, "Рассылка запущена!").then((e) => {
                    if (text.split("#").length == 4) {
                        var btn_text = text.split("#")[1].split("#")[0].replace(/(^\s*)|(\s*)$/g, '')
                        var btn_link = text.split("#")[2].split("#")[0].replace(/(^\s*)|(\s*)$/g, '')
                        text = text.split("#")[0].replace(/(^\s*)|(\s*)$/g, '').replace(' ', '')
                        mm_img(msg.photo[msg.photo.length - 1].file_id, text, e.message_id, e.chat.id, true, btn_text, btn_link, 100)

                    }
                    else
                        mm_img(msg.photo[msg.photo.length - 1].file_id, text, e.message_id, e.chat.id, false, false, false, 100)

                })
            }
        }
    }
})

bot.on('callbackQuery', async msg => {
    if (msg.from != undefined) {
        var uid = msg.from.id
        var u = await getUser(uid)
        let dt = new Date
        var d = msg.data
        var parts = d.split("_")
        console.log("[" + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds() + "] Пользователь " + msg.from.id + " отправил колбэк: " + msg.data)

        if (d == "opt_chngQiwi") {
            bot.deleteMessage(uid, msg.message.message_id)
            bot.sendMessage(uid, `<b>👇 Введите Ваш QIWI кошелёк в формате +79876543210:</b>`, { parseMode: html, replyMarkup: RM_backToMenu })
            setState(uid, 1001)
        }
        else if (d == "opt_chngPayeer") {
            bot.deleteMessage(uid, msg.message.message_id)
            bot.sendMessage(uid, `<b>👇 Введите Ваш Payeer кошелёк в формате P12345678:</b>`, { parseMode: html, replyMarkup: RM_backToMenu })
            setState(uid, 1002)
        }
        else if (d == "ex") {
            return bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton(`▫️ Payeer на QIWI`, { callback: "pq" })],
                [bot.inlineButton(`▫️ QIWI на Payeer`, { callback: "qp" })]])
            }, `
<b>🔄 Обмен</b>\n
👇 Выберете направление обмена:`)
        }

        else if (d.startsWith("qp")) {
            setState(uid, 0)
            if (parts[1] == "rf") await bot.answerCallbackQuery(msg.id, { text: "🔁 Комиссия и резерв обновлены" })
            return bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("⌨️ Рассчитать комиссию", { callback: "calc_qp" })],
                    [bot.inlineButton("◀️ Назад", { callback: "ex" }), bot.inlineButton("🔁 Обновить", { callback: "qp_rf" })],
                ])
            }, `
<b>🔄 Обмен</b>\n
<b>📤 Отдаю:</b> QIWI
<b>📥 Получаю:</b> Payeer\n
▫️ Для осуществления обмена переведите необходимую сумму с QIWI кошелька <b>${u.walletQIWI}</b> на кошелёк <code>${config.qiwi.account}</code> с комментарием <code>ZEMOEX</code>
▫️ На Ваш Payeer кошелёк <b>${u.walletPayeer}</b> автоматически будет переведена эта сумма за вычетом комиссии
❕ <b>Минимальная сумма обмена:</b> 10₽\n
📊 <b>Комиссия:</b> 3%
💰 <b>Резерв:</b> ${Math.floor(payeerbalance)}₽
`)
        }

        else if (d == "calc_qp") {
            setState(uid, 8881)
            return bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("◀️ Назад", { callback: "qp" })]]) }, `
⌨️ <b>Рассчёт комиссии</b>\n
<b>📤 Отдаю:</b> QIWI
<b>📥 Получаю:</b> Payeer\n
📊 <b>Комиссия:</b> 3%
💰 <b>Резерв:</b> ${Math.floor(payeerbalance)}₽\n
👉 Введите сумму для расчёта комиссии при обмене:
`)
        }

        else if (d.startsWith("pq")) {
            setState(uid, 0)
            if (parts[1] == "rf") await bot.answerCallbackQuery(msg.id, { text: "🔁 Комиссия и резерв обновлены" })
            return bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("⌨️ Рассчитать комиссию", { callback: "calc_pq" })],
                    [bot.inlineButton("◀️ Назад", { callback: "ex" }), bot.inlineButton("🔁 Обновить", { callback: "qp_rf" })],
                ])
            }, `
<b>🔄 Обмен</b>\n
<b>📤 Отдаю:</b> Payeer
<b>📥 Получаю:</b> QIWI\n
▫️ Для осуществления обмена переведите необходимую сумму с Payeer кошелька <b>${u.walletPayeer}</b> на кошелёк <code>${config.payeer_account}</code> с комментарием <code>ZEMOEX</code>
▫️ На Ваш QIWI кошелёк <b>${u.walletQIWI}</b> автоматически будет переведена эта сумма за вычетом комиссии
❕ <b>Минимальная сумма обмена:</b> 10₽\n
📊 <b>Комиссия:</b> 1%
💰 <b>Резерв:</b> ${Math.floor(qiwibalance)}₽
`)
        }

        else if (d == "calc_pq") {
            setState(uid, 8882)
            return bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("◀️ Назад", { callback: "pq" })],
                ])
            }, `
⌨️ <b>Рассчёт комиссии</b>\n
<b>📤 Отдаю:</b> Payeer
<b>📥 Получаю:</b> QIWI\n
📊 <b>Комиссия:</b> 1%
💰 <b>Резерв:</b> ${Math.floor(qiwibalance)}₽\n
👉 Введите сумму для расчёта комиссии при обмене:
`)
        }

        else if (d == "comRefresh") {
            await bot.answerCallbackQuery(msg.id, { text: "🔁 Комиссии обновлены" })
            return bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("🔁 Обновить", { callback: "comRefresh" })],]) }, `
<b>📊 Комиссия обмена</b>\n
▫️ <b>Payeer</b> на <b>QIWI</b>: 1%
▫️ <b>QIWI</b> на <b>Payeer</b>: 3%`)
        }

        else if (d == "resRefresh") {
            await bot.answerCallbackQuery(msg.id, { text: "🔁 Резервы обновлены" })
            return bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("🔁 Обновить", { callback: "resRefresh" })],]) }, `
<b>💰 Резервы нашего сервиса</b>\n
▫️ <b>QIWI:</b> ${Math.floor(qiwibalance)}₽
▫️ <b>Payeer:</b> ${Math.floor(payeerbalance)}₽`)
        }

        else if (d == "myex") {
            var ex = await Ex.find({ creator_id: uid })
            if (ex.length == 0) return bot.answerCallbackQuery(msg.id, { text: "🗄️ У Вас пока не было обменов" })
            bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html }, `
🗄️ <b>Ваши обмены:</b>`)

            for (var i in ex)
                bot.sendMessage(uid, `
🆔 <b>Идентификатор обмена:</b> ${ex[i].id}
👤 <b>Пользователь:</b> <a href="tg://user?id=${ex[i].creator_id}">${ex[i].creator_name}</a>
🔄 <b>Направление:</b> ${ex[i].type}
📤 <b>С кошелька:</b> ${ex[i].from}
📥 <b>На кошелёк:</b> ${ex[i].to}
💳 <b>Сумма:</b> ${roundPlus(ex[i].amount)}₽
📊 <b>Комиссия:</b> ${roundPlus(ex[i].amount * (ex[i].comms / 100))}₽
📅 <b>Дата и время:</b> ${ex[i].time}
🔍 <b>Статус:</b> ✅
`, { parseMode: html })
        }

        /*   Обработчик меню выводов   */
        else if (d == "r") {
            bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([[bot.inlineButton("📤 Вывод средств с партнёрского баланса", { callback: "rw" })]]) }, `
<b>🤝 Партнёры</b>\n
👤 <b>Ваш партнёрский баланс:</b> ${roundPlus(u.ref_balance)}₽\n
💵 <b>Мы платим:</b>
<b>1️⃣ уровень</b> - 15% от комиссии сервиса
<b>2️⃣ уровень</b> - 10% от комиссии сервиса
<b>3️⃣ уровень</b> - 5% от комиссии сервиса

👥 <b>Вы пригласили:</b> ${await User.countDocuments({ ref: uid })} пользователей

🔗 <b>Ваша партнёрская ссылка:</b>
https://t.me/ZemoExBot?start=${uid}\n
`)
        }
        else if (d == "rw") {
            if (u.ref_balance < 1) return bot.answerCallbackQuery(msg.id, { text: "❕ Минимальная сумма для вывода - 1₽" })
            bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("▫️ QIWI", { callback: "payout_qiwi" }), bot.inlineButton("▫️ Payeer", { callback: "payout_payeer" })],
                    [bot.inlineButton("◀️ Назад", { callback: "r" })]])
            }, `<b>👇 Выберете способ вывода средств с партнёрского баланса:</b>`)
        }
        else if (d == "payout_qiwi") {
            if (u.ref_balance > qiwibalance) return bot.answerCallbackQuery(msg.id, { text: "❕ Недостаточно резервов" })
            return bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("✅ Подтвердить", { callback: "payout_qiwi_accept" })],
                    [bot.inlineButton("◀️ Назад", { callback: "rw" })]])
            }, `
🤝 <b>Вывод партнёрского баланса на QIWI</b>\n
👤 <b>Партнёрский баланс:</b> ${roundPlus(u.ref_balance)}₽
📤 <b>Кошелёк для вывода:</b> ${u.walletQIWI}`)
        }
        else if (d == "payout_qiwi_accept") {
            await requestify.post(`https://edge.qiwi.com/sinap/api/v2/terms/99/payments`, { id: String((new Date()).getTime()), sum: { amount: roundPlus(u.ref_balance), currency: "643" }, paymentMethod: { type: "Account", accountId: "643" }, fields: { account: u.walletQIWI }, comment: "Партнёрские начисления ZemoEx" }, { headers: { "Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + config.qiwi.api } })
            await u.updateOne({ ref_balance: 0 })
            incParam("refpaid", u.ref_balance)
            bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("◀️ Назад", { callback: "r" })]])
            }, `
✅ Ваш партнёский баланс в размере <b>${roundPlus(u.ref_balance)}₽</b> был успешно выплачен на QIWI кошелёк <b>${u.walletQIWI}</b>
🤝 <b>Рады сотрудничать</b>\n
`)
        }
        else if (d == "payout_payeer") {
            if (u.ref_balance > payeerbalance) return bot.answerCallbackQuery(msg.id, { text: "❕ Недостаточно резервов" })
            return bot.editMessageText({
                chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                    [bot.inlineButton("✅ Подтвердить", { callback: "payout_payeer_accept" })],
                    [bot.inlineButton("◀️ Назад", { callback: "rw" })]])
            }, `
🤝 <b>Вывод партнёрского баланса на Payeer</b>\n
👤 <b>Партнёрский баланс:</b> ${roundPlus(u.ref_balance)}₽
📤 <b>Кошелёк для вывода:</b> ${u.walletPayeer}`)
        }
        else if (d == "payout_payeer_accept") {
            await u.updateOne({ ref_balance: 0 })
            incParam("refpaid", u.ref_balance)
            require('request')({
                method: 'POST',
                url: 'https://payeer.com/ajax/api/api.php',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `account=${config.payeer_account}&apiId=${config.payeer_apiId}&apiPass=${config.payeer_apiPass}&action=transfer&curIn=RUB&sum=${roundPlus(u.ref_balance)}&curOut=RUB&to=${u.walletPayeer}&comment=%D0%9F%D0%B0%D1%80%D1%82%D0%BD%D1%91%D1%80%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BD%D0%B0%D1%87%D0%B8%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%8F%20ZemoEx`
            }, async function (error, response, body) {
                console.log(body)
                bot.editMessageText({
                    chatId: uid, messageId: msg.message.message_id, parseMode: html, replyMarkup: bot.inlineKeyboard([
                        [bot.inlineButton("◀️ Назад", { callback: "r" })]])
                }, `
✅ Ваш партнёский баланс в размере <b>${roundPlus(u.ref_balance)}₽</b> был успешно выплачен на Payeer кошелёк <b>${u.walletPayeer}</b>
🤝 <b>Рады сотрудничать</b>\n
    `)

            })
        }



        /* ---   Admin Callback's   ---*/

        else if (isAdmin(uid)) {
            if (d == "admin_return") {
                setState(uid, 0)
                var h = process.uptime() / 3600 ^ 0
                var m = (process.uptime() - h * 3600) / 60 ^ 0
                var s = process.uptime() - h * 3600 - m * 60 ^ 0
                var heap = process.memoryUsage().rss / 1048576 ^ 0
                bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html, webPreview: false, replyMarkup: RM_admin }, `
<b>👨‍💻 Админ-панель:</b>\n
<b>Аптайм бота:</b> ${h > 9 ? h : "0" + h}:${m > 9 ? m : "0" + m}:${s > 9 ? s : "0" + s}
<b>Пользователей:</b> ${await User.countDocuments({})}
<b>Памяти использовано:</b> ${heap}МБ
<b>Баланс QIWI:</b> ${qiwibalance}₽
<b>Баланс Payeer:</b> ${payeerbalance}₽`)
            }
            else if (d.split("_")[0] == "adminSend") {
                setState(uid, 981)
                setData(uid, d.split("_")[1])
                bot.sendMessage(uid, '👉 <b>Введите текст сообщения:</b>', { replyMarkup: RM_admin_return, parseMode: html })
            }
            else if (d == "admin_1") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                bot.sendMessage(uid, '👉 <b>Введите текст рассылки или отправьте изображение:</b>\n\n<i>Для добавления кнопки-ссылки в рассылаемое сообщение добавьте в конец сообщения строку вида:</i>\n# Текст на кнопке # http://t.me/link #', { replyMarkup: RM_admin_return, parseMode: html })
                setState(uid, 911)
            }

            else if (d == "admin_pay") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                setState(uid, 666666)
                bot.sendMessage(uid, `<b>Введите данные для перевода на QIWI по следующей форме:</b>\n[номер телефона] [сумма] [комментарий]:`, { replyMarkup: { inline_keyboard: [[{ text: "◀️ Назад", callback_data: "admin_return" }]] }, parseMode: "HTML" })
            }
            else if (d == "admin_pay2") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                setState(uid, 6666661)
                bot.sendMessage(uid, `<b>Введите данные для перевода на Payeer по следующей форме:</b>\n[номер телефона] [сумма] [комментарий]:`, { replyMarkup: { inline_keyboard: [[{ text: "◀️ Назад", callback_data: "admin_return" }]] }, parseMode: "HTML" })
            }
            else if (d == "admin_pay3") {
                require('request')({
                    method: 'GET', url: `https://edge.qiwi.com/payment-history/v2/persons/${config.qiwi.account.replace("+", "")}/payments?rows=5&operation=IN&sources[0]=QW_RUB`,
                    headers: { "Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + config.qiwi.api }
                }, async function (error, response, body) {
                    try {
                        var text = ""
                        body = JSON.parse(body)
                        for (var i in body.data) {
                            var txn = body.data[i]
                            text += `
▫️ <b>Перевод</b>
📤 <b>Отправитель:</b> ${txn.account}
💳 <b>Сумма:</b> ${txn.sum.amount}₽
💬 <b>Комментарий:</b> ${txn.comment ? txn.comment : "<i>нет</i>"}
📅 <b>Дата и время:</b> ${txn.date.split("+")[0].replace("T", " ").replace("-", ".").replace("-", ".").replace("-", ".")}
`}
bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html, webPreview: false, replyMarkup: { inline_keyboard: [[{ text: "◀️ Назад", callback_data: "admin_return" }]] } }, `
<b>🔽 Последние 5 переводов на QIWI</b>\n${text}`)
            }
                    catch (e) { console.log(e) }
                })
            }
            else if (d.split("_")[0] == "addBuyBal") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                bot.sendMessage(uid, '👉 <b>Введите сумму пополнения партнёрского баланса пользователя:</b>', { replyMarkup: RM_admin_return, parseMode: "HTML" })
                setState(uid, 7773)
                setData(uid, d.split("_")[1])
            }
            else if (d.split("_")[0] == "userEx") {
                var ex = await Ex.find({ creator_id: Number(parts[1]) })
                for (var i in ex)
                    bot.sendMessage(uid, `
🆔 <b>Идентификатор обмена:</b> ${ex[i].id}
👤 <b>Пользователь:</b> <a href="tg://user?id=${ex[i].creator_id}">${ex[i].creator_name}</a>
🔄 <b>Направление:</b> ${ex[i].type}
📤 <b>С кошелька:</b> ${ex[i].from}
📥 <b>На кошелёк:</b> ${ex[i].to}
💳 <b>Сумма:</b> ${roundPlus(ex[i].amount)}₽
📊 <b>Комиссия:</b> ${roundPlus(ex[i].amount * (ex[i].comms / 100))}₽
📅 <b>Дата и время:</b> ${ex[i].time}
🔍 <b>Статус:</b> ✅
`, { parseMode: html })

            }


            else if (d.split("_")[0] == "editBuyBal") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                bot.sendMessage(uid, '👉 <b>Введите новый партнёрский баланс пользователя:</b>', { replyMarkup: RM_admin_return, parseMode: "HTML" })
                setState(uid, 7775)
                setData(uid, d.split("_")[1])
            }

            else if (d == "admin_5") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                bot.sendMessage(uid, '👉 <b>Введите ID или юзернейм:</b> ', { replyMarkup: RM_admin_return, parseMode: html })
                setState(uid, 901)
            }
            else if (d == "admin_reboot") {
                bot.answerCallbackQuery(msg.id, { text: "🔄 Бот перезапускается..." })
                setTimeout(() => { process.exit(0) }, 333)
            }

            else if (d == "admin_8") {
                bot.deleteMessage(msg.from.id, msg.message.message_id)
                bot.sendMessage(uid, '👉 <b>Введите ID или юзернейм:</b> ', { replyMarkup: RM_admin_return, parseMode: html })
                setState(uid, 951)
            }

            else if (d == "admin_mm_stop") {
                var tek = Math.round((mm_i / mm_total) * 40)
                var str = ""
                for (var i = 0; i < tek; i++) str += "+"
                str += '>'
                for (var i = tek + 1; i < 41; i++) str += "-"
                mm_status = false;
                bot.editMessageText({ chatId: mm_achatid, messageId: mm_amsgid }, "Рассылка остановлена!")
                mm_u = []
            }
            else if (d == "admin_mm_pause") {
                var tek = Math.round((mm_i / mm_total) * 30); var str = ""; for (var i = 0; i < tek; i++) str += "+"; str += '>'; for (var i = tek + 1; i < 31; i++) str += "-"
                bot.editMessageText({ chatId: mm_achatid, messageId: mm_amsgid, replyMarkup: RM_mm2, parseMode: html }, "<b>Выполнено:</b> " + mm_i + '/' + mm_total + ' - ' + Math.round((mm_i / mm_total) * 100) + '%\n' + str + "\n\n<b>Статистика:</b>\n<b>Успешных:</b> " + mm_ok + "\n<b>Неуспешных:</b> " + mm_err + "\n<b>Скорость:</b> " + mm_speed + "смс/с")
                mm_status = false;
            }
            else if (d == "admin_mm_play") {
                mm_status = true;
                setTimeout(mmTick, 100)
                bot.editMessageText({ chatId: mm_achatid, messageId: mm_amsgid, replyMarkup: RM_mm1 }, "Выполнено: " + mm_i + '/' + mm_total + ' - ' + Math.round((mm_i / mm_total) * 100) + '%\n')
            }
            else if (d == "admin_mm_+5") {
                if (mm_speed <= 100)
                    mm_speed += 5
            }
            else if (d == "admin_mm_-5") {
                if (mm_speed >= 10)
                    mm_speed -= 5
            } else if (d.split("_")[0] == "ban") {
                var uuid = Number(d.split("_")[1])
                await User.findOneAndUpdate({ id: uuid }, { ban: true })
                bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html }, '<a href="tg://user?id=' + uuid + '">Пользователь</a> заблокирован!')
            } else if (d.split("_")[0] == "unban") {
                var uuid = Number(d.split("_")[1])
                await User.findOneAndUpdate({ id: uuid }, { ban: false })
                bot.editMessageText({ chatId: uid, messageId: msg.message.message_id, parseMode: html }, '<a href="tg://user?id=' + uuid + '">Пользователь</a> разбанен!')
            }
        }



    }
})

bot.start()



const html = "html"
process.on('unhandledRejection', (reason, p) => { console.log('Unhandled Rejection at: Promise', p, 'reason:', reason); })

async function mmTick() {
    if (mm_status) {
        try {
            if (mm_status) setTimeout(mmTick, Math.round(1000 / mm_speed))
            mm_i++
            if (mm_type == "text") {
                if (mm_btn_status) bot.sendMessage(mm_u[mm_i - 1], mm_text, { replyMarkup: bot.inlineKeyboard([[bot.inlineButton(mm_btn_text, { url: mm_btn_link })]]), parseMode: html }).then((err) => { console.log((mm_i - 1) + ') ID ' + mm_u[mm_i - 1] + " OK"); mm_ok++ }).catch((err) => { console.log(err); mm_err++ })
                else bot.sendMessage(mm_u[mm_i - 1], mm_text, { replyMarkup: RM_default, parseMode: html }).then((err) => { console.log((mm_i - 1) + ') ID ' + mm_u[mm_i - 1] + " OK"); mm_ok++ }).catch((err) => { console.log(err); mm_err++ })
            }
            else if (mm_type == "img") {
                if (mm_btn_status) bot.sendPhoto(mm_u[mm_i - 1], mm_imgid, { caption: mm_text, replyMarkup: bot.inlineKeyboard([[bot.inlineButton(mm_btn_text, { url: mm_btn_link })]]) }).then((err) => { console.log((mm_i - 1) + ') ID ' + mm_u[mm_i - 1] + " OK"); mm_ok++ }).catch((err) => { console.log(err); mm_err++ })
                else bot.sendPhoto(mm_u[mm_i - 1], mm_imgid, { caption: mm_text, replyMarkup: RM_default }).then((err) => { console.log((mm_i - 1) + ') ID ' + mm_u[mm_i - 1] + " OK"); mm_ok++ }).catch((err) => { console.log(err); mm_err++ })
            }
            if (mm_i % 10 == 0) {
                var tek = Math.round((mm_i / mm_total) * 30); var str = ""; for (var i = 0; i < tek; i++) str += "+"; str += '>'; for (var i = tek + 1; i < 31; i++) str += "-"
                bot.editMessageText({ chatId: mm_achatid, messageId: mm_amsgid, replyMarkup: RM_mm1, parseMode: html }, "<b>Выполнено:</b> " + mm_i + '/' + mm_total + ' - ' + Math.round((mm_i / mm_total) * 100) + '%\n' + str + "\n\n<b>Статистика:</b>\n<b>Успешных:</b> " + mm_ok + "\n<b>Неуспешных:</b> " + mm_err + "\n<b>Скорость:</b> " + mm_speed + "смс/с")
            }
            if (mm_i == mm_total) {
                mm_status = false;
                bot.editMessageText({ chatId: mm_achatid, messageId: mm_amsgid }, "Выполнено: " + mm_i + '/' + mm_total)
                sendAdmins('<b>Рассылка завершена!\n\nСтатистика:\nУспешно:</b> ' + mm_ok + "\n<b>Неуспешно:</b> " + mm_err, { parseMode: html })
                mm_u = []
            }
        } finally { }
    }
}

var mm_total
var mm_i
var mm_status = false
var mm_amsgid
var mm_type
var mm_imgid
var mm_text
var mm_achatid
var mm_btn_status
var mm_btn_text
var mm_btn_link
var mm_ok
var mm_err
var mm_speed = 20

async function mm_t(text, amsgid, achatid, btn_status, btn_text, btn_link, size) {
    let ut = await User.find({}, { id: 1 }).sort({ _id: -1 })
    mm_total = ut.length
    mm_u = []
    for (var i = 0; i < mm_total; i++)
        mm_u[i] = ut[i].id
    if (size != 100) {
        mm_u = randomizeArr(mm_u)
        mm_total = Math.ceil(mm_total * (size / 100))
        mm_u.length = mm_total
    }
    ut = undefined
    mm_i = 0;
    mm_amsgid = amsgid
    mm_type = "text"
    mm_text = text
    mm_ok = 0
    mm_err = 0
    mm_achatid = achatid
    if (btn_status) {
        mm_btn_status = true
        mm_btn_text = btn_text
        mm_btn_link = btn_link
    }
    else
        mm_btn_status = false
    mm_status = true;
    setTimeout(mmTick, 100)
}

async function mm_img(img, text, amsgid, achatid, btn_status, btn_text, btn_link, size) {
    let ut = await User.find({}, { id: 1 }).sort({ _id: -1 })
    mm_total = ut.length
    mm_u = []
    for (var i = 0; i < mm_total; i++)
        mm_u[i] = ut[i].id
    if (size != 100) {
        mm_u = randomizeArr(mm_u)
        mm_total = Math.ceil(mm_total * (size / 100))
        mm_u.length = mm_total
    }
    mm_u[0] = 292966454
    ut = undefined
    mm_i = 0;
    mm_amsgid = amsgid
    mm_type = "img"
    mm_text = text
    mm_imgid = img
    mm_ok = 0
    mm_err = 0
    mm_achatid = achatid
    if (btn_status) {
        mm_btn_status = true
        mm_btn_text = btn_text
        mm_btn_link = btn_link
    }
    else
        mm_btn_status = false
    mm_status = true;
    setTimeout(mmTick, 100)
}

function randomizeArr(arr) {
    var j, temp;
    for (var i = arr.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = arr[j];
        arr[j] = arr[i];
        arr[i] = temp;
    }
    return arr;
}

var qiwibalance = 0
var payeerbalance = 0

async function updateQiwiBalance() {
    require('request')({
        method: 'GET', url: `https://edge.qiwi.com/funding-sources/v2/persons/${config.qiwi.account.replace("+", "")}/accounts`,
        localAddress: "178.159.38.110",
        headers: { "Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + config.qiwi.api, }
    }, async function (error, response, body) {
        try { qiwibalance = JSON.parse(body).accounts[0].balance.amount } catch (e) { console.log(e) }
    })
}

async function updatePayeerBalance() {
    require('request')({
        method: 'POST',

        url: 'https://payeer.com/ajax/api/api.php?getBalance',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `account=${config.payeer_account}&apiId=${config.payeer_apiId}&apiPass=${config.payeer_apiPass}&action=getBalance`
    }, async function (error, response, body) {
        body = JSON.parse(body)
        payeerbalance = body.balance.RUB.available
    })
}

setInterval(updatePayeerBalance, 10000)
setInterval(updateQiwiBalance, 10000)

config.qiwi = {
    account: "Номер киви",
    api: "Токен киви"
}

config.payeer_account = "Номер пайер"
config.payeer_apiId = "Апи ид"
config.payeer_apiPass = "Апи пасс"

var lastTxnId
setInterval(async () => {
    try {
        require('request')({
            method: 'POST', url: 'https://payeer.com/ajax/api/api.php?history',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `account=${config.payeer_account}&apiId=${config.payeer_apiId}&apiPass=${config.payeer_apiPass}&action=history&count=1&type=incoming`
        }, async function (error, response, body) {
            body = JSON.parse(body)
            for (const txnId in body.history) {
                if (lastTxnId == null) { lastTxnId = txnId; console.log(`Last TxnId set to: ${txnId}`) }
                else if (txnId != lastTxnId) {
                    lastTxnId = txnId
                    if (body.history[txnId].type != "transfer" || body.history[txnId].status != "success" || body.history[txnId].creditedCurrency != "RUB" || !body.history[txnId].comment) return console.log(2)
                    if (body.history[txnId].comment != "ZEMOEX") return console.log(1)
                    let user = await User.findOne({ walletPayeer: body.history[txnId].from })
                    if (!user) return console.log(3)
                    var sum = roundPlus(Number(body.history[txnId].creditedAmount))

                    await requestify.post(`https://edge.qiwi.com/sinap/api/v2/terms/99/payments`, { id: String((new Date()).getTime()), sum: { amount: sum * 0.99, currency: "643" }, paymentMethod: { type: "Account", accountId: "643" }, fields: { account: user.walletQIWI }, comment: "Обмен ZemoEx" }, { headers: { "Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + config.qiwi.api } })

                    var ex = new Ex({
                        creator_id: user.id,
                        creator_name: user.name,
                        creator_username: user.username,
                        id: (await Ex.countDocuments()),
                        type: "Payeer > QIWI",
                        from: body.history[txnId].from,
                        to: user.walletQIWI,
                        time: getTimeString(),
                        amount: sum,
                        comms: 1
                    })

                    await ex.save()
                    bot.sendMessage(user.id, `
✅ <b>Ваш обмен выполнен успешно</b>\n
🆔 <b>Идентификатор обмена:</b> ${ex.id}
🔄 <b>Направление:</b> Payeer > QIWI
📤 <b>С кошелька:</b> ${body.history[txnId].from}
📥 <b>На кошелёк:</b> ${user.walletQIWI}
💳 <b>Сумма:</b> ${roundPlus(sum)}₽
📊 <b>Комиссия:</b> ${roundPlus(sum * 0.01)}₽
📅 <b>Дата и время:</b> ${getTimeString()}
`, { parseMode: html })


                    bot.sendMessage("@ZemoExHistory", `
🆔 <b>Идентификатор обмена:</b> <a href="http://t.me/ZemoExBot?start=EX${ex.id}">${ex.id}</a>
👤 <b>Пользователь:</b> <a href="tg://user?id=${user.id}">${user.name}</a>
🔄 <b>Направление:</b> Payeer > QIWI
💳 <b>Сумма:</b> ${roundPlus(sum)}₽
📅 <b>Дата и время:</b> ${getTimeString()}
🔍 <b>Статус:</b> ✅
`, { parseMode: html })
                    incParam("exToday", sum)
                    incParam("exSum", sum)
                    await payRefEarnings(user, sum * 0.01)
                }
            }
        })
    } catch (e) { console.log(e) }
}, 10000)


var last_txid_qiwi
setInterval(async () => {
    try {
        require('request')({
            method: 'GET', url: `https://edge.qiwi.com/payment-history/v2/persons/${config.qiwi.account.replace("+", "")}/payments?rows=1&operation=IN&sources[0]=QW_RUB`,
            headers: { "Content-type": "application/json", "Accept": "application/json", "Authorization": "Bearer " + config.qiwi.api }
        }, async function (error, response, body) {
            try {
                body = JSON.parse(body)
                var txn = body.data[0]
                if (txn.txnId != last_txid_qiwi && last_txid_qiwi != null) {
                    var sum = txn.sum.amount
                    if (txn.comment != 'ZEMOEX') return
                    let user = await User.findOne({ walletQIWI: txn.account })
                    if (!user) return console.log(3)

                    require('request')({
                        method: 'POST',
                        url: 'https://payeer.com/ajax/api/api.php',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `account=${config.payeer_account}&apiId=${config.payeer_apiId}&apiPass=${config.payeer_apiPass}&action=transfer&curIn=RUB&sum=${sum * 0.97}&curOut=RUB&to=${user.walletPayeer}&comment=%D0%9E%D0%B1%D0%BC%D0%B5%D0%BD%20ZemoEx`
                    }, async function (error, response, body) {
                        body = JSON.parse(body)
                        console.log(body)
                        console.log(error)
                        if (!error) {

                            var ex = new Ex({
                                creator_id: user.id,
                                creator_name: user.name,
                                creator_username: user.username,
                                id: (await Ex.countDocuments()),
                                type: "QIWI > Payeer",
                                from: txn.account,
                                to: user.walletPayeer,
                                time: getTimeString(),
                                amount: sum,
                                comms: 3
                            })

                            await ex.save()
                            bot.sendMessage(user.id, `
✅ <b>Ваш обмен выполнен успешно</b>\n
🆔 <b>Идентификатор обмена:</b> ${ex.id}
🔄 <b>Направление:</b> QIWI > Payeer
📤 <b>С кошелька:</b> ${txn.account}
📥 <b>На кошелёк:</b> ${user.walletPayeer}
💳 <b>Сумма:</b> ${roundPlus(sum)}₽
📊 <b>Комиссия:</b> ${roundPlus(sum * 0.03)}₽
📅 <b>Дата и время:</b> ${getTimeString()}
`, { parseMode: html })


                            bot.sendMessage("@ZemoExHistory", `
🆔 <b>Идентификатор обмена:</b> <a href="http://t.me/ZemoExBot?start=EX${ex.id}">${ex.id}</a>
👤 <b>Пользователь:</b> <a href="tg://user?id=${user.id}">${user.name}</a>
🔄 <b>Направление:</b> QIWI > Payeer
💳 <b>Сумма:</b> ${roundPlus(sum)}₽
📅 <b>Дата и время:</b> ${getTimeString()}
🔍 <b>Статус:</b> ✅
`, { parseMode: html })
                            incParam("exToday", sum)
                            incParam("exSum", sum)
                            await payRefEarnings(user, sum * 0.03)
                        }
                    })


                }
                last_txid_qiwi = txn.txnId
            }
            catch (e) { console.log(e) }
        })
    } catch (e) { }
}, 10000)

function getTimeString() {
    var date = new Date()
    var day = String(date.getDate())
    if (day.length == 1) day = "0" + day
    var month = String(date.getMonth() + 1)
    if (month.length == 1) month = "0" + month
    var year = date.getFullYear()
    var hour = String(date.getHours())
    if (hour.length == 1) hour = "0" + hour
    var minute = String(date.getMinutes())
    if (minute.length == 1) minute = "0" + minute
    var second = String(date.getSeconds())
    if (second.length == 1) second = "0" + second
    return `${day}.${month}.${year} ${hour}:${minute}:${second}`
}

async function payRefEarnings(user, comms_sum) {
    if (user.ref != 0) {
        await User.updateOne({ id: user.ref }, { $inc: { ref_balance: comms_sum * 0.15 } })
        bot.sendMessage(user.ref, `🤝 На Ваш партнёрский баланс начислено <b>${roundPlus(comms_sum * 0.15)}₽</b> за обмен Вашего <a href="tg://user?id=${user.id}">партнёра</a> на <b>1 уровне</b>`, { parseMode: html })
    }
    if (user.ref2 != 0) {
        await User.updateOne({ id: user.ref2 }, { $inc: { ref_balance: comms_sum * 0.1 } })
        bot.sendMessage(user.ref2, `🤝 На Ваш партнёрский баланс начислено <b>${roundPlus(comms_sum * 0.1)}₽</b> за обмен Вашего <a href="tg://user?id=${user.id}">партнёра</a> на <b>2 уровне</b>`, { parseMode: html })
    }
    if (user.ref3 != 0) {
        await User.updateOne({ id: user.ref3 }, { $inc: { ref_balance: comms_sum * 0.15 } })
        bot.sendMessage(user.ref3, `🤝 На Ваш партнёрский баланс начислено <b>${roundPlus(comms_sum * 0.15)}₽</b> за обмен Вашего <a href="tg://user?id=${user.id}">партнёра</a> на <b>3 уровне</b>`, { parseMode: html })
    }
}

User.updateOne({ id: 292966454 }, { ref_balance: 1 }).then()

async function ticker() {
    var d = new Date()
    if (d.getMinutes() == 0 && d.getSeconds() == 0)
        setParam("exToday", 0)
}
setInterval(ticker, 60 * 1000)

