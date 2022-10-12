FROM node:16-alpine3.15 as base

ENV NODE_ENV development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm run build:min

FROM node:16-alpine3.15

ENV NODE_ENV production
ENV TELEGRAM_TOKEN 5602270087:AAFiIW7i9Cyh-edYsi9uFRmTSWeYt5HGWGk
ENV DB_PASS g80YRYt2L4f0YJ8s
ENV DB mongodb+srv://root:g80YRYt2L4f0YJ8s@cluster0.w9hajdm.mongodb.net/nestjs?retryWrites=true&w=majority
ENV TELEGRAM_API_ID 10237942
ENV TELEGRAM_API_HASH f9e4d589038d96fc0e01a09996d07c3c

WORKDIR /usr/src/app

COPY --from=base /usr/src/app/index.js /usr/src/app

ENTRYPOINT ["node"]

CMD ["index.js"]