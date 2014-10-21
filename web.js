var express = require('express'),
	Q = require('q'),
	colors = require('colors'),
	redis = require("redis"),
	Firebase = require("firebase"),
	secrets = require("./secrets"),
	config = require(['.', 'config', process.argv[2]].join('/')),
	utils = require('./utils'),
	Boss = require('./boss').Boss;

var app = express(),
	rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
	statusRef = rootRef.child('status/web'),
	completedLogRef = rootRef.child('log/completed'),
	failedLogRef = rootRef.child('log/failed'),
	client = redis.createClient(),
	pendingRes = {};
	
var boss = new Boss();

boss.on("download", function (job, id, results) {
	// Success	
	job.fOrig = results[0];
	job.fScaled = results[1];
	delete job.results;
	
	boss.demand("scale", job, id);
}, redirectToError);

boss.on("scale", function (job, id, results) {
	// Success	
	var link = results[0];
	
	completedLogRef.push({
		original: job.url,
		output: link,
		time: Firebase.ServerValue.TIMESTAMP
	});
	
	client.set(job.url + job.scale, link);
	pendingRes[id].redirect(301, link);
	// Done!
}, redirectToError);

function initializeWebServer() {
	
	app.get(/\/([^/]+)\/(.+)/, function (req, res) {
		var jobID = utils.getUniqueID(),
			scale = Number(req.params[0].replace('x', '')),
			job = {
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
			
			pendingRes[jobID] = res;
			boss.demand("download", job, jobID);
	    })
	});

	app.listen(config.http_port);
	
	console.log("Web ready!".rainbow);
}

function redirectToError(job, id, error) {
	// Error
	var errorLink = "/static/errors/pxscale-error-" + error + ".fw.png";

	failedLogRef.push({
		original: job.url,
		error: error,
		time: Firebase.ServerValue.TIMESTAMP
	});
	
	pendingRes[id].redirect(301, errorLink);
}

rootRef.authWithCustomToken(secrets.FIREBASE_TOKEN, function (err) {
	if (err) throw err;
	statusRef.set("online");
	statusRef.onDisconnect().set("offline");

	initializeWebServer();
});

