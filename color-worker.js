var imgur = require('imgur-upload'),
	socket = require('./socket'),
	secrets = require('./secrets'),
	config = require(['.', 'config', process.argv[2]].join('/')),
	request = require('request'),
	Firebase = require('firebase'),
	gm = require('gm'),
	fs = require('fs'),
	colors = require('colors'),
	async = require('async');

var boss,
	worker = {},
	rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
	statusRef = rootRef.child('status/color-worker');
	
rootRef.authWithCustomToken(secrets.FIREBASE_TOKEN, function (err) {
	if (err) throw err;
	
	statusRef.set("online");
	statusRef.onDisconnect().set("offline");

	initializeWorker();
});

function initializeWorker() {
	console.log("Worker ready!".rainbow);
	imgur.setClientID(secrets.IMGUR_CLIENT_ID);
	
	socket.Client("127.0.0.1", config.work_port).then(function (socket) {
		boss = socket;
		boss.on('data', function(rData) {
			var data = JSON.parse(rData);
			
			if (data.type == 'handshake')
				boss.say({profession: "scale"});
			else if (data.type == 'job')
				initializeJob(data.id);
		});
	});
}

function initializeJob(id) {
	var small = {
		filename: ...,
	}
	
	gm(small.filename)
		.identify(function (err, identify) {
		  small.size = identify.size;
		}).toBuffer('ppm', function (err, bufferData) {
		  small.buffer = bufferData;
		  small.offset = (small.buffer.length) - ((small.size.width*small.size.height)*3);
		});
}