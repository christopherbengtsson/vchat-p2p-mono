#!/bin/sh

# Substitute environment variables in the nginx template
envsubst '$SSL_CERTIFICATE $SSL_CERTIFICATE_KEY' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Nginx in the foreground
exec nginx -g 'daemon off;'
