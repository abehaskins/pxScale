echo "Running redis..."
redis-server &
echo "Running Worker..."
nodejs worker.js &
echo "Running Web..."
nodejs web.js
