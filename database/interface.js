var express = require('express'),
    bodyParser = require('body-parser'),
    jwt = require('jwt-simple'),
    r = require('rethinkdb'),
    connection,
    secret = "gullywompus",
    app = express();
    
app.use(bodyParser.json());
app.use(function (req, res, next) {
    if (!req.headers['x-auth-token']) {
        req.auth = {};
        next();
        return;
    }

    try {
        req.auth = jwt.decode(req.headers['x-auth-token'], secret);
    } catch (err) {
        req.auth = {};
    }

    next();
});

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');

    next();
});
    
r.connect({
    host: 'localhost',
    port: 28015,
    db: "pxscale_data"
}, function (err, conn) {
    connection = conn;
});

app.post("/:type/", function (req, res) {
    if (req.auth.admin == true) {
        res.write(
            JSON.stringify(
                {error: "no_permission"}
            )
        );
        res.end();      
    }
    
    var table = r.table(req.params.type),
        obj = req.body;
        
    if (obj == {}) {
        res.write(
            JSON.stringify(
                {error: "bad_json"}
            )
        );
        res.end();
        return;
    }
    
    table.insert(obj).run(connection, function (err, result) {
        res.write(
            JSON.stringify(
                {error: err, success: result}
            )
        );
        res.end();
    });    
});

app.get(/\/([^/]+)\/(.+)/, function (req, res) {

    var type = req.params[0],
        url = req.params[1],
        table = r.table(type);
        
    table.filter({url: url}).coerceTo("array").run(connection, function (err, result) {
        res.write(
            JSON.stringify(
                {error: err, success: result}
            )
        );
        res.end();
    });
    
});

app.delete(/\/([^/]+)\/(.+)/, function (req, res) {
    if (!req.auth.admin == true) {
        res.write(
            JSON.stringify(
                {error: "no_permission"}
            )
        );
        res.end();      
    }
    
    var type = req.params[0],
        url = req.params[1],
        table = r.table(type);
    
    table.filter({url: url}).delete().run(connection, function (err, result) {
        res.write(
            JSON.stringify(
                {error: err, success: result}
            )
        );
        res.end();
    });
    
});

app.get("/:type/", function (req, res) {
    var table = r.table(req.params.type);
    
    table.coerceTo('array').run(connection, function (err, result) {
        res.write(
            JSON.stringify(
                {error: err, success: result}
            )
        );
        res.end();
    }) 
});
    
app.listen(1440);