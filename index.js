const { Telegraf, Markup, Composer, Scenes, session, optional } = require('telegraf');
const schedule = require('node-schedule');
const text = require('./text')
let fs = require('fs')
require('dotenv').config();

const ideasChatId = '-1001845680138';
const organizerChatId = '-1001734152875';

const bot = new Telegraf(process.env.BOT_TOKEN);

const mainMenu = Markup.keyboard(
    [['Чат участников', 'Программа встречи'],
    ['Вопрос эксперту', 'Вопрос организаторам'],
    ['У меня есть идея']]
).resize();

let hearingState = false;
let userData = [];

async function alertFeedback() {
    userData.forEach(async (id) => {
        await bot.telegram.sendMessage(id, text.feedback);
        hearingState = true;
    })
}

const feedbackStartTime = new Date(2022, 11, 18, 14, 00, 0);
const feedbackStartJob = schedule.scheduleJob(feedbackStartTime, () => {
    alertFeedback();
});

const feedbackEndTime = new Date(2022, 11, 25, 14, 00, 0);
const feedbackEndJob = schedule.scheduleJob(feedbackEndTime, () => {
    hearingState = false;
})

function addData(id) {
    if(userData.indexOf(id) === -1) {
        userData.push(id);
    } else {
        return
    }
    fs.writeFile('data.txt', transformData(), err => {if(err){throw err}})
}

bot.command('info', async (ctx) => {
    if(ctx.chat.id == organizerChatId){
ctx.reply(`
/feedbackon - включить режим прослушивания отзывов
/feedbackoff - отключить режим прослушивания отзывов
/nullify - очистить список участников
/alert - меню оповещений`)
    }
})

bot.command('feedbackon', (ctx) => {
    if(ctx.chat.id == organizerChatId) {
        alertFeedback();
    }   
})

bot.command('feedbackoff', (ctx) => {
    if(ctx.chat.id == organizerChatId) {
        hearingState = false
    }    
})

bot.command('nullify', (ctx) => {
    if(ctx.chat.id == ideasChatId) {
        fs.writeFile('data.txt', '', (err) => {if(err){throw err}})
        userData = [];
    }
    
})

bot.command('quit', (ctx) => {
    userData = userData.filter(item => item !== ctx.message.from.id);
    fs.writeFile('data.txt', transformData(), err => {if(err){throw err}})
})

function transformData() {
    return userData.toString()
}

bot.command('testmsg', (ctx) => {
    try {
        if(userData.length !== 0 && ctx.chat.id == ideasChatId) {
            userData.forEach(id => {
                bot.telegram.sendMessage(id, 'working')
            })
        } 
    } catch(err) {
        console.log(err)
    }    
})

async function greeting(ctx) {
    try {
        await ctx.reply(text.greeting, mainMenu)         
    } catch(err) {
        console.log(err)
    }  
}

async function returnal(ctx) {
    try {
        await ctx.reply(text.return, mainMenu)
    } catch(err) {
        console.log(err)
    }    
}

bot.start(async (ctx) => {
    try {
        await greeting(ctx);
        addData(ctx.message.from.id)
    } catch(err) {
        console.log(err)
    }      
});

bot.hears('Чат участников', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.replyWithHTML('<a href="https://t.me/+UqOrXyzSEcQ4OTc0">Ссылка на чат</a>')
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    }    
})

bot.hears('Программа встречи', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.replyWithPhoto({source: './images/1.jpg'}); 
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    }    
})

bot.command('newcontent', async (ctx) => {
    try {
        if(ctx.chat.id == organizerChatId){
            alertContent(ctx);
        }
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    }

})

bot.command('alert', async (ctx) => {
    if(ctx.chat.id == organizerChatId){
        try {
            await ctx.replyWithHTML('Какое сообщение отправить, шеф?', Markup.inlineKeyboard([
                [Markup.button.callback('Раунд 1', 'option1'), Markup.button.callback('Раунд 2', 'option2')],
                [Markup.button.callback('Раунд 3', 'option3'), Markup.button.callback('Раунд 4', 'option4')]
            ]))
        } catch(err) {
            console.log(err);
            await ctx.reply(text.error)
        }
    }
})

