var utils = require('./utils'),
	request = require('request'),
	async = require('async'),
	fs = require('fs'),
	gm = require('gm'),
	Worker = require('./worker').Worker;
	
var worker = new Worker("color");

worker.work = function (data) {
	var small = {
		filename: ...,
	}
	
	gm(small.filename)
		.identify(function (err, identify) {
		  small.size = identify.size;
		}).toBuffer('ppm', function (err, bufferData) {
		  small.buffer = bufferData;
		  small.offset = (small.buffer.length) - ((small.size.width*small.size.height)*3);
		});
}