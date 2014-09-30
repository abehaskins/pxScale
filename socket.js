var net = require('net'),
	Q = require('q');

exports.Server = function (socketName) {
	var server;

	server = net.createServer();
	server.listen(socketName);

	return server;
};
 
exports.Client = function (socketName) {
	var client = new net.Socket(),
		deferred = Q.defer();
		connected = false;

	var connect = function() {
		client.connect(socketName);
	};

	var tryConnect = function () {
		if (!connected) {
			setTimeout(function () {
				connect();
			}, 100);
		}
	};

	client.on("connect", function() {
		console.log("Connection established!");
		deferred.resolve(client);
		connected = true;
	});

	client.on('error', function () {
		// pass
	});
	 
	client.on('close', function() {
		console.log('Connection closed');
		connected = false;
		tryConnect();
	});

	client.say = function (obj) {
		client.write(JSON.stringify(obj));
	}

	tryConnect();

	return deferred.promise;
};