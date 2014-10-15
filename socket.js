var net = require('net'),
	Q = require('q'),
	colors = require('colors');

exports.Server = function (hostname, port) {
	var server;

	server = net.createServer();
	server.listen(port, hostname);

	return server;
};
 
exports.Client = function (hostname, port) {
	var client = new net.Socket(),
		deferred = Q.defer(),
		connected = false;

	var connect = function() {
		client.connect(port, hostname);
	};

	var tryConnect = function () {
		if (!connected) {
			setTimeout(function () {
				connect();
			}, 100);
		}
	};

	client.on("connect", function() {
		console.log("Connection established!".bgGreen);
		deferred.resolve(client);
		connected = true;
	});

	client.on('error', function () {
		// pass
	});
	 
	client.on('close', function() {
		if (connected)
			console.log('Connection closed'.bgRed);
		connected = false;
		tryConnect();
	});

	client.say = function (obj) {
		client.write(JSON.stringify(obj));
	}

	tryConnect();

	return deferred.promise;
};