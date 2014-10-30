var fs = require('fs');

module.exports = {
// Get our fOrig and fScaled (local file paths used for work)
	getTemporaryFilenames: function (id, ext, callback) {
		// Create temporary download names like 293812.jpg and 1212312_scaled.jpg
		var fOrig = 'tmp/' + id + ext,
			fScaled = 'tmp/' + id + '_scaled' + ext;
	
		callback(null, fOrig, fScaled);
	},
	
	// Do clean-up of local files.
	cleanUp: function (files) {
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
	},
	
	getUniqueID: function () {
		return Math.random().toString().replace('.', '');
	}
}