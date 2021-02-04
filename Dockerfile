FROM node:14-alpine

ENV URL
ENV TOKEN

WORKDIR /usr/app

COPY . .

RUN npm install

EXPOSE 80

CMD ["node", "index.js"]
