var fs = require('fs'),
	r = require('rethinkdb'),
	table = r.table("images");

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
	}, 
	
	getImageData: function (data, connection, cb) {
	    table.filter(data).coerceTo('array').run(connection, function (err, result) {
	        var obj = result[0];
			cb(null, obj || {});
	    });	
	}, 
	
	updateImageData: function (data, newData, connection, cb) {
		table.filter(data).update(newData).run(connection, function (err, result) {
			console.log(result)	
			cb(null, result);
		});
	},
	
	setImageData: function (data, connection, cb) {
	    table.insert(data).coerceTo('object').run(connection, function (err, result) {
	       table.get(result.generated_keys[0]).run(connection, function (err, result) {
	          cb(null, result);
	       });
	    });
	}
}