echo "Running install..."
apt-get update
apt-get install wget killall
echo "deb http://download.rethinkdb.com/apt saucy main" | tee /etc/apt/sources.list.d/rethinkdb.list
wget -qO- http://download.rethinkdb.com/apt/pubkey.gpg | apt-key add -
apt-get update
apt-get install -y --force-yes rethinkdb nodejs npm
rethinkdb &
cd /src/
npm install
nodejs /src/setup.js