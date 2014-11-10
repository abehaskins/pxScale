var imgur = require('imgur-upload'),
	gm = require('gm'),
	colors = require('colors'),
	async = require('async'),
	secrets = require('../config/secrets'),
	utils = require('../utils/utils'),
	Worker = require('../utils/worker').Worker;
	
var worker = new Worker("scale");

worker.init = function () {
	imgur.setClientID(secrets.IMGUR_CLIENT_ID);
}

worker.work = function (data, callback) {
	var id = data.id,
		fOrig = data.fOrig,
		fScaled = data.fScaled,
		scale = data.scale,
		self = this;
		
	console.log(["Job ID:", id, fOrig, scale].join(' ').green);
	
	async.waterfall([
		transformImage.bind(this, fOrig, fScaled, scale),
		uploadTransformedImage.bind(this, fScaled)
	], callback);	
}

// Transform the image we've downloaded
function transformImage(fOrig, fScaled, scale, callback) {
	var image = gm(fOrig),
		ext = utils.getFileExtension(fOrig).replace('.', '');
		
	if (!ext) {
		return callback("no_extension", null);
	}
	
	// Open the image, get some stats, then resize the image.
	image.size(function (err, size) {
		if (!size)	return callback('download_failed', null);
		else {
			image
				.filter("Box")
				.resize(size.width*scale, size.height*scale)
				.setFormat("gif")
				.quality(100)
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