bot.action('option1', async (ctx) => {
    await ctx.answerCbQuery();
    userData.forEach(async (id) => {
        await ctx.telegram.sendMessage(id, text.game[0], {parse_mode: "HTML"})
    })
})

bot.action('option2', async (ctx) => {
    await ctx.answerCbQuery();
    userData.forEach(async (id) => {
        await ctx.telegram.sendMessage(id, text.game[1], {parse_mode: "HTML"})
    })
})

bot.action('option3', async (ctx) => {
    await ctx.answerCbQuery();
    userData.forEach(async (id) => {
        await ctx.telegram.sendMessage(id, text.game[2], {parse_mode: "HTML"})
    })
})

bot.action('option4', async (ctx) => {
    await ctx.answerCbQuery();
    userData.forEach(async (id) => {
        await ctx.telegram.sendMessage(id, text.game[3], {parse_mode: "HTML"})
    })
})

function alertContent(ctx) {
    userData.forEach(id => {
        ctx.telegram.sendMessage(id, text.content, Markup.inlineKeyboard([
            [Markup.button.url('Чат участников', 'https://t.me/+UqOrXyzSEcQ4OTc0')]
        ]))
    })
}

// *** Scene ***

const topic = new Composer();
topic.on('text', async (ctx) => {
    try {
        ctx.wizard.state.data = {};
        await ctx.replyWithHTML(text.topic, Markup.keyboard([
            ['#1 Мотивация волонтёров', '#2 Коллаборации городских проектов'],
            ['#3 Локации – места притяжения горожан', '#4 Поиск новых волонтёров'],
            ['Вернуться в меню']
        ]).resize());
        return await ctx.wizard.next();
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
        ctx.scene.leave();
    }    
});

async function translateTopic(topic, ctx) {
    try {
        await ctx.replyWithHTML(`<b>${topic}</b>`);
        ctx.wizard.state.data.topic = topic;
        await ctx.reply(text.question, Markup.keyboard(
                ['Вернуться в меню']
            ).resize())
        return await ctx.wizard.next();
    } catch(err) {
        console.log(err)
    }
}

const next = new Composer();
next.hears('#1 Мотивация волонтёров', (ctx) => {
    translateTopic('Тема #1: Как мотивировать волонтёров к активному участию в добровольческой деятельности?', ctx);
});

next.hears('#2 Коллаборации городских проектов', (ctx) => {
    translateTopic('Тема #2: Какие коллаборации можно запустить среди уже существующих городских проектов Нижнего Новгорода?', ctx);
});

next.hears('#3 Локации – места притяжения горожан', (ctx) => {
    translateTopic('Тема #3: Какие локации могут стать местом притяжения и инклюзивной средой для инициативных горожан и сообществ Нижнего Новгорода?', ctx);
});

next.hears('#4 Поиск новых волонтёров', async (ctx) => {
    translateTopic('Тема #4: Где искать новых добровольцев?', ctx);
});

next.hears('Вернуться в меню', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.scene.leave();
        returnal(ctx);
    } catch(err) {
        console.log(err)
    }    
})

const issue = new Composer();
issue.hears('Вернуться в меню', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.scene.leave();
        returnal(ctx);
    } catch(err) {
        console.log(err)
    }  
})

issue.on('text', async (ctx) => {
    try {   
        ctx.wizard.state.data.body = ctx.message.text;
        await ctx.telegram.sendMessage(ideasChatId, `
<b>${ctx.wizard.state.data.topic}</b>
          
${ctx.wizard.state.data.body}
`, {parse_mode: "HTML"}); 
    await ctx.reply(text.thankForQuestion, mainMenu);        
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    } finally {
        return await ctx.scene.leave();
    }
});

const startExpert = new Composer();
startExpert.on('text', async (ctx) => {
    try {
        await ctx.reply('Сейчас вы можете написать вопрос спикеру Песочницы', Markup.keyboard(['Вернуться в меню']).resize());
        await ctx.wizard.next();
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
        await ctx.scene.leave();
    }
});

