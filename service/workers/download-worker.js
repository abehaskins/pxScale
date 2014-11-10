var utils = require('../utils/utils'),
	request = require('request'),
	async = require('async'),
	fs = require('fs'),
	Worker = require('../utils/worker').Worker;
	
var worker = new Worker("download");

worker.work = function (data, callback) {
	var id = data.id,
		url = data.url,
		self = this;
		
	async.waterfall([
		verifyURLExtension.bind(this, url),
		utils.getTemporaryFilenames.bind(this, id),
		downloadImageAtURL.bind(this, url)
	], callback);
}

// Check that we have something, .png, .bat, etc. Literally any extension.
function verifyURLExtension(url, callback) {
	var ext = utils.getFileExtension(url);
	console.log(ext)
	
	if (!ext) {
		callback("no_extension");
	} else {
		callback(null, ext);
	}
}

// Download the Image provided
function downloadImageAtURL(url, fOrig, fScaled, callback) {
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
		else callback(null, fOrig, fScaled);
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
