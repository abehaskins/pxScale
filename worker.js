var imgur = require('imgur-upload'),
	socket = require('./socket'),
	secrets = require('./secrets'),
	request = require('request');
	gm = require('gm'),
	fs = require('fs');

var boss;

imgur.setClientID(secrets.IMGUR_CLIENT_ID);

socket.Client("127.0.0.1", 1337).then(function (socket) {
	boss = socket;
	boss.on('data', function(rData) {
		var data = JSON.parse(rData);
		process(data.id, data.url, data.scale);
	});
});

function process(id, url, scale) {
	console.log("Job ID: " + id, url, scale)

	var filenameOrig = id + '.png',
		filenameScale = id + '_scaled.png';

	request({url: url, timeout: 10e3}, function (err, res) {
		if (err) {
			boss.say({
				id: id,
				status: 'error',
				error: 'download_failed'
			});
			cleanUp([filenameOrig, filenameScale]);
			return;
		}

		var image = gm(filenameOrig);

		image.size(function (err, size) {
			if (!size) {
				boss.say({
					id: id,
					status: 'error',
					error: 'not_an_image'
				});
			   	cleanUp([filenameOrig, filenameScale]);
				return;
			}
			image
				.filter("Box")
				.resize(size.width*scale, size.height*scale)
				.setFormat("png")
				.write(filenameScale, function (err) {
					if (err) {
						boss.say({
							id: id,
							status: 'error',
							error: 'resize_failed'
						});
			    		cleanUp([filenameOrig, filenameScale]);
						return;
					}

					imgur.upload(filenameScale, function (err, data) {
						if (err) {
							boss.say({
								id: id,
								status: 'error',
								error: 'upload_failed'
							});
			    			cleanUp([filenameOrig, filenameScale]);
							return;
						}

			    		boss.say({
			    			id: id, 
			    			status: "complete", 
			    			link: data.data.link
			    		});
			    		cleanUp([filenameOrig, filenameScale]);
			    		return;
					});
				});
		});
	}).pipe(fs.createWriteStream(filenameOrig));
}

function cleanUp(files) {
	var fileId, file;
	for (fileId in files) {
		file = files[fileId];
		fs.unlink(file);
	}
}