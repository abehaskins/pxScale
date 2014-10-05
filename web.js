var request = require('request'),
	express = require('express'),
	socket = require('./socket'),
	Q = require('q'),
	redis = require("redis"),
	Firebase = require("firebase"),
	secrets = require("./secrets");

var app = express(),
	workers,
	pendingJobs = {},
	client = redis.createClient(),
	rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
	statusRef = rootRef.child('status/web'),
	completedLogRef = rootRef.child('log/completed'),
	failedLogRef = rootRef.child('log/failed');

var server = socket.Server("127.0.0.1", 1337);

server.on("connection", function (socket) {
	workers = socket;

	socket.say = function (obj) {
		socket.write(JSON.stringify(obj));
	};

	workers.on("data", function (rData) {
		var job = JSON.parse(rData);

		if (!pendingJobs[job.id] || !pendingJobs[job.id].res) return;

		var res = pendingJobs[job.id].res,
			url = pendingJobs[job.id].url,
			scale = pendingJobs[job.id].scale,
			link;

		console.log("Job ID: " + job.id + " - " + job.status);

		if (job.status == "complete") {
			link = job.link;
			completedLogRef.push({
				original: url,
				output: job.link,
				time: Firebase.ServerValue.TIMESTAMP
			});
		}

		if (job.status == "error") {
			link = "/static/errors/pxscale-error-" + job.error + ".fw.png"; 
			console.log(job.error);

			failedLogRef.push({
				original: url,
				error: job.error,
				time: Firebase.ServerValue.TIMESTAMP
			});
		}

		client.set(url + scale, link);
		res.redirect(301, link);
		delete pendingJobs[job.id];
	});
});

function initializeWebServer() {
	app.get('/', function (req, res) {
		res.send("Hello!");
	});

	app.get(/\/([^/]+)\/(.+)/, function (req, res) {
		var scale = Number(req.params[0].replace('x', '')),
			jobID = makeUniqueID(),
			job = {url: req.params[1], scale: scale, id: jobID},
			noCache = req.query.noCache;
		
		job.url = job.url.replace(/https?:\/\/?/, 'http://')

		if (job.url.slice(0, 7) !== 'http://') {
			job.url = "http://" + job.url;
		}
			
	    client.get(job.url + job.scale + (noCache? '???' : ''), function (err, link) {
	    	if (link) {
	    		job.status = "auto_complete";
	    		console.log("Job ID: " + job.id + " - " + job.status);
	    		res.redirect(301, link);
	    		return;
	    	}

			workers.say(job);
			pendingJobs[jobID] = {res: res, url: job.url, scale: scale};
	    })
	});

	app.listen(3000);
	console.log("Web ready!");
}

function makeUniqueID() {
	return Math.random().toString().replace('.', '');
}

rootRef.authWithCustomToken(secrets.FIREBASE_TOKEN, function (err) {
	if (err) throw err;
	statusRef.set("online");
	statusRef.onDisconnect().set("offline");

	initializeWebServer();
});