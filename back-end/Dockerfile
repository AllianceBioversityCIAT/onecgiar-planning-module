FROM docker.io/node:20-bullseye
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y wget gnupg gnupg2
RUN mkdir /back-end
COPY src /back-end/src
COPY .env nest-cli.json   *.json  /back-end/
WORKDIR /back-end
RUN npm i
RUN npm run build

CMD ["node", "--max-old-space-size=4096", "dist/main"]
