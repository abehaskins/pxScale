var utils = require('../utils/utils'),
	request = require('request'),
	async = require('async'),
	fs = require('fs'),
	gm = require('gm'),
	_ = require('lodash'),
	redis = require('redis'),
	Worker = require('../utils/worker').Worker,
	Db = require('../utils/db').Db,
	db, config, worker;
	
try {
	config = require(['..', 'config', process.argv[2]].join('/'));
} catch (err) {
	console.log("Please specify a valid config mode".bgRed);
	process.exit(1);
}

db = Db(config);
db.setTable("colors");
worker = new Worker("color");

worker.work = function (job, callback) {
	var small = {
			filename: job.fOrig,
			colors: {}
		},
		image = gm(small.filename),
		roundness = 10;
	
	image.identify(function (err, identify) {
		small.size = identify.size;
		small.area = (small.size.width*small.size.height);
		small.colorsByPercent = {};
		image.toBuffer('ppm', function (err, bufferData) {
			small.buffer = bufferData;
			small.offset = (small.buffer.length) - ((small.size.width*small.size.height)*3);
			var color, hex, colorsArray = [];
			
			for (var p=small.offset; p < small.area*3; p += 3) {
				color = '#';
				for (var c=0; c<3; c++) {
					var colorInt = small.buffer[p+c];
					colorInt = Math.floor(colorInt - (colorInt % roundness) + (roundness/2));
					hex = colorInt.toString(16).toUpperCase();
					if (hex.length == 1)
						hex = "0" + hex;
					color += hex;
				}
				
				(small.colors[color] || (small.colors[color] = {count: 0})).count += 1;
			}
			
			for (var colorId in small.colors) {
				color = small.colors[colorId];
				color.percent = parseFloat(((color.count/small.area)*100).toFixed(2));
				colorsArray.push({id: colorId, percent: color.percent, count: color.count});
			}
			
			small.colorsByPercent = _(colorsArray).sortBy(function (color) {
				return color.percent;
			}).reverse().value();
			
			var colorRecord = {
				url: job.url, 
				scale: job.scale, 
				colors: small.colorsByPercent
			};
			
			db.updateOrSetImageData({url: job.url}, colorRecord, 
				function (err, result) {
					console.log(result);
				}
			);
			
			callback(null, true);
		});
	});
}