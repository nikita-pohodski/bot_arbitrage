FROM node:18.12-alpine3.17

WORKDIR /app

COPY package.json /app/
COPY package-lock.json /app/
RUN npm i

COPY . /app
RUN npm run build
RUN chown -R node:node .

USER node

ENV PORT 8080

CMD npm run start:prod
