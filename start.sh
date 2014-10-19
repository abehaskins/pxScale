echo "Running redis..."
redis-server &
echo "Running Scale Worker..."
nodejs scale-worker.js prod &
echo "Running Web..."
nodejs web.js prod
