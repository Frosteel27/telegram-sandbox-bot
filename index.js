const { Telegraf, Markup, Composer, Scenes, session } = require('telegraf');
const schedule = require('node-schedule')
let fs = require('fs')
require('dotenv').config();


const bot = new Telegraf(process.env.BOT_TOKEN);

const mainMenu = Markup.keyboard(
    [['Чат участников', 'Программа встречи'],
    ['У меня есть идея']]
).resize();

let userData = [];

// const time = new Date(2022, 10, 27, 13, 9, 0);
// const job = schedule.scheduleJob(time, () => {
//     console.log('it works')
// })

function addData(id) {
    if(userData.indexOf(id) === -1) {
        userData.push(id);
    } else {
        return
    }
    fs.writeFile('test.txt', transformData(), err => {if(err){throw err}})
}

bot.command('null', () => {
    fs.writeFile('test.txt', '', (err) => {if(err){throw err}})
    userData = [];
})

bot.command('quit', (ctx) => {
    userData = userData.filter(item => item !== ctx.message.from.id);
    fs.writeFile('test.txt', transformData(), err => {if(err){throw err}})
})

function transformData() {
    return userData.toString()
}

bot.command('appdata', (ctx) => {
    // userData.push(ctx.message.from.id);
    addData(ctx.message.from.id)
    console.log(userData);
    
})

let testText = fs.readFileSync('test.txt', 'utf8')

bot.command('show', () => console.log(userData));
bot.command('write', () => fs.writeFile('test.txt', transformData(), (err) => {
    if(err) {
        throw err;
    }
}))

bot.command('testmsg', (ctx) => {
    try {
        if(userData.length !== 0) {
            userData.forEach(id => {
                bot.telegram.sendMessage(id, 'working')
            })
        } else {
            ctx.reply('array is empty')
        }
    } catch(err) {
        console.log(err)
    }    
})

// bot.telegram.sendMessage('-871182787','hi')

async function greeting(ctx) {
    try {
        const {message_id} = ctx.reply(`Привет ${ctx.message.from.first_name}!`, mainMenu
        )         
    } catch(err) {
        console.log(err)
    }  
}

bot.start(async (ctx) => {
      greeting(ctx);
      addData(ctx.message.from.id)
});

bot.hears('Чат участников', (ctx) => {
    ctx.deleteMessage()
    ctx.replyWithHTML('<a href="https://t.me/+pBNB5cIhpcgzMTcy">Ссылка на чат</a>')
})

bot.hears('Программа встречи', (ctx) => {
    ctx.deleteMessage()
    ctx.replyWithPhoto({source: './images/1.jpg'}); 
})



// function triggerMenu(ctx) {
//     ctx.replyWithHTML('<b>Menu</b>', Markup.inlineKeyboard([
//         [Markup.button.callback('Программа встречи', 'programa')],
//         [Markup.button.callback('У меня есть идея', 'idea')],
//         [Markup.button.url('Чат участников', 'https://t.me/+pBNB5cIhpcgzMTcy')]
//     ]))
// };

bot.action('programa', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.replyWithPhoto({source: './images/1.jpg'});        
    } catch(err) {
        console.log(err);
    } finally {
        await triggerMenu(ctx);
    }    
});

// *** Scene ***

const topic = new Composer();
topic.on('text', async (ctx) => {
    try {
        ctx.wizard.state.data = {};
        await ctx.reply('choose topic', Markup.keyboard([
            ['topic1', 'topic2'],
            ['topic3', 'topic4'],
            ['Отмена']
        ]).resize());
        return await ctx.wizard.next();
    } catch(err) {
        console.log(err);
        triggerMenu(ctx);
        ctx.scene.leave();
    }    
});

async function translateTopic(topic, ctx) {
    await ctx.replyWithHTML(`<b>${topic}</b>`);
    ctx.wizard.state.data.topic = topic;
    await ctx.reply('Введите вопрос:', Markup.keyboard(
            ['Отмена']
        ).resize())
    return await ctx.wizard.next();
}

const next = new Composer();
next.hears('topic1', (ctx) => {
    translateTopic('topic1', ctx);
});

next.hears('topic2', (ctx) => {
    translateTopic('topic2', ctx);
});

next.hears('topic3', (ctx) => {
    translateTopic('topic3', ctx);
});

next.hears('topic4', async (ctx) => {
    translateTopic('topic4', ctx);
});

next.hears('Отмена', (ctx) => {
    ctx.deleteMessage()
    ctx.scene.leave();
    greeting(ctx)
})

const issue = new Composer();
issue.hears('Отмена', ctx => {
    ctx.scene.leave();
    greeting(ctx);
})
issue.on('text', async (ctx) => {
    await ctx.reply('❤️', mainMenu);    
    ctx.wizard.state.data.body = ctx.message.text;
    await ctx.telegram.sendMessage('-871182787', `
        <b>${ctx.wizard.state.data.topic}</b>
      
${ctx.wizard.state.data.body}
        `, {parse_mode: "HTML"});
    return await ctx.scene.leave();
});

const wizardScene = new Scenes.WizardScene('sceneWithPoll', topic, next, issue);

const stage = new Scenes.Stage([wizardScene]);
bot.use(session());
bot.use(stage.middleware());


bot.action('idea', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('sceneWithPoll');
});

function applyBachup() {
    let tempData = fs.readFileSync('test.txt', 'utf8').split(',');
    tempData.forEach(id => {
        if(id) {
            userData.push(Number(id));
        }
    })
}

bot.hears('У меня есть идея', (ctx) => {
    ctx.deleteMessage();
    ctx.scene.enter('sceneWithPoll');
})

applyBachup()
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));