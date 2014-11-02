var express = require('express'),
	Q = require('q'),
	colors = require('colors'),
	r = require('rethinkdb'),
	fs = require('fs'),
	Firebase = require("firebase"),
	secrets = require("./config/secrets"),
	utils = require('./utils/utils'),
	Boss = require('./utils/boss').Boss,
	config;
	
try {
	config = require(['.', 'config', process.argv[2]].join('/'));
} catch (err) {
	console.log("Please specify a valid config mode".bgRed);
	process.exit(1);
}

var app = express(),
	boss = new Boss(config),
	rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
	statusRef = rootRef.child('status/web'),
	completedLogRef = rootRef.child('log/completed'),
	failedLogRef = rootRef.child('log/failed'),
	pendingRes = {},
	table = r.table("images"),
	connection;
	
r.connect({
    host: 'localhost',
    port: 28015,
    db: "pxscale_data"
}, function (err, conn) {
	connection = conn;	
});

boss.on("download", function (job, id, results) {
	// Success	
	job.fOrig = results[0];
	job.fScaled = results[1];
	delete job.results;
	
	boss.demand("scale", job, id);
	boss.demand("color", job);
}, redirectToError);

boss.on("scale", function (job, id, results) {
	// Success	
	var link = results[0],
		lookup = {url: job.url, scale: job.scale};
	
	completedLogRef.push({
		original: job.url,
		output: link,
		time: Firebase.ServerValue.TIMESTAMP
	});
	
	utils.updateImageData(lookup, {link: link}, connection, function (err, image) {
		console.log("Stored link data for", image)
	});
	
	pendingRes[id].redirect(301, link);
	// Done!
}, redirectToError);

boss.on("color", function (job, id, results) {
	console.log('yay success')
}, function (job, id, results) {
	console.log('Color error')
});

function initializeWebServer() {
	
	app.get(/\/([^/]+x)\/(.+)/, function (req, res) {
		if (req.headers.accept.indexOf("html") !== -1) {
			res.sendFile([__dirname, 'templates', 'scale.html'].join('/'));
		} else {
			var jobID = utils.getUniqueID(),
				scale = Number(req.params[0].replace('x', '')),
				job = {
					url: req.params[1].replace(/https?:\/\/?/, 'http://'), 
					scale: scale, 
					id: jobID
				},
				noCache = req.query.no_cache || config.no_cache,
				lookup;
	
			if (job.url.slice(0, 7) !== 'http://') {
				job.url = "http://" + job.url;
			}
			
			lookup = {url: job.url, scale: job.scale};
			
			if (noCache) {
				lookup.noCache = true;
			}
				
			utils.getImageData(lookup, connection, function (err, image) {
		    	if (image.link) {
		    		job.status = "auto_complete";
		    		console.log(["Job ID:", job.id, "-", job.status].join(' ').cyan);
		    		res.redirect(302, image.link);
		    		return;
		    	} else {
		    		utils.setImageData(lookup, connection, function (err, image) {
		    			console.log("Creating new entry for image", image)
		    		});
		    	}
				
				pendingRes[jobID] = res;
				boss.demand("download", job, jobID);
		    });
		}
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

