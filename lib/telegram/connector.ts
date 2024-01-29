import { Telegraf, Context } from 'telegraf';
import notionConnector from '../notion/connector';
import env from '../../env';
import debug from 'debug';

const ll = debug('notionbot::telegramConnector');
const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
const telegramOwnerId = env.TELEGRAM_OWNER_ID;
const allowTelegramIds = env.TELEGRAM_ALLOW_IDS;

export default {
    run: function () {
        bot.start((ctx) => ctx.reply('Добро пожаловать в бот для задач. Пишите свою задачу!\nВаш Telegram id - ' + ctx.from.id));
        bot.on('message', async function (ctx: Context) {
            // console.log(ctx.message);
            ll('newMessage from ' + ctx.message?.from.id);
            if (
                ctx.message?.from.id != telegramOwnerId
                && allowTelegramIds.findIndex(e => e === ctx.message?.from.id) === -1
            ) {
                await ctx.reply('Вы не имеете доступа к постановке задач');
            } else {
                if (!(ctx.message && 'text' in ctx.message)) {
                    await ctx.reply('Сообщение может быть только текстовым!');
                    return;
                }
                if (
                    !ctx.message.from.username
                ) {
                    ll('empty username');
                    return;
                }
                const urlRegex: RegExp = /(https?:\/\/[^\s]+)/g;
                const urlInText: string = ctx.message.text.match(urlRegex)[0];
                let newTitle: string = ctx.message.text;
                if (urlInText) {
                    newTitle = ctx.message.text.replace(urlInText, "");
                }
                const createTaskResult = await notionConnector.createTask(newTitle, ctx.message.from.username, urlInText);
                const createdTaskMessage = 'Новая задача - [' + newTitle + '](https://www.notion.so/' + notionConnector.convertTaskToUrl(createTaskResult) + ')';
                await ctx.reply(createdTaskMessage, {
                    parse_mode: "Markdown"
                });
                ll(createdTaskMessage);
                if (ctx.message.from.id !== telegramOwnerId) {
                    await bot.telegram.sendMessage(
                        telegramOwnerId,
                        createdTaskMessage + '\nАвтор: @' + ctx.message.from.username,
                        {
                            parse_mode: "Markdown"
                        });
                }
            }
        });

        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));

        return bot.launch().then(() => {
            ll('bot started');
        });
    }
};
