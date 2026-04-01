 GIT_SSH_COMMAND='ssh -i /home/nodejs/.ssh/id_rsa2' git pull  && npm run migrate
chmod +x update.sh
pm2 restart all