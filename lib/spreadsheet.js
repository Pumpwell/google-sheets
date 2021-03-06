var request = require('request'),
	builder = require('xmlbuilder'),
	xml2js = require('xml2js'),
	Worksheet = require('./worksheet').Worksheet,
	makeUrl = require('./utils').makeUrl,
	_ = require('underscore');

function Spreadsheet(meta, authId) {
	this.meta = meta;
	this.authId = authId;
	this.worksheets = [];
}
Spreadsheet.prototype = {

	query: function(options, callback) {
		request({
			url: options.url,
			method: options.method || 'GET',
			body: options.body || null,
			headers: {
				'Authorization': 'GoogleLogin auth=' + this.authId,
				'Content-Type': 'application/atom+xml'
			}
		}, function(error, response, body) {
			if (error) {
				return callback(error);
			}
			var parser = new xml2js.Parser({
				explicitArray: false,
				async: true,
				mergeAttrs: true
			});
			parser.parseString(body, function(err, result) {
				callback(err, result);
			});
		});
	},

	getWorksheetAt: function(index, callback) {
		this.getWorksheets(function(err, worksheets) {
			if (err) {
				return callback(err);
			}
			if (index >= worksheets.length) {
				return callback('index out of range, only ' + worksheets.length + ' worksheets in this spreadsheet');
			}
			callback(null, worksheets[index]);
		});
	},
	getWorksheet: function(name, callback) {
		this.getWorksheets(function(err, worksheets) {
			if (err) {
				return callback(err);
			}
			for (var i=0; i < worksheets.length; i++) {
				if (worksheets[i].getTitle()===name) {
					return callback(null, worksheets[i]);
				}
			}
			return callback('no worksheet with title ' + name);
		});
	},

	getWorksheets: function(callback) {
		var that = this;
		this.query({
			url: makeUrl('worksheets',this.meta.id)
		}, function(err, result) {
			if (err) {
				return callback(err);
			}
			var worksheets = [];
			
			if ( Array.isArray(result.feed.entry) === false ) {
				result.feed.entry = [result.feed.entry];
			}

      function addEntry (entry) {
			  var worksheet = new Worksheet({spreadsheetId: that.meta.id},that.authId);
    		worksheet.parseJSON(entry);
    		worksheets.push(worksheet);
      }
      if (typeof result.feed.entry.length === 'number') {
  			for(var i=0; i < result.feed.entry.length; i++) {
  				addEntry(result.feed.entry[i]);
  			}
      } else {
        addEntry(result.feed.entry);
      }

			that.worksheets = worksheets;
			callback(null, worksheets);
		});
	},
	deleteWorksheet: function(worksheet, callback) {
		if (!(worksheet instanceof Worksheet)) {
			callback('Not a worksheet instance');
		} else {
			worksheet.remove(callback);
		}
	},
	addWorksheet: function(data, callback) {
		var worsheet = null;

		if (data instanceof Worksheet) {
			// just add it to our array, and tell worksheet to save
			data.meta.spreadsheetId = this.meta.id;
			worksheet = data;
		} else if (typeof data === 'object') {
			data.spreadsheetId = this.meta.id;
			worksheet = new Worksheet(data, this.authId);
		}

		this.worksheets.push(worksheet);
		worksheet.save(callback);
	}
};

exports.Spreadsheet = Spreadsheet;
