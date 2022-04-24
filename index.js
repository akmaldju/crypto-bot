require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');
const TeleBot = require('telebot');
const bot = new TeleBot({
    token: process.env['TELEGRAM_API_TOKEN'],
    usePlugins: ['askUser']
});

// bot.on('text', (msg) => msg.reply.text(msg.text));
bot.on(['/start', '/hello'], (msg) => msg.reply.text('Welcome to my cryptocurrency trading helper!'));

bot.on(['/subscribeBtc'], (msg) => {
    const id = msg.from.id;

    setInterval(async () => {
        const response = await getTokenPrice('bitcoin');

        msg.reply.text(response.err_msg || `Current Bitcon price is: ${formatPrice(response.data.market_data.current_price.usd)}`);
    }, 1000 * 60 * 60);

    return;
});

bot.on(['/price'], async (msg) => {
    const formatted_msg = msg.text.split(' ')[1]?.toLowerCase();
    const id = msg.from.id;
    // console.warn(formatted_msg);

    if (!formatted_msg) {
        return bot.sendMessage(id, 'Which token would you like to me check?', { ask: 'token_price' });
    }

    const response = await getTokenPrice(formatted_msg);

    // console.log(response);
    return msg.reply.text(response.err_msg || formatPrice(response.data.market_data.current_price.usd));
});

bot.on('ask.token_price', async (msg) => {
    const token = msg.text.toLowerCase();
    const response = await getTokenPrice(token);

    return msg.reply.text(response.err_msg || formatPrice(response.data.market_data.current_price.usd));
});

bot.on(['/research'], async (msg) => {
    const formatted_msg = msg.text.split(' ')[1]?.toLowerCase();
    const id = msg.from.id;
    // console.warn(formatted_msg);

    if (!formatted_msg) {
        return bot.sendMessage(id, 'Which token would you like to me check?', { ask: 'token_info' });
    }

    const response = await getTokenInfo(formatted_msg);

    if (response.err_msg) return msg.reply.text(response.err_msg);

    // console.log(response);
    await msg.reply.photo(response.data.image?.large);
    await msg.reply.text(response.data.description?.en);
    await msg.reply.text(response.err_msg || formatTokenInfo(response));
    await msg.reply.text(formatTokenSocials(response));

    return;
});

bot.on('ask.token_info', async (msg) => {
    const token = msg.text.toLowerCase();
    const response = await getTokenInfo(token);

    if (response.err_msg) return msg.reply.text(response.err_msg);

    await msg.reply.photo(response.data.image?.large);
    await msg.reply.text(response.data.description?.en);
    await msg.reply.text(formatTokenInfo(response));
    await msg.reply.text(formatTokenSocials(response));
    return;
});

bot.on(['/contract'], async (msg) => {
    const formatted_msg = msg.text.split(' ')[1]?.toLowerCase();
    const id = msg.from.id;
    // console.warn(formatted_msg);

    if (!formatted_msg) {
        return bot.sendMessage(id, 'Which token would you like to me check?', { ask: 'contract' });
    }

    const response = await getTokenInfo(formatted_msg);

    // console.log(response);
    return msg.reply.text(response.err_msg || response.data.contract_address);
});

bot.on('ask.contract', async (msg) => {
    const token = msg.text.toLowerCase();
    const response = await getTokenInfo(token);

    return msg.reply.text(response.err_msg || response.data.contract_address);
});

// bot.on(/(show\s)?kitty*/, (msg) => {
//     return msg.reply.photo('http://thecatapi.com/api/images/get');
// });

// bot.on(/^\/say (.+)$/, (msg, props) => {
//     const text = props.match[1];
//     return bot.sendMessage(msg.from.id, text, { replyToMessage: msg.message_id });
// });

// bot.on('edit', (msg) => {
//     return msg.reply.text('I saw it! You edited message!', { asReply: true });
// });

bot.start();

const formatPrice = (price) => {
    return price && `$${price.toLocaleString()}`;
}

const formatPercentage = (value) => {
    return `${value?.toFixed(2).toLocaleString()}%`;
}

const formatDate = (date_obj) => {
    return `${date_obj?.split('T')[0].toString()}`;
}

const formatTokenInfo = (token_obj) => {
    const data = token_obj.data;
    return `
Name: ${data.name}
Symbol: ${data.symbol.toUpperCase()}
Contract Address: ${data.contract_address}
Rank: ${data.market_cap_rank}\n
Price: ${formatPrice(data.market_data.current_price.usd)}
Circulating Supply: ${data.market_data.circulating_supply?.toLocaleString()}
Max Supply: ${data.market_data.max_supply?.toLocaleString()}
Market Cap: ${formatPrice(data.market_data.market_cap?.usd)}
FDV: ${formatPrice(data.market_data.fully_diluted_valuation?.usd)}\n
ATH: ${formatPrice(data.market_data.ath.usd)}
ATH Date: ${formatDate(data.market_data.ath_date.usd)}
ATL: ${formatPrice(data.market_data.atl.usd)}
ATL Date: ${formatDate(data.market_data.atl_date.usd)}
Genesis Date: ${data.genesis_date}\n
Price Change (1d): ${formatPercentage(data.market_data.price_change_percentage_24h)}
Price Change (1w): ${formatPercentage(data.market_data.price_change_percentage_7d)}
Price Change(1M): ${formatPercentage(data.market_data.price_change_percentage_30d)}
Price Change(1Y): ${formatPercentage(data.market_data.price_change_percentage_1y)}
    `;
}

const formatTokenSocials = (token_obj) => {
    const data = token_obj.data;
    return `
Homepage: ${data.links.homepage[0]}
Chat: ${data.links.chat_url[0]}
Announcements: ${data.links.announcement_url[0]}
Twitter:  https://twitter.com/${data.links.twitter_screen_name}
Facebook: https://www.facebook.com/groups/${data.links.facebook_username}
Telegram: https://t.me/${data.links.telegram_channel_identifier}
Reddit: ${data.links.subreddit_url}
Github: ${data.links.repos_url.github[0]}
    `;
}

const getTokenPrice = async (token) => {
    let response = '';

    try {
        response = await axios({
            'method': 'GET',
            'url': `https://api.coingecko.com/api/v3/coins/${token}`,
            'headers': {
                'content-type': 'application/json',
            },
            'params': {
                'localization': 'false',
            },
        });
    } catch (error) {
        return { err_msg: 'This token was not found.' };
    }

    return response;
}

const getTokenInfo = async (token) => {
    let response = '';

    try {
        response = await axios({
            'method': 'GET',
            'url': `https://api.coingecko.com/api/v3/coins/${token}`,
            'headers': {
                'content-type': 'application/json',
            },
            'params': {
                'localization': 'false',
            },
        });
    } catch (error) {
        return { err_msg: 'This token was not found.' };
    }

    return response;
}