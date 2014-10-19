var request = require('request'),
	express = require('express'),
	socket = require('./socket'),
	Q = require('q'),
	colors = require('colors'),
	redis = require("redis"),
	Firebase = require("firebase"),
	secrets = require("./secrets"),
	config = require(['.', 'config', process.argv[2]].join('/'));

var app = express(),
	workers = {},
	pendingJobs = {},
	client = redis.createClient(),
	rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
	statusRef = rootRef.child('status/web'),
	completedLogRef = rootRef.child('log/completed'),
	failedLogRef = rootRef.child('log/failed'),
	server = socket.Server("127.0.0.1", config.work_port);
	
function processIncomingSocketData (rData) {
	var job = JSON.parse(rData);

	if (!pendingJobs[job.id] || !pendingJobs[job.id].res) return;

	var res = pendingJobs[job.id].res,
		url = pendingJobs[job.id].url,
		scale = pendingJobs[job.id].scale,
		link;

	if (job.status == "complete") {
		console.log(["Job ID:", job.id, "-", job.status].join(' ').green);
		
		link = job.link;
		completedLogRef.push({
			original: url,
			output: job.link,
			time: Firebase.ServerValue.TIMESTAMP
		});
	}

	if (job.status == "error") {
		console.log(["Job ID:", job.id, "-", job.status].join(' ').red);
		console.error(job.error.red);
		
		link = "/static/errors/pxscale-error-" + job.error + ".fw.png";
		failedLogRef.push({
			original: url,
			error: job.error,
			time: Firebase.ServerValue.TIMESTAMP
		});
	}

	client.set(url + scale, link);
	res.redirect(301, link);
	delete pendingJobs[job.id];
}

function initializeWebServer() {
	
	app.get(/\/([^/]+)\/(.+)/, function (req, res) {
		
		var scale = Number(req.params[0].replace('x', '')),
			scaleWorkerId = Math.floor(workers["scale"].length*Math.random()),
			jobID = getUniqueID(),
			job = {
				type: 'job',
				url: req.params[1].replace(/https?:\/\/?/, 'http://'), 
				scale: scale, 
				id: jobID
			},
			noCache = req.query.no_cache || config.no_cache;

		if (job.url.slice(0, 7) !== 'http://') {
			job.url = "http://" + job.url;
		}
			
	    client.get(job.url + job.scale + (noCache? '???' : ''), function (err, link) {
	    	if (link) {
	    		job.status = "auto_complete";
	    		console.log(["Job ID:", job.id, "-", job.status].join(' ').cyan);
	    		res.redirect(302, link);
	    		return;
	    	}

			workers["scale"][scaleWorkerId].say(job);
			pendingJobs[jobID] = {res: res, url: job.url, scale: scale};
	    })
	});

	app.listen(config.http_port);
	
	console.log("Web ready!".rainbow);
}

function getUniqueID() {
	return Math.random().toString().replace('.', '');
}

rootRef.authWithCustomToken(secrets.FIREBASE_TOKEN, function (err) {
	if (err) throw err;
	statusRef.set("online");
	statusRef.onDisconnect().set("offline");

	initializeWebServer();
});

// Watch for new worker connections
server.on("connection", function (socket) {
	var worker = socket;

	worker.id = getUniqueID();
	
	worker.say = (function (obj) {
		this.write(JSON.stringify(obj));
	}).bind(worker);
	
	worker.say({
		type: 'handshake',
		id: worker.id
	});
	
	worker.once("data", function (rData) {
		var data = JSON.parse(rData);
		
		(workers[data.profession] || (workers[data.profession] = []))
			.push(worker);
		
		worker.on("data", function () {	
			console.log('got some data from worker #' + worker.id)
			processIncomingSocketData.apply(this, Array.prototype.slice.call(arguments));
		});
	});
});