const endExpert = new Composer();
endExpert.hears('Вернуться в меню', async (ctx) => {
    try {
        await ctx.scene.leave();
        await ctx.deleteMessage();
        returnal(ctx);
    } catch(err) {
        console.log(err)
    }
})

endExpert.on('text', async (ctx) => {
    try {
        await ctx.reply(' Спасибо, передадим эксперту!', mainMenu);
        await ctx.telegram.sendMessage(organizerChatId, `
<b>Вопрос эксперту</b>
    
${ctx.message.text}
    
<i>от ${ctx.message.from.first_name}</i>
    `, {parse_mode: "HTML"});
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    } finally {
        await ctx.scene.leave();
    }
})

const startOrganizer = new Composer();
startOrganizer.on('text', async (ctx) => {
    try {
        await ctx.reply('Какой у вас вопрос? (Например, куда мне идти)', Markup.keyboard(['Вернуться в меню']).resize());
        await ctx.wizard.next();
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
        await ctx.scene.leave();
    }
});

const endOrganizer = new Composer();
endOrganizer.hears('Вернуться в меню', async (ctx) => {
    try {
        await ctx.scene.leave();
        await ctx.deleteMessage();
        returnal(ctx);
    } catch(err) {
        console.log(err)
    }
})

endOrganizer.on('text', async (ctx) => {
    try {
        await ctx.reply('Спасибо, организаторы с вами свяжутся!', mainMenu);
        await ctx.telegram.sendMessage(organizerChatId, `
<b>Вопрос организатору</b>
    
${ctx.message.text}
    
<i>от <a href="t.me/${ctx.message.from.username}">${ctx.message.from.first_name}</a></i>
    `, {parse_mode: "HTML", disable_web_page_preview: true});
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    } finally {
        await ctx.scene.leave();
    }
})

const wizardScene = new Scenes.WizardScene('sceneWithPoll', topic, next, issue);
const expertScene = new Scenes.WizardScene('sceneExpertQuestion', startExpert, endExpert);
const organizerScene = new Scenes.WizardScene('sceneOrganizerQuestion', startOrganizer, endOrganizer);

const stage = new Scenes.Stage([wizardScene, expertScene, organizerScene]);
bot.use(session());
bot.use(stage.middleware());

function applyBackup() {
    let tempData = fs.readFileSync('data.txt', 'utf8').split(',');
    tempData.forEach(id => {
        if(id) {
            userData.push(Number(id));
        }
    })
}

bot.hears('У меня есть идея', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.scene.enter('sceneWithPoll');
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    }
})

bot.hears('Вопрос эксперту', async (ctx) => {
    try {
        await ctx.deleteMessage();
        await ctx.scene.enter('sceneExpertQuestion');
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    }
})

bot.hears('Вопрос организаторам', async (ctx) => {
    try {
        ctx.deleteMessage();
        ctx.scene.enter('sceneOrganizerQuestion');
    } catch(err) {
        console.log(err);
        await ctx.reply(text.error, mainMenu);
    }
})


bot.on('text', async (ctx) => {
    if(hearingState) {
        try {
            await ctx.telegram.sendMessage(organizerChatId, `
<b>Отзыв</b>
            
${ctx.message.text}
            
<i>от ${ctx.message.from.first_name}</i>
            `, {parse_mode: 'HTML'})
                    await ctx.reply(text.thankForFeedback, mainMenu)
                } catch(err) {
                    console.log(err);
                    await ctx.reply(text.error, mainMenu);
                }   
        } 
})

bot.on('sticker', async (ctx) => {
    if(hearingState) {
        try {
            await ctx.telegram.sendSticker(organizerChatId, ctx.message.sticker.file_id);
            await ctx.reply(text.thankForFeedback)
        } catch(err) {
            console.log(err);
            await ctx.reply(text.error, mainMenu);
        }
    }
})

bot.hears('Вернуться в меню', async (ctx) => {
    try {
        await ctx.deleteMessage();
    } catch(err) {
        console.log(err)
    } finally {
        await returnal(ctx);
    }
})

applyBackup()
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));