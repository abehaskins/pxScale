var utils = require('../utils/utils'),
	request = require('request'),
	async = require('async'),
	fs = require('fs'),
	gm = require('gm'),
	_ = require('lodash'),
	redis = require('redis'),
	Worker = require('../utils/worker').Worker;
	
var worker = new Worker("color");

worker.work = function (data, callback) {
	var fOrig = data.fOrig;
	
	var small = {
		filename: fOrig,
		colors: {}
	};
	
	var image = gm(small.filename);
	
	image.identify(function (err, identify) {
		small.size = identify.size;
		small.area = (small.size.width*small.size.height);
		small.colorsByPercent = {};
		image.toBuffer('ppm', function (err, bufferData) {
			small.buffer = bufferData;
			small.offset = (small.buffer.length) - ((small.size.width*small.size.height)*3);
			var color, colorsArray = [];
			
			for (var p=small.offset; p < small.area*3; p += 3) {
				color = '#';
				for (var c=0; c<3; c++) {
					color += small.buffer[p+c].toString(16).toUpperCase();
				}
				
				(small.colors[color] || (small.colors[color] = {count: 0})).count += 1;
			}
			
			for (colorId in small.colors) {
				color = small.colors[colorId];
				color.percent = parseFloat(((color.count/small.area)*100).toFixed(2));
				colorsArray.push({id: colorId, percent: color.percent, count: color.count});
			}
			
			small.colorsByPercent = _(colorsArray).sortBy(function (color) {
				return color.percent;
			}).reverse().value();
			
			console.log(small.colorsByPercent);
			
			callback(null, true);
		});
	});
}