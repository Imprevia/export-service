FROM node:18 AS build

RUN npm config set https-proxy http://192.168.56.1:7890

WORKDIR /app

COPY ./package.json /app
COPY ./package-lock.json /app
COPY ./tsconfig.json /app
COPY ./.editorconfig /app
COPY ./.eslintrc.json /app
COPY ./.prettierrc.js /app
COPY ./bootstrap.js /app
COPY ./src /app/src

RUN npm install

RUN npm run build

FROM node:18 AS chrome-stable

WORKDIR /app

COPY ./build/google-chrome-stable_current_amd64.deb /app/google-chrome-stable_current_amd64.deb

RUN apt-get update && apt-get install -y fonts-liberation libasound2 fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf \
    libatk-bridge2.0-0 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxss1 libxtst6 lsb-release xdg-utils libu2f-udev libvulkan1
RUN dpkg -i /app/google-chrome-stable_current_amd64.deb

RUN rm -rf /var/lib/apt/lists/*

FROM chrome-stable

RUN npm config set https-proxy http://192.168.56.1:7890

WORKDIR /app

COPY --from=build /app/dist ./dist
# 把源代码复制过去， 以便报错能报对行
COPY --from=build /app/src ./src
COPY --from=build /app/bootstrap.js ./
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./

ENV TZ="Asia/Shanghai"

RUN npm install --production

# 如果端口更换，这边可以更新一下
EXPOSE 7001

CMD ["npm", "run", "start"]

