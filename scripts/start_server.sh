#!/bin/bash
cd /home/ssm-user/plumcommerce_old
pm2 reload plum-commerce || pm2 start src/server.js --name "plum-commerce"
