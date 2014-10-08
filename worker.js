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

	var ext = url.slice(url.search(/\.([^\.]+)$/), url.length)

	if (ext.indexOf("/") !== -1) {
		boss.say({
			id: id,
			status: 'error',
			error: 'no_extension'
		});
		done = true;
		return;
	}

	var filenameOrig = id + ext,
		filenameScale = id + '_scaled' + ext,
		done = false;

	setTimeout(function () {
		if (done) return;
		req.abort();
		boss.say({
			id: id,
			status: 'error',
			error: 'download_failed'
		});
		cleanUp([filenameOrig, filenameScale]);
	}, 10e3);

	var wstream = fs.createWriteStream(filenameOrig);

	wstream.on("error", function () {
		req.abort();
		boss.say({
			id: id,
			status: 'error',
			error: 'writing_failed'
		});
		cleanUp([filenameOrig, filenameScale]);
		done = true;
		return;
	});

	var req = request({url: url}, function (err, res) {
		if (err) {
			boss.say({
				id: id,
				status: 'error',
				error: 'download_failed'
			});
			cleanUp([filenameOrig, filenameScale]);
			done = true;
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
			   	done = true;
				return;
			}
			image
				.filter("Box")
				.resize(size.width*scale, size.height*scale)
				.setFormat("gif")
				.write(filenameScale, function (err) {
					if (err) {
						boss.say({
							id: id,
							status: 'error',
							error: 'resize_failed'
						});
			    		cleanUp([filenameOrig, filenameScale]);
			    		done = true;
						return;
					}

					imgur.upload(filenameScale, function (err, data) {			
						if (err || !data || !data.data || data.error || !data.data.link)  {
							boss.say({
								id: id,
								status: 'error',
								error: 'upload_failed'
							});
							console.log(err, data)
			    			cleanUp([filenameOrig, filenameScale]);
			    			done = true;
							return;
						}

						var data = data.data;

			    		boss.say({
			    			id: id, 
			    			status: "complete", 
			    			link: data.link
			    		});
			    		//cleanUp([filenameOrig, filenameScale]);
			    		done = true;
			    		return;
					});
				});
		});
	});
	req.pipe(wstream);

	req.on('error', function () {
		boss.say({
			id: id,
			status: 'error',
			error: 'download_failed'
		});
		cleanUp([filenameOrig, filenameScale]);
	});
}

function cleanUp(files) {
	var fileId, file;
	for (fileId in files) {
		file = files[fileId];
		fs.unlink(file, function () {});
	}
}