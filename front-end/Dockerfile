FROM docker.io/node:20-bullseye
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y wget gnupg gnupg2 \
    && apt-get update
RUN curl http://nginx.org/keys/nginx_signing.key | apt-key add -
RUN npm install -g @angular/cli && \
    rm -rf ~/.npm
RUN apt-get update && \
    apt-get install -y -q nginx
ADD default /etc/nginx/sites-available

RUN mkdir /front-end
COPY package.json *.json /front-end/
WORKDIR /front-end
RUN npm install --legacy-peer-deps
COPY src /front-end/src
ENV GOMAXPROCS=1
ENV NG_BUILD_MAX_WORKERS=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npx ng build --configuration development
EXPOSE 443 80
CMD ["nginx", "-g", "daemon off;"]