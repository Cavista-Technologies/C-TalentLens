FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

COPY package*.json ./
RUN npm ci

copy . .
RUN npm run build

from nginx:1.27-alpine AS runtime
copy nginx.conf /etc/nginx/conf.d/default.conf
copy --from=build /app/dist /usr/share/nginx/html

expose 80

CMD ["nginx", "g", "daemon off;"]