FROM alekzonder/puppeteer:latest

WORKDIR /app/
ADD index.js .
ADD conf.js .

RUN node index.js