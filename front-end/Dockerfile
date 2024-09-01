FROM docker.io/node:16-bullseye
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y wget gnupg gnupg2 \
    && apt-get update
RUN curl http://nginx.org/keys/nginx_signing.key | apt-key add -
RUN npm install -g npm@8.19.3  \
    npm install -g @angular/cli \ 
    && rm -rf ~/.npm
RUN apt-get update && \
    apt-get install -y -q nginx
ADD default /etc/nginx/sites-available

RUN mkdir /front-end
COPY src /front-end/src
COPY package.json *.json /front-end/
WORKDIR /front-end
RUN npm i -f
RUN npm run build-dev
EXPOSE 443 80
CMD ["nginx", "-g", "daemon off;"]