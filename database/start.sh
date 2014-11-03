echo "Running rethinkdb..."
rethinkdb --bind all &
echo "Running HTTP interface..."
nodejs interface.js