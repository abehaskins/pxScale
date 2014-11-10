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
		roundness = 1;
	
	image.identify(function (err, identify) {
		small.size = identify.size;
		small.area = (small.size.width*small.size.height);
		small.colorsByPercent = {};
		var cache = {};
		
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
				colorsArray.push({
					id: colorId, 
					percent: color.percent, 
					count: color.count
				});
			}
			
			small.colorsByPercent = _(colorsArray).sortBy(function (color) {
				return color.percent;
			}).reverse().value();
			
		    var sortedColors = small.colorsByPercent
		    	.sort(function (a, b) {
		    		if (a.percent > b.percent)
		    			return -1;
		    		if (a.percent < b.percent)
		    			return 1;
		    		
		    		return 0;
		    	});
		
		    var ignores = {},
		    	finalColors = {};
		
		    sortedColors.forEach(function (artifactColor) {
		    	console.log(artifactColor)
		        if (ignores[artifactColor.id]) {
		        	finalColors[ignores[artifactColor.id]] += artifactColor.percent;
		        	return;
		        }
		       
		        sortedColors.forEach(function (color) {
		        	var diff = differenceInColor(color.id, artifactColor.id);
		
		            if (diff <= 20) {
		            	ignores[color.id] = artifactColor.id;
		            	
		            	finalColors[artifactColor.id] = artifactColor.percent;
		        	}	
		        })
		    });
		    
			var colorRecord = {
				url: job.url, 
				colors_raw: small.colorsByPercent,
				colors: finalColors
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

function closestColor(targetColor, possibleColors, cache) {
	var closestColor, smallestDifference = Infinity;

	if (cache[targetColor]) return cache[targetColor];

	possibleColors.forEach(function (possibleColor) {
		var diff = differenceInColor(targetColor, possibleColor);

		if (diff < smallestDifference) {
			closestColor = possibleColor;
			smallestDifference = diff;
		}
	});

	cache[targetColor] = closestColor;
	
	return [closestColor, smallestDifference]
}

function differenceInColor(colorA, colorB) {
	var a = colorA.slice(1),
		b = colorB.slice(1),
		diff = 0;

	for (var n=0; n<6; n+=2) {
		var aInt = parseInt(a.slice(n, n+2), 16),
			bInt = parseInt(b.slice(n, n+2), 16);

		diff += Math.abs(aInt - bInt);
	}

	return diff;
}