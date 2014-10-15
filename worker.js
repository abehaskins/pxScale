var imgur = require('imgur-upload'),
	socket = require('./socket'),
	secrets = require('./secrets'),
	request = require('request'),
	Firebase = require('firebase'),
	gm = require('gm'),
	fs = require('fs'),
	colors = require('colors'),
	async = require('async');

var boss,
	rootRef = new Firebase('bucket.firebaseio.com/pxScale'),
	statusRef = rootRef.child('status/worker');
	
rootRef.authWithCustomToken(secrets.FIREBASE_TOKEN, function (err) {
	if (err) throw err;
	
	statusRef.set("online");
	statusRef.onDisconnect().set("offline");

	initializeWorker();
});

function initializeWorker() {
	console.log("Worker ready!".rainbow);
	imgur.setClientID(secrets.IMGUR_CLIENT_ID);
	
	socket.Client("127.0.0.1", 1337).then(function (socket) {
		boss = socket;
		boss.on('data', function(rData) {
			var data = JSON.parse(rData);
			initializeJob(data.id, data.url, data.scale);
		});
	});
}

// Each job from the boss comes to this function and is then verfied and processed
function initializeJob(id, url, scale) {
	console.log(["Job ID:", id, url, scale].join(' ').green);
	
	async.waterfall([
		verifyJob.bind(this, id, url),
		processJob.bind(this, url, scale)
	], function (err, link) {
		if (err) {
			boss.say({
				id: id,
				status: 'error',
				error: err.error
			});	
			
			if (err.files)
				cleanUp(err.files);
		} else {
    		boss.say({
    			id: id, 
    			status: "complete", 
    			link: link
    		});
		}
	});
}

// Verfying the job consists of checking the URL extension and generating valid
// temp file names.
function verifyJob(id, url, callback) {
	async.waterfall([
		verifyURLExtension.bind(this, url),
		getTemporaryFilenames.bind(this, id)
	], function (err, fOrig, fScaled) {
		if (err) {
			callback({error: err, files: []}, null);
		} else {
			callback(null, fOrig, fScaled);
		}
	});
}

// Processing the job consists of downloading the image, transforming it, and
// re-uploading.
function processJob(url, scale, fOrig, fScaled, callback) {
	async.waterfall([
		downloadImageAtURL.bind(this, url, fOrig),
		transformImage.bind(this, fOrig, fScaled, scale),
		uploadTransformedImage.bind(this, fScaled)
	], function (err, link) {
		if (err) {
			callback({error: err, files: [fOrig, fScaled]}, null);
		} else {
			cleanUp([fOrig, fScaled]);
			callback(null, link);
		}
	});	
}

// Check that we have something, .png, .bat, etc. Literally any extension.
function verifyURLExtension(url, callback) {
	var ext = url.slice(url.search(/\.([^\.]+)$/), url.length);
	
	if (ext.indexOf("/") !== -1) {
		callback("no_extension");
	} else {
		callback(null, ext);
	}
}

// Get our fOrig and fScaled (local file paths used for work)
function getTemporaryFilenames(id, ext, callback) {
	// Create temporary download names like 293812.jpg and 1212312_scaled.jpg
	var fOrig = id + ext,
		fScaled = id + '_scaled' + ext;

	callback(null, fOrig, fScaled);
}

// Download the Image provided
function downloadImageAtURL(url, fOrig, callback) {
	var wstream = fs.createWriteStream(fOrig),
		done;

	// Watch for any issues writing to the hard drive
	wstream.on("error", function () {
		req.abort();
		callback('writing_failed')
	});


	// Make out HTTP request
	var req = request({url: url}, function (err, res) {
		if (err) return callback('download_failed');
		else callback(null);
		done = true;
	});
	
	// Pipe the response from the HTTP request to our write stream
	req.pipe(wstream);

	// Watch for any errors while downloading
	req.on('error', function () {
		callback('download_failed');
	});
	
	// Set up a timeout for the HTTP download request
	setTimeout(function () {
		if (done) return;
		
		req.abort();
		callback('download_failed');
	}, 10e3);
}

// Transform the image we've downloaded
function transformImage(fOrig, fScaled, scale, callback) {
	var image = gm(fOrig);
	
	// Open the image, get some stats, then resize the image.
	image.size(function (err, size) {
		if (!size)	return callback('download_failed', null);
		else {
			image
				.filter("Box")
				.resize(size.width*scale, size.height*scale)
				.setFormat("gif")
				.write(fScaled, function (err) {
					if (err) callback('resize_failed');
					else callback(null)
				});
		}
	});
}

// Upload the final transformed image
function uploadTransformedImage(fScaled, callback) {
	imgur.upload(fScaled, function (err, data) {			
		if (err || !data || !data.data || data.error || !data.data.link)  {
			callback('upload_failed');
		} else {
			callback(null, data.data.link);
		}
	});
}

// Do clean-up of local files.
function cleanUp(files) {
	var fileId,
		file,
		pass = function (err) {
			if (err) console.log(err.red);
		};
		
	for (fileId in files) {
		file = files[fileId];
		if (file)
			fs.unlink(file, pass);
	}
}