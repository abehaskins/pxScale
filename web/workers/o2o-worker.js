var gm = require('gm'),
	_ = require('lodash'),
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
worker = new Worker("one-to-one");

worker.work = function (job, callback) {
	var imageObj = {
		filename: "./bunk.png",
		colorsByPosition: {}
	    },
	    roundness = 10, // Amount to blur colors to deal with artifacting. 
		image = gm(imageObj.filename);
	
	image.identify(function (err, identify) {
		imageObj.size = identify.size;
		imageObj.area = (imageObj.size.width*imageObj.size.height);
		image.toBuffer('ppm', function (err, bufferData) {
			var color, hex, colorInt;
			imageObj.buffer = bufferData;
			imageObj.offset = (imageObj.buffer.length) - ((imageObj.size.width*imageObj.size.height)*3);
			
			// Seperate color worker info
			for (var p=imageObj.offset; p < imageObj.area*3; p += 3) {
				color = '#';
				for (var c=0; c<3; c++) {
					colorInt = imageObj.buffer[p+c];
					colorInt = Math.floor(colorInt - (colorInt % roundness) + (roundness/2));
					hex = colorInt.toString(16).toUpperCase();
					if (hex.length == 1)
						hex = "0" + hex;
					color += hex;
				}
	
				var point = p - imageObj.offset,
				    xI = (parseInt((point/3) / imageObj.size.width, 10)),
				    yI = ((point/3) % imageObj.size.width);
	
				var y = imageObj.colorsByPosition[yI] || {};
				y[xI] = color;
	
				imageObj.colorsByPosition[yI] = y;
			}
	
			// Assume that the biggest scale would be a 2x2 grid in the image.
			var maxPixelSize = Math.floor(Math.min(imageObj.size.width, imageObj.size.height) / 2);
	
			//var matches=true;
			for (var size = maxPixelSize; size > 0; size -= 1) {
				var matches=true;
				for (var start = 0; start <= imageObj.area; start += size) {
					var startX = parseInt(start / imageObj.size.width, 10)*size,
					    startY = parseInt(start % imageObj.size.width, 10),
					    x1square = getSquarePoints(startX, startY, size),
					    matchColor = null;
			
					for (var pointIndex in x1square) {
						var point = x1square[pointIndex],
						    pointColor = imageObj.colorsByPosition[point.y][point.x];
	
						if (!pointColor) break;
	
						if (!matchColor)
							matchColor = pointColor;
	
						matches = (pointColor == matchColor) && matches;
	
						if (!matches) break;
					}
	
					if (!matches) break;
				}
				if (matches) break;
			}
	
			console.log(size, 1/size, matches, start, imageObj.area)
		});
	});
}

function getSquarePoints(startX, startY, blockSize) {
	var size = blockSize-1;
	return [
		{x: startX, y: startY},
		{x: startX + parseInt(size/2), y: startY},
		{x: startX + size, y: startY},
		{x: startX + size, y: startY + parseInt(size/2)},
		{x: startX + size, y: startY + size},
		{x: startX, y: startY + parseInt(size/2)},
		{x: startX, y: startY + size},
		{x: startX + parseInt(size/2), y: startY + size},
		{x: startX + parseInt(size/2), y: startY + parseInt(size/2)},
	];
}