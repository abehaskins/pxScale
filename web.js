var request = require('request'),
express = require('express')
socket = require('./socket'),
Q = require('q');

var app = express(),
workers,
pendingRes = {};

var server = socket.Server("127.0.0.1", 1337)

server.on("connection", function (socket) {
	workers = socket;

	socket.say = function (obj) {
		socket.write(JSON.stringify(obj));
	};

	workers.on("data", function (rData) {
		var job = JSON.parse(rData),
		res = pendingRes[job.id];

		console.log("Job ID: " + job.id + " - " + job.status);

		if (job.status == "complete") {
			res.redirect(301, job.link); 
		}

		if (job.status == "error") {
			res.redirect(301, "/static/errors/pxscale-error-" + job.error + ".fw.png"); 
		}

		delete pendingRes[job.id];
	});
});

function initializeWebServer() {
	app.get('/', function (req, res) {
		res.send("Hello!");
	});

	app.get(/\/([^/]+)\/(.+)/, function (req, res) {
		var scale = Number(req.params[0].replace('x', '')),
		url = req.params[1],
		jobID = makeUniqueID()

		if (url.slice(0, 7) !== 'http://' && url.slice(0, 8) !== 'https://')
			url = "http://" + url;

		workers.say({url: url, scale: scale, id: jobID});
		pendingRes[jobID] = res;
	});

app.listen(3000);
}

function makeUniqueID() {
	return Math.random().toString().replace('.', '');
}

initializeWebServer();