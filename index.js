const TelegramBot = require('node-telegram-bot-api');
const {getProducts} = require('./fetcher');
const {db} = require('./database');
const {sleep} = require('./utils');

require('dotenv').config();

const LOCALES = {
  'de-de': 'Germany',
  'fr-fr': 'France',
};

const token = process.env.TOKEN;
const url = process.env.URL;
const scheme = process.env.SCHEME || 'https';

const interval = 30;
let PRODUCTS = [];

async function fetchNew() {
  const freshProducts = await getProducts(LOCALES);
  const old = [...PRODUCTS];
  PRODUCTS = [...freshProducts];
  for (prod of PRODUCTS) {
    const id = prod.productID;
    const found = db.get('products').find({id}).value();
    if (found != undefined) continue;
    db.get('products').push({id, users: []}).write();
  }

  return old;
}

async function loop(bot) {
  while (true) {
    await sleep(interval);
    let oldProducts = [];

    try {
      oldProducts = await fetchNew();
    } catch (e) {
      console.log('Exception in fetching:', e)
      continue
    }

    for (const old of oldProducts) {
      const newOne = PRODUCTS.find(prd => prd.productID == old.productID);
      if (old.prdStatus == newOne.prdStatus) continue;

      const product = db.get('products').find({id: newOne.productID}).value();
      const {locale, websiteLink, displayName, prdStatus} = newOne;

      for (const user of product.users) {
        const message = `
UPDATE: ${LOCALES[locale]} - ${displayName}
New Status: ${prdStatus}
Link to the store: ${websiteLink}
        `;

        bot.sendMessage(user, message);
      }
    }
  }
}

async function start() {
  await fetchNew();

  console.log('initial fetching done, starting...')
  const bot = startTelegram();
  loop(bot);
}

function localeCallback(bot, callbackData, chat_id, message_id) {
  const {locale} = callbackData;
  const oldOptions = {message_id, chat_id};
  // edit current message
  bot.editMessageText(
    `Locale choosen: ${LOCALES[locale]}`, oldOptions
  );

  // display new message with inline keyboard
  const message = 'Choose a Graphics Card to watch:';
  const inline_keyboard = PRODUCTS
    .filter(prd => prd.locale == locale)
    .map(({displayName, productID}) => (
      [{
        text: displayName,
        callback_data: JSON.stringify(
          {action: 'watch', productID},
        ),
      }]
    ));

  const opts = {reply_markup: {inline_keyboard}};
  bot.sendMessage(chat_id, message, opts);
}

function watchCallback(bot, callbackData, chat_id, message_id) {
  const {productID} = callbackData;
  const opts = {message_id, chat_id};

  const product = PRODUCTS.find(x => x.productID == productID);
  // clear old message
  bot.editMessageText(
    `Graphics Card choosen: ${product.displayName}`, opts
  );

  // compat for old code
  const id = chat_id;

  const res = db.get('users').find({id}).value();
  if (res == undefined) {
    db.get('users').push({id, products: []}).write();
  }

  const user = db.get('users').find({id}).value();
  if (user.products.includes(productID)) {
    bot.sendMessage(id, 'You are already watching this Card!');
    return;
  }

  user.products.push(productID);
  db.get('users').set('products', user.products).write();
  const prod = db.get('products').find({id: productID}).value();
  prod.users.push(id);
  db.get('products').find({id}).update('users', prod.users).write();
}

function removeCallback(bot, callbackData, chat_id, message_id) {
  const {productID} = callbackData;
  const user = db.get('users').find({id: chat_id}).value();
  user.products = user.products.filter(id => id != productID);
  db.get('users')
    .find({id: chat_id})
    .set('products', user.products)
    .write();

  const product = db.get('products').find({id: productID}).value();
  product.users = product.users.filter(id => id != chat_id);
  db.get('products')
    .find({id: productID})
    .set('users', product.users)
    .write();

  const productDetails = PRODUCTS.find(x => x.productID == productID);
  const opts = {message_id, chat_id};
  bot.editMessageText(
    `Graphics Card removed: ${LOCALES[productDetails.locale]} - ${productDetails.displayName}`,
    opts
  );
}

function startTelegram() {
  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TelegramBot(token, {polling: !url});
  if (url) bot.setWebHook(`${scheme}://${url}`);

  bot.onText(/\/start/, msg => {
    const message = `
/start - May or may not help you.
/status - Get the Status of all your watching Cards
/watch - Register a new Graphics Card watcher.
/remove - Unregister a Graphics Card watcher.
`;

    bot.sendMessage(msg.chat.id, message);
  });

  bot.onText(/\/status/, msg => {
    const user = db.get('users').find({id: msg.chat.id}).value();
    if (user == undefined || user.products.length == 0) {
      bot.sendMessage(msg.chat.id, 'You currently do not watch any Card.');
      return;
    }

    const message = PRODUCTS
      .filter(prd => user.products.includes(prd.productID))
      .map(prd => `${LOCALES[prd.locale]} - ${prd.displayName}:\nCurrent Status: ${prd.prdStatus}\n`)
      .join('');

    const header = 'You are currently watching:\n';
    bot.sendMessage(msg.chat.id, header + message);
  });

  bot.onText(/\/watch/, msg => {
    const message = 'Choose your Country:';
    const inline_keyboard = Object.keys(LOCALES).map(key => (
      [{
        text: LOCALES[key],
        callback_data: JSON.stringify(
          {action: 'locale', locale: key},
        ),
      },]
    ));

    const opts = {reply_markup: {inline_keyboard}};
    bot.sendMessage(msg.chat.id, message, opts);
  });

  bot.onText(/\/remove/, msg => {
    const res = db.get('users').find({id: msg.chat.id}).value();
    if (res == undefined || res.products.length == 0) {
      bot.sendMessage(
        msg.chat.id, 'You currently do not watch any Card.'
      );
      return;
    }

    const message = 'Choose a Card to remove:';
    const inline_keyboard = res.products
      .map(productID => {
        // TODO handle error here
        const {locale, displayName} =
          PRODUCTS.find(x => x.productID == productID);

        return {productID, displayName, locale};
      })
      .map(({productID, displayName, locale}) => (
        [{
          text: `${LOCALES[locale]} - ${displayName}`,
          callback_data: JSON.stringify(
            {action: 'remove', productID},
          ),
        }]
      ));

    const opts = {reply_markup: {inline_keyboard}};
    bot.sendMessage(msg.chat.id, message, opts);
  });

  bot.on('callback_query', async callbackQuery => {
    const {
      data,
      message: {
        message_id,
        chat: {id},
      },
    } = callbackQuery;

    const callbackData = JSON.parse(data);

    switch (callbackData.action) {
      case 'watch':
        watchCallback(bot, callbackData, id, message_id);
        break;
      case 'locale':
        localeCallback(bot, callbackData, id, message_id);
        break;
      case 'remove':
        removeCallback(bot, callbackData, id, message_id);
        break;
    }
  });

  return bot;
}

start();
