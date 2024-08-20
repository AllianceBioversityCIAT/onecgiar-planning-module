FROM docker.io/node:18-bullseye
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y wget gnupg gnupg2
RUN npm install -g npm@8.19.3 \
    && rm -rf ~/.npm
RUN mkdir /back-end
COPY src /back-end/src
COPY .env nest-cli.json   *.json  /back-end/
WORKDIR /back-end
RUN npm i
RUN npm run build

CMD ["node", "dist/main"]