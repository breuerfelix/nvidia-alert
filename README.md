# Telegram Nvidia Alert Bot

__Do not want to self-host it? Just use the official one! Start a Chat with `@nvidia30_alert_bot` on Telegram!__

## Motivation

I recently built a new Computer but one thing is missing... guess what, it's the Graphics Card!  
The hype around the new and cheap Nvidia RTX 30xx Founders Edition Graphics Cards is real. These are constantly out of stock or extremly overpriced when buying from resellers.  
Instead of refreshing the Nvidia Store 20x a day i decided to automate that job. Big thanks to Nvidia for not blocking requests and forcing to use proxies :) That's why i wanted to share my scraped data so others do not have to spam their website aswell!

## Usage

The following stores are currently supported:
```
de-de
fr-fr
```
Please create an Issue with a link to the store of your Language so i can test if this store is supported. Not all Nvidia stores sell the Founders Edition.

Go to Telegram and start a new Chat with `@nvidia30_alert_bot`. Type `/start` to list all available commands. Everything else should be intuitive!

## Docker

```
touch /data/db.json
docker run \
  -v /data/db.json:/usr/app/db.json \
  -e TOKEN=<telegram bot token> \
  felixbreuer/nvidia-alert:latest
```

## Manual

```
npm install
TOKEN=<telegram bot token> node index.js
```

## TODO

- [] Use webhook instead of polling
- [] Figure out which languages are available
- [] Screenshots from Telegram Bot
- [] Add other languages
