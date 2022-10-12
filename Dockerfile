FROM node:16-alpine3.15 as base

WORKDIR /usr/src/app

ENV TELEGRAM_TOKEN 5602270087:AAFiIW7i9Cyh-edYsi9uFRmTSWeYt5HGWGk
ENV DB_PASS g80YRYt2L4f0YJ8s
ENV DB mongodb+srv://root:g80YRYt2L4f0YJ8s@cluster0.w9hajdm.mongodb.net/nestjs?retryWrites=true&w=majority
ENV TELEGRAM_API_ID 10237942
ENV TELEGRAM_API_HASH f9e4d589038d96fc0e01a09996d07c3c

RUN mkdir ./raw

COPY package*.json ./raw

RUN cd ./raw \
    && npm install --force

COPY . ./raw

RUN cd ./raw \
    && npm run build / \
    && cd .. \
    && mv ./raw/dist .

RUN rm -r raw

ENTRYPOINT ["node"]

CMD ["dist/main.js"]