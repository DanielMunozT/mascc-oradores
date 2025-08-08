FROM nginx:alpine

# Remove the default config and add our own listening on 8080
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy your static site (adjust path if your built files live in /dist or /public)
COPY . /usr/share/nginx/html

