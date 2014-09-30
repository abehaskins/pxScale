var imgur = require('imgur-upload'),
	socket = require('./socket'),
	secrets = require('./secrets'),
	request = require('request');
	gm = require('gm'),
	fs = require('fs');

var boss;

imgur.setClientID(secrets.IMGUR_CLIENT_ID);

socket.Client("/tmp/pxScale.sock").then(function (socket) {
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

	request(url, function (err, res) {
		if (err) {
			boss.write({
				id: id,
				status: 'error',
				error: err
			});
			return;
		}

		var image = gm(filenameOrig);

		image.size(function (err, size) {
			image
				.filter("Box")
				.resize(size.width*scale, size.height*scale)
				.setFormat("png")
				.write(filenameScale, function (err) {
					if (err) throw err;

					imgur.upload(filenameScale, function (err, data) {
						if (err) throw err;

			    		boss.say({
			    			id: id, 
			    			status: "complete", 
			    			link: data.data.link
			    		});

			    		fs.unlink(filenameOrig);
			    		fs.unlink(filenameScale);
					});
				});
		});
	}).pipe(fs.createWriteStream(filenameOrig));
}