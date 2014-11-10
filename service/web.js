var express = require('express'),
	Q = require('q'),
	colors = require('colors'),
	Db = require('./utils/db').Db,
	fs = require('fs'),
	Firebase = require("firebase"),
	secrets = require("./config/secrets"),
	utils = require('./utils/utils'),
	Boss = require('./utils/boss').Boss,
	devMode = process.argv[2],
	config;
	
try {
	config = require(['.', 'config', devMode].join('/'));
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
	db = Db(config),
	pendingRes = {};
	
db.setTable("redirects");

boss.on("download", function (job, id, results) {
	// Success	
	job.fOrig = results[0];
	job.fScaled = results[1];
	delete job.results;
	
	boss.demand("scale", job, id);
	boss.demand("color", job);
	boss.demand("one-to-one", job);
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
	
	db.updateImageData(lookup, {link: link}, function (err, image) {
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
	app.get('/env.js', function (req, res) {
		if (devMode == "dev")
			res.sendFile([__dirname, 'config/frontend-dev.js'].join('/'));
		else if (devMode == "prod")
			res.sendFile([__dirname, 'config/frontend-prod.js'].join('/'));
	});
	
	app.get(/info\/(.+)/, function (req, res) {
		res.sendFile([__dirname, 'templates', 'info.html'].join('/'));
	})
	
	app.get(/\/([^/]+)x\/(.+)/, function (req, res) {
		var jobID = utils.getUniqueID(),
			scale = Number(req.params[0]),
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
			
		console.log(lookup)
		db.getImageData(lookup, function (err, image) {
	    	if (image.link) {
	    		job.status = "auto_complete";
	    		console.log(["Job ID:", job.id, "-", job.status].join(' ').cyan);
	    		res.redirect(302, image.link);
	    		return;
	    	} else {
	    		delete lookup.noCache;
	    		db.setImageData(lookup, function (err, image) {
	    			console.log("Creating new entry for image", image)
	    		});
	    	}
			
			pendingRes[jobID] = res;
			boss.demand("download", job, jobID);
	    });
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

